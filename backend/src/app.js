import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import autoLoad from '@fastify/autoload';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyWebsocket from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import fastifyFormbody from '@fastify/formbody';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildApp(opts = {}) {
	const app = opts.fastify || (await import('fastify')).default({
		logger: opts.logger ?? true,
		trustProxy: true,
		https: opts.https,
	});

	// Register config plugin first
	await app.register(autoLoad, {
		dir: join(__dirname, 'plugins'),
		dirNameRoutePrefix: false,
		options: Object.assign({}, opts)
	});

	// Core plugins
	await app.register(fastifyCors, app.config.cors);

	await app.register(fastifyHelmet, {
		contentSecurityPolicy: false, // Configure properly for production
	});

	await app.register(fastifyJwt, {
		secret: app.config.security.jwtSecret,
		sign: { expiresIn: '3h' },
	});

	await app.register(fastifyCookie, {
		secret: app.config.security.jwtSecret,
		parseOptions: {},
	});

	await app.register(fastifyWebsocket);
	await app.register(fastifyMultipart);
	await app.register(fastifyFormbody);

	// Serve static files from frontend build
	await app.register(fastifyStatic, {
		root: '/app/static',
		prefix: '/',
	});

	// Load routes
	await app.register(autoLoad, {
		dir: join(__dirname, 'routes'),
		options: Object.assign({}, opts)
	});

	// Global error handler
	app.setErrorHandler((error, request, reply) => {
		app.log.error(error);

		if (error.validation) {
			return reply.status(400).send({
			statusCode: 400,
			error: 'Bad Request',
			message: error.message
			});
		}

		reply.status(error.statusCode || 500).send({
			statusCode: error.statusCode || 500,
			error: error.name || 'Internal Server Error',
			message: error.message || 'Something went wrong'
		});
	});

	return app;
}