// Import Node.js modules
import dotenv from 'dotenv';              // Library to read .env files
import { fileURLToPath } from 'url';      // Convert file URLs to paths
import { dirname, join } from 'path';     // Work with file paths

// Get current file's directory (ES modules don't have __dirname by default)
const __filename = fileURLToPath(import.meta.url);  // Get this file's full path
const __dirname = dirname(__filename);              // Get this file's directory

// Load .env file into process.env
dotenv.config();

// Create configuration object
const config = {
	// Environment config
	env: process.env.NODE_ENV || 'development',  // Use env var OR default
	
	// Server settings
	server: {
		port: parseInt(process.env.PORT, 10) || 4444,
		host: process.env.HOST || '0.0.0.0',
		https: {
			key: process.env.SSL_KEY || join(__dirname, '../../certs/localhost.key'),
			cert: process.env.SSL_CERT || join(__dirname, '../../certs/localhost.crt'),
		}
	},
	
	// Database settings
	database: {
		path: './db/pong.db',
	},
	
	// Security settings
	security: {
		jwtSecret: process.env.JWT_SECRET,
		bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
	},
	
	// CORS settings (Cross-Origin Resource Sharing)
	cors: {
		origin: process.env.FRONTEND_URL,
		methods: ['GET', 'POST', 'OPTIONS'],
		credentials: true,  // Allow cookies to be sent
	},
	
	// Logging settings
	logging: {
		level: process.env.LOG_LEVEL || 'info',
	},
};

if (!config.security.jwtSecret) {
	throw new Error('FATAL: JWT_SECRET environment variable is required!');
}

// Export so other files can import this config
export default config;