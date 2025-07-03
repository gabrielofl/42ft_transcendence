export default async function (fastify, opts) {
	fastify.get('/health', async (request, reply) => {
		return {
		status: 'ok',
		timestamp: new Date().toISOString(),
		environment: fastify.config.env,
		};
	});

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