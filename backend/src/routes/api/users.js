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
				'SELECT id, first_name, last_name, username, email, avatar,  online, two_factor_enabled,  wins, losses, score, matches, allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly, created_at, updated_at, last_login FROM users WHERE id = ?',
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
				`SELECT id, first_name, last_name, username, email, avatar, wins, losses, online, two_factor_enabled, last_login 
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
						email: { type: 'string', format: 'email' },
						firstName: { type: 'string', minLength: 1, maxLength: 50 },
						lastName: { type: 'string', minLength: 1, maxLength: 50 }
					}
				}
			}
		}, async (request, reply) => {
			const { username, email, firstName, lastName } = request.body;
			
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
				
				if (firstName !== undefined) {
					updates.push('first_name = ?');
					values.push(firstName);
				}
				
				if (lastName !== undefined) {
					updates.push('last_name = ?');
					values.push(lastName);
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
					return reply.code(409).send({ error: 'Username or email already in use' });
				}
				console.error('Profile update error:', error);
				return reply.code(500).send({ error: 'Failed to update profile' });
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
				'SELECT id, username, avatar, wins, losses, online FROM users WHERE id = ?',
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

			// Determine content type based on extension
			const ext = filename.split('.').pop()?.toLowerCase();
			let contentType = 'image/jpeg'; // default
			if (ext === 'png') contentType = 'image/png';
			else if (ext === 'gif') contentType = 'image/gif';
			else if (ext === 'webp') contentType = 'image/webp';

			reply
			.header('Content-Type', contentType)
			.header('Cache-Control', 'public, max-age=31536000');

			return reply.send(imageBuffer);
		} catch (error) {
			return reply.code(404).send({ error: 'Avatar not found' });
		}
		});


		// Update GDPR privacy settings - POST /api/users/privacy-settings
		fastify.post('/privacy-settings', {
			preHandler: authenticate,
			schema: {
				body: {
					type: 'object',
					properties: {
						allowDataCollection: { type: 'boolean' },
						allowDataProcessing: { type: 'boolean' },
						allowAiTraining: { type: 'boolean' },
						showScoresPublicly: { type: 'boolean' }
					}
				}
			}
		}, async (request, reply) => {
			const { allowDataCollection, allowDataProcessing, allowAiTraining, showScoresPublicly } = request.body;
			
			try {
				// Build dynamic query based on provided fields
				const updates = [];
				const values = [];
				
				if (allowDataCollection !== undefined) {
					updates.push('allow_data_collection = ?');
					values.push(allowDataCollection ? 1 : 0);
				}
				
				if (allowDataProcessing !== undefined) {
					updates.push('allow_data_processing = ?');
					values.push(allowDataProcessing ? 1 : 0);
				}
				
				if (allowAiTraining !== undefined) {
					updates.push('allow_ai_training = ?');
					values.push(allowAiTraining ? 1 : 0);
				}
				
				if (showScoresPublicly !== undefined) {
					updates.push('show_scores_publicly = ?');
					values.push(showScoresPublicly ? 1 : 0);
				}
				
				if (updates.length === 0) {
					return reply.code(400).send({ error: 'No privacy settings to update' });
				}
				
				values.push(request.user.id);  // Add user ID for WHERE clause
				
				await fastify.db.run(
					`UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
					values
				);
				
				return { success: true, message: 'Privacy settings updated successfully' };
				
			} catch (error) {
				console.error('Privacy settings update error:', error);
				return reply.code(500).send({ error: 'Failed to update privacy settings' });
			}
		});

		// Get GDPR privacy settings - GET /api/users/privacy-settings
		fastify.get('/privacy-settings', {
			preHandler: authenticate
		}, async (request, reply) => {
			try {
				const user = await fastify.db.get(
					'SELECT allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly FROM users WHERE id = ?',
					[request.user.id]
				);
				
				if (!user) {
					return reply.code(404).send({ error: 'User not found' });
				}
				
				return {
					allowDataCollection: !!user.allow_data_collection,
					allowDataProcessing: !!user.allow_data_processing,
					allowAiTraining: !!user.allow_ai_training,
					showScoresPublicly: !!user.show_scores_publicly
				};
				
			} catch (error) {
				console.error('Privacy settings fetch error:', error);
				return reply.code(500).send({ error: 'Failed to fetch privacy settings' });
			}
		});

		// Export user data - GET /api/users/export
		fastify.get('/export', {
			preHandler: authenticate
		}, async (request, reply) => {
			try {
				// Fetch user core profile
				const user = await fastify.db.get(
					`SELECT id, first_name, last_name, username, email, avatar, wins, losses, online,
						last_login, created_at, updated_at,
						COALESCE(allow_data_collection, 1) AS allow_data_collection,
						COALESCE(allow_data_processing, 1) AS allow_data_processing,
						COALESCE(allow_ai_training, 1) AS allow_ai_training,
						COALESCE(show_scores_publicly, 1) AS show_scores_publicly
					FROM users WHERE id = ?`,
					[request.user.id]
				);

				if (!user) {
					return reply.code(404).send({ error: 'User not found' });
				}

				const exportPayload = {
					generatedAt: new Date().toISOString(),
					user: {
						id: user.id,
						firstName: user.first_name,
						lastName: user.last_name,
						username: user.username,
						email: user.email,
						avatar: user.avatar,
						wins: user.wins,
						losses: user.losses,
						online: !!user.online,
						lastLogin: user.last_login,
						createdAt: user.created_at,
						updatedAt: user.updated_at
					},
					privacy: {
						allowDataCollection: !!user.allow_data_collection,
						allowDataProcessing: !!user.allow_data_processing,
						allowAiTraining: !!user.allow_ai_training,
						showScoresPublicly: !!user.show_scores_publicly
					},
				};

				const fileName = `account-export-${user.username}-${new Date().toISOString().split('T')[0]}.json`;
				reply.header('Content-Type', 'application/json');
				reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
				return reply.send(JSON.stringify(exportPayload, null, 2));
			} catch (error) {
				fastify.log.error(error, 'Export user data failed');
				return reply.code(500).send({ error: 'Failed to export user data' });
			}
		});

		// Update password - POST /api/users/profile/password
		fastify.post('/profile/password', {
			preHandler: authenticate,
			schema: {
				body: {
					type: 'object',
					required: ['password', 'newPassword'],
					properties: {
						password: { type: 'string', minLength: 1 },
						newPassword: { type: 'string', minLength: 6 }
					}
				}
			}
		}, async (request, reply) => {
			const { password, newPassword } = request.body;
			
			try {
				// First, verify the current password
				const currentUser = await fastify.db.get(
					'SELECT password FROM users WHERE id = ?',
					[request.user.id]
				);
				
				if (!currentUser) {
					return reply.code(404).send({ error: 'User not found' });
				}
				
				// Import bcrypt for password comparison
				const bcrypt = await import('bcrypt');
				
				// Verify current password using bcrypt
				const isPasswordValid = await bcrypt.compare(password, currentUser.password);
				if (!isPasswordValid) {
					return reply.code(400).send({ error: 'Current password is incorrect' });
				}
				
				if (password === newPassword) {
					return reply.code(400).send({ error: 'New password must be different from current password' });
				}
				
				// Hash the new password
				const hashedNewPassword = await bcrypt.hash(
					newPassword, 
					10 // Use 10 rounds for bcrypt
				);
				
				// Update the password with the hashed version
				await fastify.db.run(
					'UPDATE users SET password = ? WHERE id = ?',
					[hashedNewPassword, request.user.id]
				);
				
				return { success: true, message: 'Password updated successfully' };
				
			} catch (error) {
				console.error('Password update error:', error);
				return reply.code(500).send({ error: 'Failed to update password' });
			}
		});

	}, { prefix: '/users' });
}
