// Import Node.js path utilities
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// To read certificates
import fs from 'fs';

// Import Fastify plugins
import autoLoad from '@fastify/autoload';    // Auto-load plugins/routes
import fastifyStatic from '@fastify/static';  // Serve static files
import fastifyCors from '@fastify/cors';      // Handle CORS
import fastifyHelmet from '@fastify/helmet';  // Security headers
import fastifyJwt from '@fastify/jwt';        // JWT tokens
import fastifyCookie from '@fastify/cookie';  // Cookie parsing
import fastifyWebsocket from '@fastify/websocket';  // WebSocket support
import fastifyMultipart from '@fastify/multipart';  // File uploads
import fastifyFormbody from '@fastify/formbody';    // Form parsing
import { resetGame, movePlayer, gameTick, getState } from './game.js';
import registerWebsocket from './websocket/index.js';
import onlineWebsocket from './websocket/online-websocket.js';
import waitroomWebsocket from './websocket/waitroom-websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const httpsOptions = {
  key: fs.readFileSync(join(__dirname, '../certs', 'localhost.key')),  // path to your key
  cert: fs.readFileSync(join(__dirname, '../certs', 'localhost.crt')) // path to your CA-signed cert
};


// Main function that builds the app
export async function buildApp(opts = {}) {
	console.log("buildApp");
	// Create Fastify instance (or use provided one)
	// const app = opts.fastify || (await import('fastify')).default({
	// 	logger: opts.logger ?? true,     // Enable logging
	// 	trustProxy: true,                // Trust X-Forwarded headers
	// 	https: opts.https,               // HTTPS configuration
	// });
	const app = opts.fastify || (await import('fastify')).default({
	logger: opts.logger ?? true,
	trustProxy: true,
	https:  opts.https,   // <-- use your signed certificate
	// https: httpsOptions,   // <-- use your signed certificate
	});

	// STEP 1: Load our custom plugins (config, database)
	await app.register(autoLoad, {
		dir: join(__dirname, 'plugins'),    // Look in plugins/ directory
		dirNameRoutePrefix: false,          // Don't use folder name in routes
		options: Object.assign({}, opts)    // Pass options to plugins
	});

	// STEP 2: Register core plugins (order matters!)
	
// CORS - Control which websites can access our API
await app.register(fastifyCors, app.config.cors);

	// Production
	// await app.register(fastifyHelmet, {
	// 	contentSecurityPolicy: {
	// 		directives: {
	// 			defaultSrc: ["'self'"],                    // Only from same origin
	// 			scriptSrc: ["'self'", "'unsafe-inline'"],  // Scripts from self + inline
	// 			styleSrc: ["'self'", "'unsafe-inline'"],   // Styles from self + inline
	// 			imgSrc: ["'self'", "data:", "https:"],     // Images from self, data URLs, HTTPS
	// 			connectSrc: ["'self'", "wss:"],            // API/WebSocket connections
	// 			fontSrc: ["'self'"],                       // Fonts
	// 			objectSrc: ["'none'"],                     // No plugins (Flash, etc)
	// 			upgradeInsecureRequests: []                // Upgrade HTTP to HTTPS
	// 		}
	// 	}
	// });

	// JWT - For authentication tokens
	await app.register(fastifyJwt, {
		secret: app.config.security.jwtSecret,  // Secret for signing
		sign: { expiresIn: '3h' },             // Tokens expire in 3 hours
	});

	// Cookie support
	await app.register(fastifyCookie, {
		secret: app.config.security.jwtSecret,
		parseOptions: {},
	});

	// WebSocket support for real-time
	await app.register(fastifyWebsocket);
	await registerWebsocket(app);
	await app.register(onlineWebsocket);
	await app.register(waitroomWebsocket);

	
	// File upload support
	await app.register(fastifyMultipart);
	
	// Form data parsing
	await app.register(fastifyFormbody);

	// Serve frontend files
	// await app.register(fastifyStatic, {
	// 	root: '/app/static',     // Directory with frontend files
	// 	prefix: '/',             // URL prefix
	// });
	
	// Serve frontend files David
	app.register(fastifyStatic, {
		root: join(__dirname, "../static"), // inside backend/static
		prefix: "/api/static/",
	});


	// STEP 3: Load all routes
	await app.register(autoLoad, {
		dir: join(__dirname, 'routes'),     // Look in routes/ directory
		options: Object.assign({}, opts)
	});

	// STEP 4: Global error handler
	app.setErrorHandler((error, request, reply) => {
		// Log the error
		app.log.error(error);
		
		// Handle validation errors specially
		if (error.validation) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: error.message
			});
		}
		
		// Send appropriate error response
		reply.status(error.statusCode || 500).send({
			statusCode: error.statusCode || 500,
			error: error.name || 'Internal Server Error',
			message: error.message || 'Something went wrong'
		});
	});

	return app;
}