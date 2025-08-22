// Default export function that receives fastify instance
export default async function (fastify, opts) {

	// Health check endpoint - GET /health
	fastify.get('/health', async (request, reply) => {
		// Return JSON response
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),  // Current time
			environment: fastify.config.env,      // 'development' or 'production'
		};
		// Fastify automatically:
		// - Sets Content-Type: application/json
		// - Sends 200 OK status
		// - Converts object to JSON
	});

	// API information endpoint - GET /api
	fastify.get('/api', async (request, reply) => {
		return {
			name: 'ft_transcendence API',
			version: '1.0.0',
			endpoints: {
				health: '/health',
				auth: '/api/auth',
				users: '/api/users',
				games: '/api/games',
				tournaments: '/api/tournaments',
			}
		};
	});
}