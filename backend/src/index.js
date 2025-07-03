import { readFileSync } from 'fs';
import { buildApp } from './app.js';
import config from './config/index.js';

const start = async () => {
	try {
		// Build app with HTTPS config
		const app = await buildApp({
		logger: {
			level: config.logging.level,
			...(config.env === 'development' && {
			transport: {
				target: 'pino-pretty',
				options: {
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname',
				}
			}
			})
		},
		https: {
			key: readFileSync(config.server.https.key),
			cert: readFileSync(config.server.https.cert),
		}
		});

		// Start server
		await app.listen({
		port: config.server.port,
		host: config.server.host,
		});

		app.log.info(`🚀 Server running at https://${config.server.host}:${config.server.port}`);
		
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
};

// Handle graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start();