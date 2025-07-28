// Authentication middleware for protecting routes
export async function authenticate(request, reply) {
	try {
		// This will verify the JWT token from the Authorization header
		await request.jwtVerify();
		// If we get here, token is valid and request.user is populated
	} catch (err) {
		// Token is invalid, expired, or missing
		return reply.code(401).send({ 
			error: 'Unauthorized',
			message: 'Please provide a valid authentication token'
		});
	}
}