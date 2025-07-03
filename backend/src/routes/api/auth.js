import bcrypt from 'bcrypt';

export default async function (fastify, opts) {
	// Login route
	fastify.post('/login', {
		schema: {
			body: {
				type: 'object',
				required: ['username', 'password'],
				properties: {
					username: { type: 'string' },
					password: { type: 'string' }
				}
			}
		}
	}, async (request, reply) => {
		const { username, password } = request.body;
		
		const user = await fastify.db.get(
			'SELECT * FROM users WHERE username = ?',
			[username]
		);
		
		if (!user || !await bcrypt.compare(password, user.password)) {
			return reply.code(401).send({ 
				error: 'Invalid credentials' 
			});
		}
		
		const token = fastify.jwt.sign({
			id: user.id,
			username: user.username
		});
		
		return { 
			token,
			user: {
				id: user.id,
				username: user.username,
				email: user.email
			}
		};
	});

	// Register route
	fastify.post('/register', {
		schema: {
		body: {
			type: 'object',
			required: ['username', 'email', 'password'],
			properties: {
				username: { type: 'string', minLength: 3 },
				email: { type: 'string', format: 'email' },
				password: { type: 'string', minLength: 8 }
			}
		}
		}
	}, async (request, reply) => {
		const { username, email, password } = request.body;
		
		try {
			const hashedPassword = await bcrypt.hash(password, fastify.config.security.bcryptRounds);
			
			const result = await fastify.db.run(
				'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
				[username, email, hashedPassword]
			);
			
			reply.code(201).send({
				id: result.lastID,
				username,
				email
			});
		} catch (error) {
			if (error.code === 'SQLITE_CONSTRAINT') {
				return reply.code(409).send({
					error: 'Username or email already exists'
				});
			}
			throw error;
		}
	});
}