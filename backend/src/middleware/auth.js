// CSRF protection middleware for state-changing operations
export async function validateCSRF(request, reply) {
	// Only check CSRF for state-changing methods
	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
		const csrfTokenFromHeader = request.headers['x-csrf-token'];
		const csrfTokenFromCookie = request.cookies.csrfToken;

		if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
			return reply.code(403).send({
				error: 'Forbidden',
				message: 'CSRF token missing'
			});
		}

		if (csrfTokenFromHeader !== csrfTokenFromCookie) {
			return reply.code(403).send({
				error: 'Forbidden', 
				message: 'Invalid CSRF token'
			});
		}
	}
}

// Authentication middleware for protecting routes
export async function authenticate(request, reply) {
	try {
		// Get access token from cookie
		const accessToken = request.cookies.accessToken;
		
		if (!accessToken) {
			return reply.code(401).send({ 
				error: 'Unauthorized',
				message: 'No authentication cookie found'
			});
		}

		// Verify the access token from cookie
		const decoded = request.server.jwt.verify(accessToken);
		
		// Manually set request.user (normally done by jwtVerify)
		request.user = decoded;
		
	} catch (err) {
		// If access token is expired, try to refresh it
		if (err.message && err.message.includes('expired')) {
			return await tryRefreshToken(request, reply);
		}
		
		// Token is invalid or other error
		return reply.code(401).send({ 
			error: 'Unauthorized',
			message: 'Invalid authentication token'
		});
	}
}

// Helper function to handle automatic token refresh
async function tryRefreshToken(request, reply) {
	try {
		const refreshToken = request.cookies.refreshToken;
		
		if (!refreshToken) {
			return reply.code(401).send({ 
				error: 'Unauthorized',
				message: 'Access token expired and no refresh token found'
			});
		}

		// Check if refresh token exists in database and is valid
		const tokenRecord = await request.server.db.get(
			'SELECT user_id, expires_at FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")',
			[refreshToken]
		);

		if (!tokenRecord) {
			// Refresh token is invalid or expired
			return reply.code(401).send({ 
				error: 'Unauthorized',
				message: 'Invalid or expired refresh token'
			});
		}

		// Get user info for new access token
		const user = await request.server.db.get(
			'SELECT id, username FROM users WHERE id = ?',
			[tokenRecord.user_id]
		);

		if (!user) {
			return reply.code(401).send({ 
				error: 'Unauthorized',
				message: 'User not found'
			});
		}

		// Generate new access token
		const newAccessToken = request.server.jwt.sign({
			id: user.id,
			username: user.username
		});

		// Set new access token cookie
		reply.setCookie('accessToken', newAccessToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'None',
			path: '/',
			maxAge: 3 * 60 * 60 // 3 hours
		});

		// Set user for this request
		request.user = {
			id: user.id,
			username: user.username
		};

		// Continue with the request - token has been refreshed automatically!
		
	} catch (err) {
		return reply.code(401).send({ 
			error: 'Unauthorized',
			message: 'Failed to refresh token'
		});
	}
}