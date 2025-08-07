import bcrypt from 'bcrypt';  // Password hashing library
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export default async function (fastify, opts) {
	// Add /auth prefix to all routes in this file
	fastify.register(async function (fastify, opts) {
		// Helper function to generate refresh token
		async function generateRefreshToken(userId) {
			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
			
			await fastify.db.run(
				'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
				[userId, token, expiresAt.toISOString()]
			);
			
			return token;
		}
		// Helper function to generate backup codes
		async function generateBackupCodes(userId) {
			const codes = [];
			for (let i = 0; i < 10; i++) {
				codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
			}
			
			// Store in database
			for (const code of codes) {
				await fastify.db.run(
					'INSERT INTO two_factor_backup_codes (user_id, code) VALUES (?, ?)',
					[userId, code]
				);
			}
			
			return codes;
		}
		// Login endpoint - POST /api/auth/login
		fastify.post('/login', {
			// Schema validation
			schema: {
				body: {
					type: 'object',
					required: ['username', 'password'],  // Must have these fields
					properties: {
						username: { type: 'string' },
						password: { type: 'string' },
						// twoFactorCode: { type: 'string' } // Optional 2FA code
					}
				}
			}
		}, async (request, reply) => {
			// Extract data from request body
			const { username, password, twoFactorCode } = request.body;
			
			// Query database for user (allow login with username OR email)
			const user = await fastify.db.get(
				'SELECT * FROM users WHERE username = ? OR email = ?',  // SQL query
				[username, username]  // Check both username and email fields
			);
			
			// Check if user exists and password matches
			if (!user || !await bcrypt.compare(password, user.password)) {
				// Wrong username or password
				return reply.code(401).send({ 
					error: 'Invalid credentials' 
				});
			}

			// Check if 2FA is enabled
			if (user.two_factor_enabled) {
				if (!twoFactorCode) {
					return reply.code(202).send({ 
						success: true,
						requires2FA: true,
						message: 'Two-factor authentication required'
					});
				}

			// 	// Verify 2FA code
			// 	const verified = speakeasy.totp.verify({
			// 		secret: user.two_factor_secret,
			// 		encoding: 'base32',
			// 		token: twoFactorCode,
			// 		window: 2 // Allow some time drift
			// 	});

			// 	// If TOTP fails, check backup codes
			// 	if (!verified) {
			// 		const backupCode = await fastify.db.get(
			// 			'SELECT * FROM two_factor_backup_codes WHERE user_id = ? AND code = ? AND used_at IS NULL',
			// 			[user.id, twoFactorCode.toUpperCase()]
			// 		);

			// 		if (!backupCode) {
			// 			return reply.code(401).send({ error: 'Invalid two-factor code' });
			// 		}

			// 		// Mark backup code as used
			// 		await fastify.db.run(
			// 			'UPDATE two_factor_backup_codes SET used_at = datetime("now") WHERE id = ?',
			// 			[backupCode.id]
			// 		);
			// 	}
			// }
			
			// Update last login time
			await fastify.db.run(
				'UPDATE users SET last_login = datetime("now") WHERE id = ?',
				[user.id]
			);
			
			// Create JWT token
			const accessToken = fastify.jwt.sign({
				id: user.id,
				username: user.username
			});

			const refreshToken = await generateRefreshToken(user.id);
			
			// Return success response
			// reply.setCookie('token', refreshToken, {
			// 	httpOnly: true,
			// 	secure: true,
			// 	sameSite: 'None', //fix
			// 	path: '/',
			// 	maxAge: 3600,
			// });
			// reply.send({ success: true });
			return {
				success: true,
				token: accessToken, // JWT token for future requests
				refreshToken,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					display_name: user.display_name,
					avatar: user.avatar,
					wins: user.wins,
					losses: user.losses,
					twoFactorEnabled: !!user.two_factor_enabled
					// Note: Never send password back!
				}
			};
		});

		// Refresh token endpoint - POST /api/auth/refresh
		fastify.post('/refresh', {
			schema: {
				body: {
					type: 'object',
					required: ['refreshToken'],
					properties: {
						refreshToken: { type: 'string' }
					}
				}
			}
		}, async (request, reply) => {
			const { refreshToken } = request.body;

			// Validate refresh token
			const tokenRecord = await fastify.db.get(
				`SELECT rt.*, u.id, u.username FROM refresh_tokens rt
				 JOIN users u ON rt.user_id = u.id
				 WHERE rt.token = ? AND rt.expires_at > datetime('now') AND rt.revoked_at IS NULL`,
				[refreshToken]
			);

			if (!tokenRecord) {
				return reply.code(401).send({ error: 'Invalid refresh token' });
			}

			// Generate new access token
			const newAccessToken = fastify.jwt.sign({
				id: tokenRecord.user_id,
				username: tokenRecord.username
			});

			return { token: newAccessToken };
		});

		// Register endpoint - POST /api/auth/register
		fastify.post('/register', {
			schema: {
				body: {
					type: 'object',
					required: ['firstName', 'lastName', 'username', 'email', 'password'],
					properties: {
						firstName: {
							type: 'string',
							minLength: 1,
							maxLength: 50
						},
						lastName: {
							type: 'string',
							minLength: 1,
							maxLength: 50
						},
						username: { 
							type: 'string', 
							minLength: 3  // At least 3 characters
						},
						email: { 
							type: 'string', 
							format: 'email'  // Must be valid email
						},
						password: { 
							type: 'string', 
							minLength: 8  // At least 8 characters
						}
					}
				}
			}
		}, async (request, reply) => {
			const { firstName, lastName, username, email, password } = request.body;
			
			try {
				// Hash password (never store plain text!)
				const hashedPassword = await bcrypt.hash(
					password, 
					fastify.config.security.bcryptRounds  // 10 rounds
				);
				
				// Insert into database
				const result = await fastify.db.run(
					'INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)',
					[firstName, lastName, username, email, hashedPassword]
				);
				
				// Create JWT token for immediate login
				const accessToken = fastify.jwt.sign({
					id: result.lastID,
					username: username
				});

				const refreshToken = await generateRefreshToken(result.lastID);
				
				// Send success response
				reply.code(201).send({  // 201 = Created
					success: true,
					token: accessToken,
					refreshToken,
					user: {
						id: result.lastID,     // New user's ID
						firstName,
						lastName,
						username,
						email,
						avatar: 'default.jpg',
						wins: 0,
						losses: 0,
						twoFactorEnabled: false
					}
				});
				
			} catch (error) {
				// Handle duplicate username/email
				if (error.code === 'SQLITE_CONSTRAINT') {
					return reply.code(409).send({  // 409 = Conflict
						error: 'Username or email already exists'
					});
				}
				// Re-throw other errors
				throw error;
			}
		});

		// Setup 2FA endpoint - POST /api/auth/2fa/setup
		fastify.post('/2fa/setup', {
			preHandler: async (request, reply) => {
				try {
					await request.jwtVerify();
				} catch (err) {
					return reply.code(401).send({ error: 'Invalid token' });
				}
			}
		}, async (request, reply) => {
			const user = await fastify.db.get(
				'SELECT * FROM users WHERE id = ?',
				[request.user.id]
			);

			if (user.two_factor_enabled) {
				return reply.code(400).send({ error: 'Two-factor authentication already enabled' });
			}

			// Generate secret
			const secret = speakeasy.generateSecret({
				name: user.username,
				issuer: 'Pong Arena'
			});

			// Generate QR code
			const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

			// Store secret temporarily (not enabled yet)
			await fastify.db.run(
				'UPDATE users SET two_factor_secret = ? WHERE id = ?',
				[secret.base32, user.id]
			);

			return {
				secret: secret.base32,
				qrCode: qrCodeUrl,
				manualEntryKey: secret.base32
			};
		});

		// Verify and enable 2FA - POST /api/auth/2fa/verify
		fastify.post('/2fa/verify', {
			preHandler: async (request, reply) => {
				try {
					await request.jwtVerify();
				} catch (err) {
					return reply.code(401).send({ error: 'Invalid token' });
				}
			},
			schema: {
				body: {
					type: 'object',
					required: ['token'],
					properties: {
						token: { type: 'string' }
					}
				}
			}
		}, async (request, reply) => {
			const { token } = request.body;

			const user = await fastify.db.get(
				'SELECT * FROM users WHERE id = ?',
				[request.user.id]
			);

			if (!user.two_factor_secret) {
				return reply.code(400).send({ error: 'Two-factor setup not initiated' });
			}

			// Verify the token
			const verified = speakeasy.totp.verify({
				secret: user.two_factor_secret,
				encoding: 'base32',
				token: token,
				window: 2
			});

			if (!verified) {
				return reply.code(401).send({ error: 'Invalid verification code' });
			}

			// Enable 2FA and generate backup codes
			await fastify.db.run(
				'UPDATE users SET two_factor_enabled = 1 WHERE id = ?',
				[user.id]
			);

			const backupCodes = await generateBackupCodes(user.id);

			return {
				success: true,
				backupCodes: backupCodes,
				message: 'Two-factor authentication enabled successfully'
			};
		});

		// Disable 2FA - POST /api/auth/2fa/disable
		fastify.post('/2fa/disable', {
			preHandler: async (request, reply) => {
				try {
					await request.jwtVerify();
				} catch (err) {
					return reply.code(401).send({ error: 'Invalid token' });
				}
			},
			schema: {
				body: {
					type: 'object',
					required: ['password'],
					properties: {
						password: { type: 'string' },
						twoFactorCode: { type: 'string' }
					}
				}
			}
		}, async (request, reply) => {
			const { password, twoFactorCode } = request.body;

			const user = await fastify.db.get(
				'SELECT * FROM users WHERE id = ?',
				[request.user.id]
			);

			// Verify password
			if (!await bcrypt.compare(password, user.password)) {
				return reply.code(401).send({ error: 'Invalid password' });
			}

			// Verify 2FA code if 2FA is enabled
			if (user.two_factor_enabled && twoFactorCode) {
				const verified = speakeasy.totp.verify({
					secret: user.two_factor_secret,
					encoding: 'base32',
					token: twoFactorCode,
					window: 2
				});

				if (!verified) {
					return reply.code(401).send({ error: 'Invalid two-factor code' });
				}
			}

			// Disable 2FA and remove secret
			await fastify.db.run(
				'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
				[user.id]
			);

			// Remove backup codes
			await fastify.db.run(
				'DELETE FROM two_factor_backup_codes WHERE user_id = ?',
				[user.id]
			);

			return { success: true, message: 'Two-factor authentication disabled' };
		});

		// Logout endpoint - POST /api/auth/logout
		fastify.post('/logout', {
			preHandler: async (request, reply) => {
				try {
					await request.jwtVerify();
				} catch (err) {
					return reply.code(401).send({ error: 'Invalid token' });
				}
			},
			schema: {
				body: {
					type: 'object',
					required: ['refreshToken'],
					properties: {
						refreshToken: { type: 'string' }
					}
				}
			}
		}, async (request, reply) => {
			const { refreshToken } = request.body;

			// Revoke refresh token
			await fastify.db.run(
				'UPDATE refresh_tokens SET revoked_at = datetime("now") WHERE token = ?',
				[refreshToken]
			);

			return { success: true, message: 'Logged out successfully' };
		});

		// Token verification endpoint
		fastify.get('/verify', {
			preHandler: async (request, reply) => {
				try {
					await request.jwtVerify();
				} catch (err) {
					return reply.code(401).send({ error: 'Invalid token' });
				}
			}
		}, async (request, reply) => {
			const user = await fastify.db.get(
				'SELECT id, username, email, display_name, avatar, wins, losses, two_factor_enabled FROM users WHERE id = ?',
				[request.user.id]
			);
			
			if (!user) {
				return reply.code(404).send({ error: 'User not found' });
			}
			
			return { 
				user: {
					...user,
					twoFactorEnabled: !!user.two_factor_enabled
				}
			};
		});

		// // Token verification endpoint - GET /api/auth/verify
		// fastify.get('/verify', {
		// 	preHandler: async (request, reply) => {
		// 		try {
		// 			await request.jwtVerify();
		// 		} catch (err) {
		// 			return reply.code(401).send({ error: 'Invalid token' });
		// 		}
		// 	}
		// }, async (request, reply) => {
		// 	// Get current user data
		// 	const user = await fastify.db.get(
		// 		'SELECT id, username, email, display_name, avatar, wins, losses FROM users WHERE id = ?',
		// 		[request.user.id]
		// 	);
			
		// 	if (!user) {
		// 		return reply.code(404).send({ error: 'User not found' });
		// 	}
			
		// 	return { user };
		// });

	}, { prefix: '/auth' }); // Add prefix here
}