import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const config = {
	env: process.env.NODE_ENV || 'development',
	server: {
		port: parseInt(process.env.PORT, 10) || 443,
		host: process.env.HOST || '0.0.0.0',
		https: {
		key: process.env.SSL_KEY || join(__dirname, '../../certs/privkey.pem'),
		cert: process.env.SSL_CERT || join(__dirname, '../../certs/fullchain.pem'),
		}
	},
	database: {
		path: process.env.DB_PATH || './pong.db',
	},
	security: {
		jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
		bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
	},
	cors: {
		origin: process.env.FRONTEND_URL || 'https://localhost:443',
		credentials: true,
	},
	logging: {
		level: process.env.LOG_LEVEL || 'info',
	},
};

export default config;