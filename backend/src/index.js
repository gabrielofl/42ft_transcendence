// Import Node.js file system module
import { readFileSync } from 'fs';
// Import our app builder
import { buildApp } from './app.js';
// Import configuration
import config from './config/index.js';

export let app; 

// Main startup function
const start = async () => {
	try {
		// Build the application
		 app = await buildApp({
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
		app.listen({
			port: config.server.port,
			host: config.server.host, // 0.0.0.0
		}).catch((err) => {
			// If the port is already in use, another instance is already running.
			// This is common with nodemon restarting quickly.
			if (err.code === 'EADDRINUSE') {
				app.log.warn(`Port ${config.server.port} is already in use. Another instance may be running. Shutting down this one.`);
				process.exit(0); // Exit gracefully
			} else {
				// For other errors, treat them as fatal.
				app.log.error(err);
				process.exit(1);
			}
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

// Self-invoking async function to start the server
(async () => {
	start();
})();
