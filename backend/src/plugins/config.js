// Import Fastify plugin wrapper
import fp from 'fastify-plugin';
// Import our config
import config from '../config/index.js';

// Define plugin function
async function configPlugin(fastify, opts) {
	// Add 'config' property to fastify instance
	fastify.decorate('config', config);
	
	// Now anywhere in the app, we can use:
	// fastify.config.server.port
	// fastify.config.database.path
	// etc.
}

// Export wrapped plugin
export default fp(configPlugin, {
	name: 'config'  // Give plugin a name for debugging
});