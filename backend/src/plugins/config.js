import fp from 'fastify-plugin';
import config from '../config/index.js';

async function configPlugin(fastify, opts) {
	fastify.decorate('config', config);
}

export default fp(configPlugin, {
	name: 'config'
});