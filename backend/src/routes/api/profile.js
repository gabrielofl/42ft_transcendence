import { authenticate } from '../../middleware/auth.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function (fastify, opts) {
	// Add /profile prefix to all routes in this file
	fastify.register(async function (fastify, opts) {
		
		// Upload avatar endpoint - POST /api/profile/avatar
		fastify.post('/avatar', {
			preHandler: authenticate,  // Require authentication
		}, async (request, reply) => {
			try {
				// Get the uploaded file
				const data = await request.file();
				
				if (!data) {
					return reply.code(400).send({ 
						success: false, 
						error: 'No file uploaded' 
					});
				}

				// Validate file type
				if (!data.mimetype.startsWith('image/')) {
					return reply.code(400).send({ 
						success: false, 
						error: 'Only image files are allowed' 
					});
				}

				// Validate file size (max 5MB)
				const maxSize = 5 * 1024 * 1024; // 5MB
				if (data.file.bytesRead > maxSize) {
					return reply.code(400).send({ 
						success: false, 
						error: 'File size too large. Maximum 5MB allowed.' 
					});
				}

				// Generate unique filename
				const fileExtension = data.filename.split('.').pop();
				const uniqueFilename = `avatar_${request.user.id}_${Date.now()}.${fileExtension}`;
				
				// Path where to save the file
				const uploadsDir = join(__dirname, '../../../uploads/avatars');
				const filePath = join(uploadsDir, uniqueFilename);

				// Ensure uploads directory exists
				await mkdir(uploadsDir, { recursive: true });

				// Save the file
				const buffer = await data.toBuffer();
				await writeFile(filePath, buffer);

				// Update database with new avatar filename
				await fastify.db.run(
					'UPDATE users SET avatar = ? WHERE id = ?',
					[uniqueFilename, request.user.id]
				);

				// Return success response
				reply.header('Access-Control-Allow-Origin', 'https://localhost:8080');
				reply.header('Access-Control-Allow-Credentials', 'true');
				reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
				return {
					success: true,
					avatar: uniqueFilename,
					message: 'Avatar updated successfully'
				};

			} catch (error) {
				fastify.log.error('Avatar upload error:', error);
				return reply.code(500).send({ 
					success: false, 
					error: 'Failed to upload avatar' 
				});
			}
		});

		// Get avatar by filename - GET /api/profile/avatar/:filename
		fastify.get('/avatar/:filename', async (request, reply) => {
			try {
				const { filename } = request.params;
				
				// Security: only allow avatar files or default.jpg
				if ((!filename.startsWith('avatar_') && filename !== 'default.jpg') || !filename.includes('.')) {
					return reply.code(400).send({ error: 'Invalid filename' });
				}

				const avatarPath = join(__dirname, '../../../uploads/avatars', filename);
				const imageBuffer = await readFile(avatarPath);
				
				// Determine content type based on file extension
				const ext = filename.split('.').pop()?.toLowerCase();
				let contentType = 'image/jpeg'; // default
				
				if (ext === 'png') contentType = 'image/png';
				else if (ext === 'gif') contentType = 'image/gif';
				else if (ext === 'webp') contentType = 'image/webp';
				
				// Set CORS and CORP headers explicitly
				reply.header('Access-Control-Allow-Origin', 'https://localhost:8080');
				reply.header('Access-Control-Allow-Credentials', 'true');
				reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
				reply.header('Content-Type', contentType);
				reply.header('Cache-Control', 'public, max-age=31536000');
				return reply.send(imageBuffer);

			} catch (error) {
				return reply.code(404).send({ error: 'Avatar not found' });
			}
		});

		// Select all games(matches) from user id with pagination
		// Select user data for each player involved on matches and return a map with key=userId
		fastify.get('/games/:id', {
		schema: {
			params: {
			type: 'object',
			required: ['id'],
			properties: {
				id: { type: 'integer' }
			}
			},
			querystring: {
			type: 'object',
			properties: {
				limit: { type: 'integer', minimum: 1, default: 10 },
				offset: { type: 'integer', minimum: 0, default: 0 }
			}
			}
		}
		}, async (request, reply) => {
		const { id } = request.params;
		const { limit, offset } = request.query;

		// Fetch matches
		const matches = await fastify.db.all(
			'SELECT * FROM games WHERE player1_id = ? OR player2_id = ? ORDER BY finished_at DESC LIMIT ? OFFSET ?',
			[id, id, limit, offset]
		);

		const total = await fastify.db.get(
			'SELECT COUNT(*) as count FROM games WHERE player1_id = ? OR player2_id = ?',
			[id, id]
		);

		if (!matches.length) {
			return { total: 0, limit, offset, matches: [], users: {} };
		}

		// Extract unique player IDs
		const userIds = [...new Set(matches.flatMap(m => [m.player1_id, m.player2_id]))];

		// Fetch all users in one query
		const placeholders = userIds.map(() => '?').join(',');
		const users = await fastify.db.all(
			`SELECT id, username, avatar, score, show_scores_publicly, status FROM users WHERE id IN (${placeholders})`,
			userIds
		);

		// Build a map (id → user object)
		const userMap = {};
		for (const u of users) {
			userMap[u.id] = u;
		}

		// Return structured response
		return {
			total: total.count,
			limit,
			offset,
			matches,
			users: userMap
		};
		});




	}, { prefix: '/profile' });
}
