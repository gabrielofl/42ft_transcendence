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
		
		// Get user profile by username - GET /api/users/username?username=...
		fastify.get('/username', {
			preHandler: authenticate  // Require authentication
		}, async (request, reply) => {

			console.log('Query params:', request.query);
			const { username } = request.query;
  			console.log('Username received:', username);
			if (!username) {
				return reply.code(400).send({ error: 'Username is required' });
			}

			// Get user data from database
			const user = await fastify.db.get(
				`SELECT id, first_name, last_name, username, email, display_name, avatar, wins, losses, online, two_factor_enabled, last_login 
				FROM users 
				WHERE username = ?`,
				[username]
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
		fastify.post('/me', {
			preHandler: authenticate,
			schema: {
				body: {
					type: 'object',
					properties: {
						username: { type: 'string', minLength: 1, maxLength: 50 },
						email: { type: 'string', format: 'email' }
					}
				}
			}
		}, async (request, reply) => {
			const { username, email } = request.body;
			
			try {
				// Build dynamic query based on provided fields
				const updates = [];
				const values = [];
				
				if (username !== undefined) {
					updates.push('username = ?');
					values.push(username);
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
				
				return { success: true, message: 'Profile updated successfully' };
				
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

		// Serve avatar by filename - GET /api/users/avatar/:filename
		fastify.get('/avatar/:filename', async (request, reply) => {
			try {
				const { filename } = request.params;
				
				// Security: only allow avatar files
				if (!filename.startsWith('avatar_') || !filename.includes('.')) {
					return reply.code(400).send({ error: 'Invalid filename' });
				}

				const { readFile } = await import('fs/promises');
				const { join, dirname } = await import('path');
				const { fileURLToPath } = await import('url');
				
				const __filename = fileURLToPath(import.meta.url);
				const __dirname = dirname(__filename);
				
				const avatarPath = join(__dirname, '../../../uploads/avatars', filename);
				const imageBuffer = await readFile(avatarPath);
				
				// Determine content type based on file extension
				const ext = filename.split('.').pop()?.toLowerCase();
				let contentType = 'image/jpeg'; // default
				
				if (ext === 'png') contentType = 'image/png';
				else if (ext === 'gif') contentType = 'image/gif';
				else if (ext === 'webp') contentType = 'image/webp';
				
				reply.header('Content-Type', contentType);
				reply.header('Cache-Control', 'public, max-age=31536000');
				reply.header('Access-Control-Allow-Origin', 'https://localhost:8080');
				reply.header('Access-Control-Allow-Credentials', 'true');
				return reply.send(imageBuffer);
			} catch (error) {
				return reply.code(404).send({ error: 'Avatar not found' });
			}
		});

		// Update password - POST /api/users/profile/password
		fastify.post('/profile/password', {
			preHandler: authenticate,
			schema: {
				body: {
					type: 'object',
					properties: {
						password: { type: 'string' },
						newPassword: { type: 'string', minLength: 4 }
					}
				}
			}
		}, async (request, reply) => {
			const { password, newPassword } = request.body;
			
			try {
				// Here you would typically verify the old password first
				// For now, just update it
				await fastify.db.run(
					'UPDATE users SET password = ? WHERE id = ?',
					[newPassword, request.user.id]
				);
				
				return { success: true, message: 'Password updated successfully' };
				
			} catch (error) {
				return reply.code(500).send({ error: 'Failed to update password' });
			}
		});

	}, { prefix: '/users' });
}
