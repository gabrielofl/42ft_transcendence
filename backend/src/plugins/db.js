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
			status      TEXT     DEFAULT 'pending',
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			started_at  DATETIME,
			finished_at DATETIME
		);

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


	`);

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