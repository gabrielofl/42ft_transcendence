import bcrypt from 'bcrypt';  // Password hashing library
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetOTP, sendBackupResetSuccess, send2FAEnabled } from '../../mailer.js';

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
			const { username, password } = request.body;
			
			// Query database for user (allow login with username OR email)
			const user = await fastify.db.get(
				'SELECT * FROM users WHERE username = ? OR email = ?',
				[username, username]  // Check both username and email fields
			);
			
			
			// Check if user exists and password matches
			if (!user || !await bcrypt.compare(password, user.password)) {
				// Wrong username or password
				return reply.code(401).send({ 
					error: 'Whoops! Invalid credentials' 
				});
			}

			if (user.two_factor_enabled) {
			const challenge = crypto.randomBytes(16).toString('hex');
			await fastify.db.run(
				'INSERT INTO login_challenges (challenge, user_id, expires_at) VALUES (?, ?, datetime("now","+5 minutes"))',
				[challenge, user.id]
			);
			return reply.code(202).send({ success: true, requires2FA: true, challenge });
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
			}, { expiresIn: '3h' });

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
					return reply.code(401).send({ error: 'Darn! We hit a little snag. No refresh token found' });
				}

				// Validate refresh token
				const tokenRecord = await fastify.db.get(
					`SELECT rt.*, u.id, u.username FROM refresh_tokens rt
					 JOIN users u ON rt.user_id = u.id
					 WHERE rt.token = ? AND rt.expires_at > datetime('now') AND rt.revoked_at IS NULL`,
					[refreshToken]
				);

				if (!tokenRecord) {
					return reply.code(401).send({ error: 'Darn! We hit a little snag. Invalid refresh token' });
				}

				// Generate new access token
				const newAccessToken = fastify.jwt.sign({
					id: tokenRecord.user_id,
					username: tokenRecord.username
				}, { expiresIn: '3h' });

				// Set new access token cookie
				reply.setCookie('accessToken', newAccessToken, {
					httpOnly: true,
					secure: true,
					sameSite: 'None',
					path: '/',
					maxAge: 3 * 60 * 60 // 3 hours
				});

				return { success: true, message: 'Boom! Token refreshed successfully' };
			} catch (error) {
				fastify.log.error(error);
				return reply.code(500).send({ error: 'Darn! We hit a little snag. Failed to refresh token' });
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
							maxLength: 15
						},
						lastName: {
							type: 'string',
							minLength: 1,
							maxLength: 15
						},
						username: { 
							type: 'string', 
							minLength: 3,
							maxLength: 10
						},
						email: { 
							type: 'string', 
							format: 'email'  // Must be valid email
						},
						password: { 
							type: 'string', 
							minLength: 8  // At least 8 characters
						},
						allowDataCollection: { type: 'boolean' },
						allowDataProcessing: { type: 'boolean' },
						allowAiTraining:     { type: 'boolean' },
						showScoresPublicly:  { type: 'boolean' },
					}
				}
			}
		}, async (request, reply) => {
			if (request.body?.email) {
			request.body.email = request.body.email.toLowerCase();
			}
			const { firstName, lastName, username, email, password, allowDataCollection,
			allowDataProcessing, allowAiTraining, showScoresPublicly, } = request.body;
						
			const col = (allowDataCollection ?? true) ? 1 : 0;
			const proc = (allowDataProcessing ?? true) ? 1 : 0;
			const ai   = (allowAiTraining ?? true) ? 1 : 0;
			const pub  = (showScoresPublicly ?? true) ? 1 : 0;

			try {
				// Hash password (never store plain text!)
				const hashedPassword = await bcrypt.hash(
					password, 
					fastify.config.security.bcryptRounds  // 10 rounds
				);
				
				// Insert into database
				const result = await fastify.db.run(
				`INSERT INTO users
				(first_name, last_name, username, email, password,
					allow_data_collection, allow_data_processing, allow_ai_training, show_scores_publicly)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[firstName, lastName, username, email, hashedPassword, col, proc, ai, pub]
				);
				
				// Create JWT tokens for immediate login after registration
				const accessToken = fastify.jwt.sign({
					id: result.lastID,
					username: username
				}, { expiresIn: '3h' });

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
					[result.lastID]
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
						error: 'Oh no! Username or email already exists'
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
					},
					additionalProperties: false
				}
			}

		}, async (request, reply) => {
			try {
				const { credential} = request.body;

				// Initialize Google OAuth2 client with your client ID
				const client = new OAuth2Client(process.env.GOOGLE_AUTH_CLIENT);

				// Verify the Google ID token
				const ticket = await client.verifyIdToken({
					idToken: credential,
					audience: process.env.GOOGLE_AUTH_CLIENT
				});

				const payload = ticket.getPayload();
				if (!payload) {
					return reply.code(400).send({ error: 'Oh no! Invalid Google token' });
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

				if (user.two_factor_enabled) {
					const challenge = crypto.randomBytes(16).toString('hex');
					await fastify.db.run(
					'INSERT INTO login_challenges (challenge, user_id, expires_at) VALUES (?, ?, datetime("now","+5 minutes"))',
					[challenge, user.id]
					);
					return reply.code(202).send({ success: true, requires2FA: true, challenge });
				}
				// Create JWT tokens
				const accessToken = fastify.jwt.sign({
					id: user.id,
					username: user.username || user.email
				}, { expiresIn: '3h' });

				const refreshToken = await generateRefreshToken(user.id);
				// Generate CSRF token
				const csrfToken = crypto.randomBytes(32).toString('hex');
				setAuthCookies(reply, accessToken, refreshToken, csrfToken);
					
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
				}, { expiresIn: '3h' });

				const refreshToken = await generateRefreshToken(user.id);
				// Generate CSRF token
				const csrfToken = crypto.randomBytes(32).toString('hex');
				setAuthCookies(reply, accessToken, refreshToken, csrfToken);


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
					error: 'Whoops! Google authentication failed',
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
				return reply.code(400).send({ error: 'Whoops! Two-factor authentication already enabled' });
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
				return reply.code(400).send({ error: 'Whoops! Two-factor setup not initiated' });
			}

			// Verify the token
			const verified = speakeasy.totp.verify({
				secret: user.two_factor_secret,
				encoding: 'base32',
				token: token,
				window: 2
			});

			if (!verified) {
				return reply.code(401).send({ error: 'Oops! Invalid verification code' });
			}

			// Enable 2FA and generate backup codes
			await fastify.db.run(
				'UPDATE users SET two_factor_enabled = 1 WHERE id = ?',
				[user.id]
			);

			const backupCodes = await generateBackupCodes(user.id);

			await send2FAEnabled({ to: user.email, backupCodes })
  				.catch(err => fastify.log.error({ err }, '[mail] 2FA enabled notify failed'));
			return {
				success: true,
				backupCodes: backupCodes,
				message: 'Yay! Two-factor authentication enabled successfully'
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

			if(!user.google_id)
			{
				// Verify password
				if (!await bcrypt.compare(password, user.password)) {
					return reply.code(401).send({ error: 'Oops! Invalid password' });
				}
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
					return reply.code(401).send({ error: 'Oops! Invalid two-factor code' });
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

			return { success: true, message: 'Boom! Two-factor authentication disabled' };
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
					message: 'Boom! Logged out successfully' 
				};
				
			} catch (err) {
				fastify.log.error(err);
				return reply.code(500).send({ 
					error: 'Darn! Internal Server Error',
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
				return reply.code(404).send({ error: 'Oops! User not found' });
			}
			
			return { 
				user: {
					...user,
					twoFactorEnabled: !!user.two_factor_enabled
				}
			};
		});

		fastify.post('/login/2fa', {
		schema: {
			body: {
			type: 'object',
			required: ['challenge', 'code'],
			properties: {
				challenge: { type: 'string' },
				code: { type: 'string' }
			}
			}
		}
		}, async (request, reply) => {
		const { challenge, code } = request.body;

		const row = await fastify.db.get(
			'SELECT * FROM login_challenges WHERE challenge = ? AND expires_at > datetime("now")',
			[challenge]
		);
		if (!row) return reply.code(401).send({ error: 'Invalid or expired challenge' });

		const user = await fastify.db.get('SELECT * FROM users WHERE id = ?', [row.user_id]);
		if (!user?.two_factor_enabled) return reply.code(400).send({ error: '2FA not enabled' });

		let verified = speakeasy.totp.verify({
			secret: user.two_factor_secret,
			encoding: 'base32',
			token: code,
			window: 2
		});

		if (!verified && code.length === 8) {
			const match = await fastify.db.get(
			'SELECT code FROM two_factor_backup_codes WHERE user_id = ? AND UPPER(code) = UPPER(?)',
			[user.id, code]
			);
			if (match) {
			verified = true;
			// consume backup
			await fastify.db.run(
				'DELETE FROM two_factor_backup_codes WHERE user_id = ? AND UPPER(code) = UPPER(?)',
				[user.id, code]
			);
			}
		}

		if (!verified) return reply.code(401).send({ error: 'Invalid 2FA code' });

		await fastify.db.run('DELETE FROM login_challenges WHERE challenge = ?', [challenge]);

		const accessToken = fastify.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '3h' });
		const refreshToken = await generateRefreshToken(user.id);
		const csrfToken = crypto.randomBytes(32).toString('hex');
		setAuthCookies(reply, accessToken, refreshToken, csrfToken);

		await fastify.db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);

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

		fastify.post('/password/request-reset', {
		schema: {
			body: {
			type: 'object',
			required: ['email'],
			properties: {
				email: { type: 'string', format: 'email' }
			}
			}
		}
		}, async (request, reply) => {
		const { email } = request.body;

		const user = await fastify.db.get('SELECT id FROM users WHERE email = ?', [email]);

		const otp = generateOtp();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

		if (user) {
			await fastify.db.run('DELETE FROM password_resets WHERE email = ?', [email]);
			await fastify.db.run(
			'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
			[email, otp, expiresAt]
			);

		await sendPasswordResetOTP({ to: email, otp, expiresInMinutes: 15 })
		.catch(err => fastify.log.error({ err }, '[mail] reset otp send failed'));
		}

		return { success: true, message: 'If an account exists for that email, a reset code has been sent.' };
		});

		fastify.post('/password/reset-otp', {
		schema: {
			body: {
			type: 'object',
			required: ['email', 'otp', 'newPassword'],
			properties: {
				email: { type: 'string', format: 'email' },
				otp: { type: 'string', minLength: 6, maxLength: 6 },
				newPassword: { type: 'string', minLength: 8 }
			}
			}
		}
		}, async (request, reply) => {
		const { email, otp, newPassword } = request.body;

		const resetRow = await fastify.db.get(
			'SELECT * FROM password_resets WHERE email = ? AND code = ? ORDER BY created_at DESC LIMIT 1',
			[email, otp]
		);

		if (!resetRow) {
			return reply.code(400).send({ success: false, error: 'Invalid or expired code.' });
		}

		if (new Date(resetRow.expires_at).getTime() < Date.now()) {
			await fastify.db.run('DELETE FROM password_resets WHERE email = ?', [email]);
			return reply.code(400).send({ success: false, error: 'Code expired. Please request a new one.' });
		}

		const user = await fastify.db.get('SELECT id FROM users WHERE email = ?', [email]);
		if (!user) {
			await fastify.db.run('DELETE FROM password_resets WHERE email = ?', [email]);
			return { success: true, message: 'Password updated.' };
		}

		const hashed = await bcrypt.hash(newPassword, fastify.config.security.bcryptRounds);
		await fastify.db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);

		await fastify.db.run('DELETE FROM password_resets WHERE email = ?', [email]);
		await fastify.db.run('UPDATE refresh_tokens SET revoked_at = datetime("now") WHERE user_id = ?', [user.id]);

		return { success: true, message: 'Password reset successful.' };
		});

		fastify.post('/password/reset-backup', {
		schema: {
			body: {
			type: 'object',
			required: ['email', 'backupCode', 'newPassword'],
			properties: {
				email: { type: 'string', format: 'email' },
				backupCode: { type: 'string', minLength: 8, maxLength: 8 },
				newPassword: { type: 'string', minLength: 8 }
			}
			}
		}
		}, async (request, reply) => {
		const { email, backupCode, newPassword } = request.body;

		const user = await fastify.db.get('SELECT id FROM users WHERE email = ?', [email]);
		if (!user) {
			return { success: true, message: 'Password updated.' };
		}

		const codeRow = await fastify.db.get(
			'SELECT code FROM two_factor_backup_codes WHERE user_id = ? AND UPPER(code) = UPPER(?)',
			[user.id, backupCode]
		);

		if (!codeRow) {
			return reply.code(400).send({ success: false, error: 'Invalid backup code.' });
		}

		await fastify.db.run(
			'DELETE FROM two_factor_backup_codes WHERE user_id = ? AND UPPER(code) = UPPER(?)',
			[user.id, backupCode]
		);

		const hashed = await bcrypt.hash(newPassword, fastify.config.security.bcryptRounds);
		await fastify.db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);

		await fastify.db.run('UPDATE refresh_tokens SET revoked_at = datetime("now") WHERE user_id = ?', [user.id]);

		await sendBackupResetSuccess({ to: email })
  			.catch(err => fastify.log.error({ err }, '[mail] backup reset notify failed'));
		return { success: true, message: 'Password reset successful.' };
		});


	}, { prefix: '/auth' }); // Add prefix here
}

function setAuthCookies(reply, accessToken, refreshToken, csrfToken) {
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 3 * 60 * 60
  });

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });

  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 3 * 60 * 60
  });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}