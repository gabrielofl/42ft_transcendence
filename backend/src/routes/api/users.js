import { authenticate } from '../../middleware/auth.js';

export default async function (fastify, opts) {
	// Add /users prefix to all routes in this file
	fastify.register(async function (fastify, opts) {
		
		// Get current user profile - GET /api/users/me
		fastify.get('/me', {
			preHandler: authenticate  // Require authentication
		}, async (request, reply) => {
			// Get user data from database
			const user = await fastify.db.get(
				'SELECT id, first_name, last_name, username, email, display_name, avatar, wins, losses, online, two_factor_enabled, last_login FROM users WHERE id = ?',
				[request.user.id]
			);
			
			if (!user) {
				return reply.code(404).send({ error: 'User not found' });
			}
			
			return {
				...user,
				twoFactorEnabled: !!user.two_factor_enabled
			};
		});
		
		// Update user profile - PUT /api/users/me
		fastify.put('/me', {
			preHandler: authenticate,
			schema: {
				body: {
					type: 'object',
					properties: {
						display_name: { type: 'string', minLength: 1, maxLength: 50 },
						email: { type: 'string', format: 'email' }
					}
				}
			}
		}, async (request, reply) => {
			const { display_name, email } = request.body;
			
			try {
				// Build dynamic query based on provided fields
				const updates = [];
				const values = [];
				
				if (display_name !== undefined) {
					updates.push('display_name = ?');
					values.push(display_name);
				}
				
				if (email !== undefined) {
					updates.push('email = ?');
					values.push(email);
				}
				
				if (updates.length === 0) {
					return reply.code(400).send({ error: 'No fields to update' });
				}
				
				values.push(request.user.id);  // Add user ID for WHERE clause
				
				await fastify.db.run(
					`UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
					values
				);
				
				// Return updated user
				const updatedUser = await fastify.db.get(
					'SELECT id, username, email, display_name, avatar, wins, losses FROM users WHERE id = ?',
					[request.user.id]
				);
				
				return updatedUser;
				
			} catch (error) {
				if (error.code === 'SQLITE_CONSTRAINT') {
					return reply.code(409).send({ error: 'Email already in use' });
				}
				throw error;
			}
		});
		
		// Get user by ID - GET /api/users/:id
		fastify.get('/:id', {
			schema: {
				params: {
					type: 'object',
					required: ['id'],
					properties: {
						id: { type: 'integer' }
					}
				}
			}
		}, async (request, reply) => {
			const user = await fastify.db.get(
				'SELECT id, username, display_name, avatar, wins, losses, online FROM users WHERE id = ?',
				[request.params.id]
			);
			
			if (!user) {
				return reply.code(404).send({ error: 'User not found' });
			}
			
			return user;
		});
		
	}, { prefix: '/users' });
}