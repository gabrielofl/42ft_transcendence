import { authenticate } from '../../middleware/auth.js';

const DEFAULT_CFG = {
  mapKey: 'MultiplayerMap',
  powerUpAmount: 5,
  enabledPowerUps: ["MoreLength","LessLength","CreateBall","Shield","SpeedDown","SpeedUp"],
  windAmount: 50,
  pointToWinAmount: 7,
};

  function requireUserFromCookie(req) {
    const token = req.cookies?.accessToken;
    if (!token) throw fastify.httpErrors.unauthorized('Unauthorized');
    return fastify.jwt.verify(token); // { id, username }
  }


export default async function (fastify, opts) {
	// Add /users prefix to all routes in this file
	fastify.register(async function (fastify, opts) {

  // GET /room-config  (autoloaded under /api/users → /api/users/room-config)
  fastify.get('/room-config', async (req, reply) => {
    try {
      const user = requireUserFromCookie(req);
      const row = await fastify.db.get(
        `SELECT room_config FROM user_settings WHERE user_id = ?`,
        [user.id]
      );
      if (!row?.room_config) return DEFAULT_CFG;

      try {
        const parsed = JSON.parse(row.room_config);
        return {
          mapKey: typeof parsed.mapKey === 'string' && parsed.mapKey ? parsed.mapKey : DEFAULT_CFG.mapKey,
          powerUpAmount: Number.isFinite(parsed.powerUpAmount) ? parsed.powerUpAmount : DEFAULT_CFG.powerUpAmount,
          enabledPowerUps: Array.isArray(parsed.enabledPowerUps) && parsed.enabledPowerUps.length
            ? parsed.enabledPowerUps
            : DEFAULT_CFG.enabledPowerUps,
          windAmount: Number.isFinite(parsed.windAmount) ? parsed.windAmount : DEFAULT_CFG.windAmount,
          pointToWinAmount: Number.isFinite(parsed.pointToWinAmount) ? parsed.pointToWinAmount : DEFAULT_CFG.pointToWinAmount
        };
      } catch {
        return DEFAULT_CFG;
      }
    } catch (e) {
      log('warn', 'GET /room-config failed', { err: e?.message });
      return reply.code(e?.statusCode || 401).send({ error: e?.message || 'Unauthorized' });
    }
  });

  // POST /room-config  (autoloaded under /api/users → /api/users/room-config)
  fastify.post('/room-config', async (req, reply) => {
    try {
      const user = requireUserFromCookie(req);
      const body = (req.body || {});

      const toSave = {
        mapKey: (typeof body.mapKey === 'string' && body.mapKey) ? body.mapKey : DEFAULT_CFG.mapKey,
        powerUpAmount: Number.isFinite(body.powerUpAmount) ? body.powerUpAmount : DEFAULT_CFG.powerUpAmount,
        enabledPowerUps: Array.isArray(body.enabledPowerUps) ? body.enabledPowerUps : DEFAULT_CFG.enabledPowerUps,
        windAmount: Number.isFinite(body.windAmount) ? body.windAmount : DEFAULT_CFG.windAmount,
        pointToWinAmount: Number.isFinite(body.pointToWinAmount) ? body.pointToWinAmount : DEFAULT_CFG.pointToWinAmount
      };

      const existing = await fastify.db.get(
        `SELECT id FROM user_settings WHERE user_id = ?`,
        [user.id]
      );

      if (existing) {
        await fastify.db.run(
          `UPDATE user_settings SET room_config = ? WHERE user_id = ?`,
          [JSON.stringify(toSave), user.id]
        );
      } else {
        await fastify.db.run(
          `INSERT INTO user_settings (user_id, room_config) VALUES (?, ?)`,
          [user.id, JSON.stringify(toSave)]
        );
      }

      return { ok: true };
    } catch (e) {
      // log('error', 'POST /room-config failed', { err: e?.message });
      return reply.code(e?.statusCode || 400).send({ error: e?.message || 'Bad Request' });
    }
  });

		
		fastify.get('/session', async (request, reply) => {
    try {
      const token = request.cookies.accessToken;
      if (!token) return { isLoggedIn: false, userId: 0 };

      // Verify without preHandler; do not refresh here.
      const decoded = fastify.jwt.verify(token); // may throw if expired/invalid

      // Get fresh username/email to avoid stale token data
      const user = await fastify.db.get(
        'SELECT id, username, email FROM users WHERE id = ?',
        [decoded.id]
      );
      if (!user) return { isLoggedIn: false, userId: 0 };

      return {
        isLoggedIn: true,
        userId: user.id,
        username: user.username,
        email: user.email,
      };
    } catch (err) {
      // Expired/invalid token → not logged in
      return { isLoggedIn: false, userId: 0 };
    }
  });
		// Get current user profile - GET /api/users/me
		fastify.get('/me', {
			preHandler: authenticate  // Require authentication
		}, async (request, reply) => {
			// Get user data from database
			const user = await fastify.db.get(
				'SELECT id, first_name, last_name, username, email, google_id, last_login, avatar,  status, two_factor_enabled,  wins, losses, score, max_score, matches, allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly, created_at, updated_at FROM users WHERE id = ?',
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

			const { username } = request.query;
			if (!username) {
				return reply.code(400).send({ error: 'Username is required' });
			}

			// Get user data from database
			const user = await fastify.db.get(
				`SELECT id, first_name, last_name, username, email, google_id, last_login, avatar,  status, two_factor_enabled,  wins, losses, score, max_score, matches, allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly, created_at, updated_at  
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
				'SELECT id, first_name, last_name, username, email, google_id, last_login, avatar,  status, two_factor_enabled,  wins, losses, score, max_score, matches, allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly, created_at, updated_at  FROM users WHERE id = ?',
				[request.params.id]
			);
			
			if (!user) {
				return reply.code(404).send({ error: 'User not found' });
			}
			
			return user;
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
					`SELECT id, first_name, last_name, username, email, google_id, avatar,  status, wins, losses, score, max_score, matches,
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
						score: user.score,
						matches: user.matches,
						max_score: user.max_score,
						status: !!user.status,
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
