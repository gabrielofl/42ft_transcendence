import bcrypt from 'bcrypt';  // Password hashing library
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';

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
					}
				}
			}
		}, async (request, reply) => {
			// Extract data from request body
			const { username, password, twoFactorCode } = request.body;
			
			// Query database for user (allow login with username OR email)
			const user = await fastify.db.get(
				'SELECT * FROM users WHERE username = ? OR email = ?',
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

				// Verify 2FA code
				const verified = speakeasy.totp.verify({
					secret: user.two_factor_secret,
					encoding: 'base32',
					token: twoFactorCode,
					window: 2 // Allow some time drift
				});

				// If TOTP fails, check backup codes
				if (!verified) {
					const backupCode = await fastify.db.get(
						'SELECT * FROM two_factor_backup_codes WHERE user_id = ? AND code = ? AND used_at IS NULL',
						[user.id, twoFactorCode.toUpperCase()]
					);

					if (!backupCode) {
						return reply.code(401).send({ error: 'Invalid two-factor code' });
					}

					// Mark backup code as used
					await fastify.db.run(
						'UPDATE two_factor_backup_codes SET used_at = datetime("now") WHERE id = ?',
						[backupCode.id]
					);
				}
			}
			
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
			
			// Set secure HTTP-only cookies
			reply.setCookie('accessToken', accessToken, {
				httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
				secure: true,             // Only sent over HTTPS
				sameSite: 'None',         // Allows cross-origin requests (frontend/backend on different ports)
				path: '/',                // Available for all routes
				maxAge: 3 * 60 * 60       // 3 hours in seconds (matches JWT expiry)
			});

			reply.setCookie('refreshToken', refreshToken, {
				httpOnly: true,           // Cannot be accessed by JavaScript
				secure: true,             // Only sent over HTTPS
				sameSite: 'None',         // Allows cross-origin requests
				path: '/',                // Available for all routes
				maxAge: 7 * 24 * 60 * 60  // 7 days in seconds
			});

			// Generate CSRF token for additional security against CSRF attacks
			const crypto = await import('crypto');
			const csrfToken = crypto.randomBytes(32).toString('hex');

			// Set CSRF token cookie (NOT httpOnly - JavaScript needs to read this)
			reply.setCookie('csrfToken', csrfToken, {
				httpOnly: false,          // JavaScript CAN read this (needed for CSRF protection)
				secure: true,             // Only sent over HTTPS
				sameSite: 'None',         // Allows cross-origin requests
				path: '/',                // Available for all routes
				maxAge: 3 * 60 * 60       // Same as access token
			});

			return {
				success: true,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					avatar: user.avatar,
					wins: user.wins,
					losses: user.losses,
					twoFactorEnabled: !!user.two_factor_enabled
				}
			};
		});

		// Refresh token endpoint - POST /api/auth/refresh
		fastify.post('/refresh', async (request, reply) => {
			try {
				// Get refresh token from cookie
				const refreshToken = request.cookies.refreshToken;

				if (!refreshToken) {
					return reply.code(401).send({ error: 'No refresh token found' });
				}

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

				// Set new access token cookie
				reply.setCookie('accessToken', newAccessToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60 // 3 hours
				});

				return { success: true, message: 'Token refreshed successfully' };
			} catch (error) {
				fastify.log.error(error);
				return reply.code(500).send({ error: 'Failed to refresh token' });
			}
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
				
				// Create JWT tokens for immediate login after registration
				const accessToken = fastify.jwt.sign({
					id: result.lastID,
					username: username
				});

				const refreshToken = await generateRefreshToken(result.lastID);
				
				// Set secure HTTP-only cookies
				reply.setCookie('accessToken', accessToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60 // 3 hours
				});

				reply.setCookie('refreshToken', refreshToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 7 * 24 * 60 * 60 // 7 days
				});

				// Generate CSRF token
				const crypto = await import('crypto');
				const csrfToken = crypto.randomBytes(32).toString('hex');

				reply.setCookie('csrfToken', csrfToken, {
					httpOnly: false,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60
				});

				// Update last login time
				await fastify.db.run(
					'UPDATE users SET last_login = datetime("now") WHERE id = ?',
					[user.id]
				);

				// Send success response with user data (NO TOKENS in body)
				reply.code(201).send({  // 201 = Created
					success: true,
					user: {
						id: result.lastID,
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

		// Google OAuth endpoint - POST /api/auth/google
		fastify.post('/google', {
			schema: {
				body: {
					type: 'object',
					required: ['credential'],
					properties: {
						credential: { type: 'string' } // Google ID token
					}
				}
			}
		}, async (request, reply) => {
			try {
				const { credential } = request.body;

				// Initialize Google OAuth2 client with your client ID
				const client = new OAuth2Client('723996318435-bavdbrolseqgqq06val5dc1sumgam12j.apps.googleusercontent.com');

				// Verify the Google ID token
				const ticket = await client.verifyIdToken({
					idToken: credential,
					audience: '723996318435-bavdbrolseqgqq06val5dc1sumgam12j.apps.googleusercontent.com'
				});

				const payload = ticket.getPayload();
				if (!payload) {
					return reply.code(400).send({ error: 'Invalid Google token' });
				}

				const { sub: googleId, email, name, picture } = payload;

				// Check if user already exists with this Google ID or email
				let user = await fastify.db.get(
					'SELECT * FROM users WHERE google_id = ? OR email = ?',
					[googleId, email]
				);

				if (user) {
					// User exists - update Google ID if not set
					if (!user.google_id) {
						await fastify.db.run(
							'UPDATE users SET google_id = ? WHERE id = ?',
							[googleId, user.id]
						);
					}
				} else {

					// Create new user (password is NULL for Google users)
					const firstName = name.split(' ')[0] || name;
					const lastName = name.split(' ')[1] || '';
					
					// Generate username as firstname + lastname in lowercase
					let baseUsername = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
					
					// Ensure username is not empty and has minimum length
					if (!baseUsername || baseUsername.length < 3) {
						baseUsername = email.split('@')[0].toLowerCase();
					}
					
					// Check if username already exists and make it unique if needed
					let username = baseUsername;
					let counter = 1;
					while (await fastify.db.get('SELECT id FROM users WHERE username = ?', [username])) {
						username = `${baseUsername}${counter}`;
						counter++;
					}

					const result = await fastify.db.run(
						'INSERT INTO users (google_id, email, username, avatar, first_name, last_name, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
						[googleId, email, username, 'default.jpg', firstName, lastName, 'GOOGLE_USER']
					);
					
					user = {
						id: result.lastID,
						google_id: googleId,
						email,
						username: username,
						avatar: picture,
						first_name: firstName,
						last_name: lastName,
						wins: 0,
						losses: 0,
						two_factor_enabled: false
					};
				}
				// Create JWT tokens
				const accessToken = fastify.jwt.sign({
					id: user.id,
					username: user.username || user.email
				});

				const refreshToken = await generateRefreshToken(user.id);

				// Set secure HTTP-only cookies
				reply.setCookie('accessToken', accessToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60 // 3 hours
				});

				reply.setCookie('refreshToken', refreshToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 7 * 24 * 60 * 60 // 7 days
				});

				// Generate CSRF token
				const csrfCrypto = await import('crypto');
				const csrfToken = csrfCrypto.randomBytes(32).toString('hex');

				reply.setCookie('csrfToken', csrfToken, {
					httpOnly: false,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60
				});

				// Update last login time
				await fastify.db.run(
					'UPDATE users SET last_login = datetime("now") WHERE id = ?',
					[user.id]
				);

				// Return success response with user data
				return {
					success: true,
					user: {
						id: user.id,
						username: user.username || user.email,
						email: user.email,
						avatar: user.avatar,
						wins: user.wins,
						losses: user.losses,
						twoFactorEnabled: !!user.two_factor_enabled,
						isGoogleUser: true
					}
				};

			} catch (error) {
				fastify.log.error(error);
				return reply.code(400).send({ 
					error: 'Google authentication failed',
					message: error.message 
				});
			}
		});

		// Setup 2FA endpoint - POST /api/auth/2fa/setup
		fastify.post('/2fa/setup', {
			preHandler: authenticate
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
			preHandler: authenticate,
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
			preHandler: authenticate,
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
		fastify.post('/logout', async (request, reply) => {
			try {
				// Get refresh token from cookie
				const refreshToken = request.cookies.refreshToken;
				
				if (refreshToken) {
					// Revoke refresh token in database
					await fastify.db.run(
						'UPDATE refresh_tokens SET revoked_at = datetime("now") WHERE token = ?',
						[refreshToken]
					);
				}

				// Clear all authentication cookies
				reply.clearCookie('accessToken', {
					path: '/',
					secure: true,
					sameSite: 'None'
				});
				
				reply.clearCookie('refreshToken', {
					path: '/',
					secure: true,
					sameSite: 'None'
				});

				reply.clearCookie('csrfToken', {
					path: '/',
					secure: true,
					sameSite: 'None'
				});

				return { 
					success: true, 
					message: 'Logged out successfully' 
				};
				
			} catch (err) {
				fastify.log.error(err);
				return reply.code(500).send({ 
					error: 'Internal Server Error',
					message: 'Failed to logout'
				});
			}
		});

		// Token verification endpoint
		fastify.get('/verify', {
			preHandler: authenticate
		}, async (request, reply) => {
			const user = await fastify.db.get(
				'SELECT id, username, email, avatar, wins, losses, two_factor_enabled FROM users WHERE id = ?',
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

	}, { prefix: '/auth' }); // Add prefix here
}