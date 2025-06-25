// src/db.ts
import sqlite3 from 'sqlite3';
import fs from 'fs';

sqlite3.verbose();

const dbPath = './pong.db';

if (!fs.existsSync(dbPath)) {
	console.error('Database file does not exist at:', dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {

	db.run(`
	CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT UNIQUE NOT NULL,
	password TEXT NOT NULL,
	email TEXT UNIQUE NOT NULL,
	google_id TEXT,
	last_login TEXT,
	display_name TEXT UNIQUE,
	avatar TEXT DEFAULT 'default.jpg',
	online INTEGER DEFAULT 0,
	wins INTEGER DEFAULT 0,
	losses INTEGER DEFAULT 0
	)
`);

})

export default db;
