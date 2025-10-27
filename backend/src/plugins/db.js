import fp from 'fastify-plugin';
import sqlite3 from 'sqlite3';              // SQLite driver
import { open } from 'sqlite';              // Promise-based SQLite wrapper
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function databasePlugin(fastify, opts) {
	// Get database path from config
	const dbPath = fastify.config.database.path;
	
	// Log what we're doing
	fastify.log.info(`Opening database at: ${dbPath}`);
	
	const db = await open({
		filename: dbPath,           // Path to database file
		driver: sqlite3.Database    // Which SQLite driver to use
	});


	// Create tables if they don't exist
	await db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id           INTEGER  PRIMARY KEY AUTOINCREMENT,	-- Auto-incrementing ID
			first_name   TEXT,
			last_name    TEXT,
			username     TEXT     UNIQUE
								NOT NULL,						-- Must be unique and not empty
			password     TEXT     NOT NULL,						-- Hashed password
			email        TEXT     UNIQUE
								NOT NULL,						-- Must be unique
			google_id    TEXT,									-- For Google login (optional)
			last_login   TEXT,									-- Timestamp
			avatar       TEXT     DEFAULT 'default.jpg',		-- Profile picture
			status       INTEGER  DEFAULT 0,					-- 0 = offline, 1 = online, 2 inactive
			wins         INTEGER  DEFAULT 0,					-- Game statistics
			losses       INTEGER  DEFAULT 0,
			score       INTEGER  DEFAULT 0,
			max_score       INTEGER  DEFAULT 0,
			matches       INTEGER  DEFAULT 0,
			two_factor_secret  TEXT,							-- TOTP secret key
    		two_factor_enabled INTEGER  DEFAULT 0,				-- 0 = disabled, 1 = enabled
			allow_data_collection    INTEGER DEFAULT 1,			-- 0 = disabled, 1 = enabled
			allow_data_processing    INTEGER DEFAULT 1,			-- 0 = disabled, 1 = enabled
			allow_ai_training        INTEGER DEFAULT 1,			-- 0 = disabled, 1 = enabled
			show_scores_publicly     INTEGER DEFAULT 1,			-- 0 = disabled, 1 = enabled
			created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,	-- Auto-set on insert
			updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP		-- Should update on change
		);

		CREATE TABLE IF NOT EXISTS games (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			player1_id    INTEGER,								-- References users.id
			player2_id    INTEGER,								-- References users.id
			winner_id     INTEGER,								-- References users.id
			player1_score INTEGER  DEFAULT 0,
			player2_score INTEGER  DEFAULT 0,
			status        TEXT     DEFAULT 'pending',			-- pending/active/finished
			tournament_id INTEGER,								-- References tournaments.id (optional)
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
			finished_at   DATETIME,
			FOREIGN KEY (
				player1_id
			)
			REFERENCES users (id),								-- Link to users table
			FOREIGN KEY (
				player2_id
			)
			REFERENCES users (id),
			FOREIGN KEY (
				winner_id
			)
			REFERENCES users (id),
			FOREIGN KEY (
				tournament_id
			)
			REFERENCES tournaments (id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS tournaments (
			id          INTEGER  PRIMARY KEY AUTOINCREMENT,
			name        TEXT     NOT NULL,
			creator_id  INTEGER  NOT NULL,
			status      TEXT     DEFAULT 'waiting',           -- waiting/ready/in_progress/finished
			winner_id   INTEGER,
			current_round INTEGER DEFAULT 0,
			bracket     TEXT,                                 -- JSON string del bracket
			-- Tournament configuration
			map_key     TEXT     DEFAULT 'ObstacleMap',       -- Map configuration
			powerup_amount INTEGER DEFAULT 3,                 -- Number of powerups
			enabled_powerups TEXT DEFAULT '[]',               -- JSON array of enabled powerups
			wind_amount INTEGER DEFAULT 50,                   -- Wind strength
			match_time_limit INTEGER DEFAULT 180,             -- Match time limit in seconds
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			started_at  DATETIME,
			finished_at DATETIME,
			FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL,
			FOREIGN KEY (winner_id) REFERENCES users (id) ON DELETE SET NULL
		);

		CREATE TABLE IF NOT EXISTS tournament_players (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			tournament_id INTEGER NOT NULL,
			user_id       INTEGER NOT NULL,
			username      TEXT NOT NULL,
			is_host       INTEGER DEFAULT 0,                  -- 1 si es el creador
			ready         INTEGER DEFAULT 0,                  -- 1 si está ready
			joined_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(tournament_id, user_id),
			FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id);

		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id         INTEGER  PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER  NOT NULL,
			token      TEXT     UNIQUE
								NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			revoked_at DATETIME,
			FOREIGN KEY (
				user_id
			)
			REFERENCES users (id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
			id         INTEGER  PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER  NOT NULL,
			code       TEXT     NOT NULL,
			used_at    DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (
				user_id
			)
			REFERENCES users (id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS friends (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			player1_id    INTEGER,								-- References users.id
			player2_id    INTEGER,								-- References users.id
			status        TEXT     DEFAULT 'pending',			-- pending/accepted/
			FOREIGN KEY (
				player1_id
			)
			REFERENCES users (id) ON DELETE SET NULL,			-- Link to users table
			FOREIGN KEY (
				player2_id
			)
			REFERENCES users (id) ON DELETE SET NULL

		);

		CREATE TABLE IF NOT EXISTS rooms (
			id               INTEGER PRIMARY KEY AUTOINCREMENT,
			code             TEXT UNIQUE NOT NULL,
			host_id          INTEGER NOT NULL,
			map_key          TEXT NOT NULL,
			powerup_amount   INTEGER NOT NULL,
			enabled_powerups TEXT NOT NULL,         -- JSON string (array)
			wind_amount      INTEGER DEFAULT 50,
			point_to_win_amount INTEGER DEFAULT 7,
			max_players      INTEGER,
			status           TEXT DEFAULT 'waiting',-- waiting | active | closed
			created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS room_players (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			room_id    INTEGER NOT NULL,
			user_id    INTEGER NOT NULL,
			username   TEXT NOT NULL,
			is_host    INTEGER DEFAULT 0,  -- 1/0
			ready      INTEGER DEFAULT 0,  -- 1/0
			joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(room_id, user_id),
			FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);

		-- user_settings table to hold arbitrary per-user JSON blobs
		CREATE TABLE IF NOT EXISTS user_settings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL UNIQUE,
		room_config TEXT,                -- JSON string: { mapKey, powerUpAmount, enabledPowerUps }
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);

		-- trigger to keep updated_at fresh
		CREATE TRIGGER IF NOT EXISTS trg_user_settings_updated
		AFTER UPDATE ON user_settings
		FOR EACH ROW
		BEGIN
		UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
		END;


	`);

	// --- MIGRATION LOGIC ---
	// Función para añadir columnas a una tabla si no existen, sin borrar datos.
	const migrateTable = async (tableName, columnName, columnDefinition) => {
		try {
			const columns = await db.all(`PRAGMA table_info(${tableName});`);
			const columnExists = columns.some(c => c.name === columnName);
			if (!columnExists) {
				fastify.log.info(`Migrating '${tableName}' table: adding '${columnName}' column.`);
				await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
			}
		} catch (error) {
			// Esto puede fallar si la tabla aún no existe, lo cual es normal en la primera ejecución.
			fastify.log.warn(`Could not check/migrate table '${tableName}'. It might not exist yet. Error: ${error.message}`);
		}
	};

	// await migrateTable('rooms', 'wind_amount', 'INTEGER DEFAULT 50');
	// await migrateTable('rooms', 'point_to_win_amount', 'INTEGER DEFAULT 7');

	// Add database to fastify instance
	fastify.decorate('db', db);

	// Clean up when server shuts down
	fastify.addHook('onClose', async () => {
		await db.close();
	});
	
}

// Export with dependencies
export default fp(databasePlugin, {
	name: 'database',
	dependencies: ['config']  // This plugin needs config plugin to load first
});