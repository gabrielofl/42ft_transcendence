import bcrypt from 'bcrypt';  // Password hashing library

export default async function (fastify, opts) {
	// Add /auth prefix to all routes in this file
	fastify.register(async function (fastify, opts) {
		// Login endpoint - POST /api/auth/login
		fastify.post('/login', {
			// Schema validation
			schema: {
				body: {
					type: 'object',
					required: ['username', 'password'],  // Must have these fields
					properties: {
						username: { type: 'string' },
						password: { type: 'string' }
					}
				}
			}
		}, async (request, reply) => {
			// Extract data from request body
			const { username, password } = request.body;
			
			// Query database for user
			const user = await fastify.db.get(
				'SELECT * FROM users WHERE username = ?',  // SQL query
				[username]  // Parameters (prevents SQL injection)
			);
			
			// Check if user exists and password matches
			if (!user || !await bcrypt.compare(password, user.password)) {
				// Wrong username or password
				return reply.code(401).send({ 
					error: 'Invalid credentials' 
				});
			}
			
			// Create JWT token
			const token = fastify.jwt.sign({
				id: user.id,
				username: user.username
			});
			
			// Return success response
			return { 
				token,  // JWT token for future requests
				user: {
					id: user.id,
					username: user.username,
					email: user.email
					// Note: Never send password back!
				}
			};
		});

		// Register endpoint - POST /api/auth/register
		fastify.post('/register', {
			schema: {
				body: {
					type: 'object',
					required: ['username', 'email', 'password'],
					properties: {
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
			const { username, email, password } = request.body;
			
			try {
				// Hash password (never store plain text!)
				const hashedPassword = await bcrypt.hash(
					password, 
					fastify.config.security.bcryptRounds  // 10 rounds
				);
				
				// Insert into database
				const result = await fastify.db.run(
					'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
					[username, email, hashedPassword]
				);
				
				// Send success response
				reply.code(201).send({  // 201 = Created
					id: result.lastID,     // New user's ID
					username,
					email
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
	}, { prefix: '/auth' }); // Add prefix here
}