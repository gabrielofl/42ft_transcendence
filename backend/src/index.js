import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fs from 'fs';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
  
const fastify = Fastify({
	logger: true,
	trustProxy: true,
	https: {
		key: fs.readFileSync('/app/certs/privkey.pem'),
        cert: fs.readFileSync('/app/certs/fullchain.pem'),
	}
  });

await fastify.register(fastifyCookie, {
	  secret: process.env.JWT_SECRET,
	  parseOptions: {},
});

await fastify.register(websocket);

fastify.register(fastifyMultipart);
fastify.register(fastifyCors, { origin: true, credentials: true, });
fastify.register(fastifyFormbody);
  
fastify.register(fastifyJwt, {
	secret: process.env.JWT_SECRET,
	sign: { expiresIn: '3h' },
});

fastify.register(fastifyStatic, {
	root: '/app/static',
	prefix: '/',
});

fastify.listen({ port: 443, host: '0.0.0.0' }, (err, address) => {
	if (err) {
	  console.error(' Failed to start server:', err);
	  process.exit(1);
	}
  
	console.log(`INFO Connections accepted at ${address}`);
});
