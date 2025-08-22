// Import Node.js file system module
import { readFileSync } from 'fs';
// Import our app builder
import { buildApp } from './app.js';
// Import configuration
import config from './config/index.js';

// Main startup function
const start = async () => {
	try {
		// Build the application
		const app = await buildApp({
			// Configure logging
			logger: {
				level: config.logging.level,  // 'info', 'debug', etc.
				
				// Pretty printing in development
				...(config.env === 'development' && {
					transport: {
						target: 'pino-pretty',    // Use pretty printer
						options: {
							translateTime: 'HH:MM:ss Z',  // Human-readable time
							ignore: 'pid,hostname',       // Don't show these
						}
					}
				})
			},
			
			// HTTPS configuration
			https: {
				key: readFileSync(config.server.https.key),   // Private key
				cert: readFileSync(config.server.https.cert),  // Certificate
			}
		});

		// Start listening for requests
		await app.listen({
			port: config.server.port,  // 443
			host: config.server.host,  // 0.0.0.0
		});

		// Log success
		app.log.info(`🚀 Server running at https://${config.server.host}:${config.server.port}`);
		
	} catch (err) {
		// If anything goes wrong, log and exit
		console.error('Failed to start server:', err);
		process.exit(1);  // Exit with error code
	}
};

// Handle shutdown signals
process.on('SIGINT', () => process.exit(0));   // Ctrl+C
process.on('SIGTERM', () => process.exit(0));  // Docker stop

// Start the server!
start();
