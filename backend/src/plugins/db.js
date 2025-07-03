import fp from 'fastify-plugin';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function databasePlugin(fastify, opts) {
	const dbPath = fastify.config.database.path;

	fastify.log.info(`Opening database at: ${dbPath}`);

	const db = await open({
	filename: dbPath,
	driver: sqlite3.Database
	});

	// Run migrations
	await db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id           INTEGER  PRIMARY KEY AUTOINCREMENT,
			username     TEXT     UNIQUE
								NOT NULL,
			password     TEXT     NOT NULL,
			email        TEXT     UNIQUE
								NOT NULL,
			google_id    TEXT,
			last_login   TEXT,
			display_name TEXT     UNIQUE,
			avatar       TEXT     DEFAULT 'default.jpg',
			online       INTEGER  DEFAULT 0,
			wins         INTEGER  DEFAULT 0,
			losses       INTEGER  DEFAULT 0,
			created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS games (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			player1_id    INTEGER,
			player2_id    INTEGER,
			winner_id     INTEGER,
			player1_score INTEGER  DEFAULT 0,
			player2_score INTEGER  DEFAULT 0,
			status        TEXT     DEFAULT 'pending',
			created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
			finished_at   DATETIME,
			FOREIGN KEY (
				player1_id
			)
			REFERENCES users (id),
			FOREIGN KEY (
				player2_id
			)
			REFERENCES users (id),
			FOREIGN KEY (
				winner_id
			)
			REFERENCES users (id) 
		);

		CREATE TABLE IF NOT EXISTS tournaments (
			id          INTEGER  PRIMARY KEY AUTOINCREMENT,
			name        TEXT     NOT NULL,
			status      TEXT     DEFAULT 'pending',
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			started_at  DATETIME,
			finished_at DATETIME
		);
	`);

  // Decorate fastify instance
  fastify.decorate('db', db);

  // Ensure graceful shutdown
	fastify.addHook('onClose', async () => {
	await db.close();
	});
}

export default fp(databasePlugin, {
	name: 'database',
	dependencies: ['config']
});