import bcrypt from 'bcrypt';  // Password hashing library
import { authenticate } from '../../middleware/auth.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function (fastify, opts) {
	// Add /profile prefix to all routes in this file
	fastify.register(async function (fastify, opts) {
		

		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>

		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
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



		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// Only accepts file with name avatar_*


		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// Only accepts file with name avatar_*
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



		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>


		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
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


		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>

		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// Stats endpoint for user match/games
		//returns top victim, strongest opponent, and users info.
		fastify.get('/games/stats/:id', {
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
		const { id } = request.params;

		// Fetch all matches for this user
		const matches = await fastify.db.all(
			'SELECT * FROM games WHERE player1_id = ? OR player2_id = ?',
			[id, id]
		);

		if (!matches.length) {
			return {
			total: 0,
			topVictim: null,
			strongestOpponent: null
			};
		}

		// Track stats by opponent
		const wins = {};   // key = opponentId, value = wins against them
		const losses = {}; // key = opponentId, value = losses against them

		for (const match of matches) {
			// Determine winner & loser
			const { player1_id, player2_id, winner_id } = match;
			const opponentId = player1_id === id ? player2_id : player1_id;

			if (winner_id === id) {
			// user won
			wins[opponentId] = (wins[opponentId] || 0) + 1;
			} else if (winner_id === opponentId) {
			// user lost
			losses[opponentId] = (losses[opponentId] || 0) + 1;
			}
		}

		// Find top victim (max wins)
		let topVictimId = null, topVictimWins = 0;
		for (const [opponentId, count] of Object.entries(wins)) {
			if (count > topVictimWins) {
			topVictimWins = count;
			topVictimId = Number(opponentId);
			}
		}

		// Find strongest opponent (max losses)
		let strongestOpponentId = null, strongestOpponentLosses = 0;
		for (const [opponentId, count] of Object.entries(losses)) {
			if (count > strongestOpponentLosses) {
			strongestOpponentLosses = count;
			strongestOpponentId = Number(opponentId);
			}
		}

		// Fetch user info for those opponents (if any)
		const opponentIds = [topVictimId, strongestOpponentId].filter(Boolean);
		let opponentMap = {};
		if (opponentIds.length) {
			const placeholders = opponentIds.map(() => '?').join(',');
			const users = await fastify.db.all(
			`SELECT id, username, avatar, score FROM users WHERE id IN (${placeholders})`,
			opponentIds
			);
			opponentMap = Object.fromEntries(users.map(u => [u.id, u]));
		}

		return {
			total: matches.length,
			topVictim: topVictimId
			? { user: opponentMap[topVictimId], wins: topVictimWins }
			: null,
			strongestOpponent: strongestOpponentId
			? { user: opponentMap[strongestOpponentId], losses: strongestOpponentLosses }
			: null
		};
		});

		

		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		

		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// Delete account endpoint - POST /api/profile/delete
		//takes id from session to avoid user delete another user
		fastify.post('/delete', {
		preHandler: authenticate, // Require valid JWT // Require to read id from request
		schema: {
			body: {
			type: 'object',
			required: ['password'],
			properties: {
				password: { type: 'string' }
			}
			}
		}
		}, async (request, reply) => {
		const { password } = request.body;

		const tokenUser = request.user?.id;

		// Fetch user from DB
		const user = await fastify.db.get(
			'SELECT * FROM users WHERE id = ?',
			[tokenUser]
		);

		if (!user) {
			return reply.code(404).send({ error: 'User not found' });
		}

		if (user.google_id)
		{
			// Validate word typed
			if (password !== "DELETE") {
				return reply.code(401).send({ error: 'Invalid input. Please type DELETE.' });
			}
		}
		else
		{
			// Validate password
			const validPassword = await bcrypt.compare(password, user.password);
			if (!validPassword) {
				return reply.code(401).send({ error: 'Invalid password' });
			}
		}
		

		// Delete related data first (adjust to your schema)
		// await fastify.db.run('DELETE FROM games WHERE player1_id = ? OR player2_id = ?', [user.id, user.id]);
		await fastify.db.run('DELETE FROM two_factor_backup_codes WHERE user_id = ?', [user.id]);

		// Delete the user
		await fastify.db.run('DELETE FROM users WHERE id = ?', [user.id]);

		// Clear cookies
		reply.clearCookie('accessToken', { path: '/' });
		reply.clearCookie('refreshToken', { path: '/' });
		reply.clearCookie('csrfToken', { path: '/' });

		return {
			success: true,
			message: 'Account deleted successfully'
		};
		});




		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// Get all friends from current user with pagination
		// === Get accepted friends (status = "accepted") ===
		fastify.get('/friends', {
		preHandler: authenticate,
		schema: {
			querystring: {
			type: 'object',
			properties: {
				limit: { type: 'integer', minimum: 1, default: 10 },
				offset: { type: 'integer', minimum: 0, default: 0 }
			}
			}
		}
		}, async (request, reply) => {
		const id = request.user?.id;
		const { limit, offset } = request.query;

		const friends = await fastify.db.all(
			`SELECT * FROM friends
			WHERE (player1_id = ? OR player2_id = ?) AND status = 'accepted'
			ORDER BY id DESC
			LIMIT ? OFFSET ?`,
			[id, id, limit, offset]
		);

		const total = await fastify.db.get(
			`SELECT COUNT(*) as count 
			FROM friends 
			WHERE (player1_id = ? OR player2_id = ?) AND status = 'accepted'`,
			[id, id]
		);

		if (!friends.length) {
			return { total: 0, limit, offset, friends: [] };
		}

		const friendIds = [...new Set(friends.map(f => f.player1_id === id ? f.player2_id : f.player1_id))];

		let users = [];
		if (friendIds.length) {
			const placeholders = friendIds.map(() => '?').join(',');
			users = await fastify.db.all(
			`SELECT id, username, avatar, score, show_scores_publicly, status
			FROM users WHERE id IN (${placeholders})`,
			friendIds
			);
		}

		const userMap = {};
		for (const u of users) {
			userMap[u.id] = u;
		}

		const friendList = friends.map(f => {
			const friendId = f.player1_id === id ? f.player2_id : f.player1_id;
			return {
			id: f.id,
			status: f.status,
			friend: userMap[friendId],
			isRequester: f.requester_id === id
			};
		});

		const onlineFriends = friendList.filter(f => f.friend?.status === 1);
		const onlineCount = onlineFriends.length;


		return {
			total: total.count,
			limit,
			offset,
			page: Math.floor(offset / limit) + 1,
  			totalPages: Math.ceil(total.count / limit),
			friends: friendList,
			currentUserId: id,
			onlineCount 
		};
		});



		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>
		// === Get pending friend requests (status = "pending") ===
		fastify.get('/friends/requests', {
		preHandler: authenticate,
		schema: {
			querystring: {
			type: 'object',
			properties: {
				limit: { type: 'integer', minimum: 1, default: 10 },
				offset: { type: 'integer', minimum: 0, default: 0 }
			}
			}
		}
		}, async (request, reply) => {
		const id = request.user?.id;
		const { limit, offset } = request.query;

		const friends = await fastify.db.all(
			`SELECT * FROM friends
			WHERE (player1_id = ? OR player2_id = ?) AND status = 'pending'
			ORDER BY id DESC
			LIMIT ? OFFSET ?`,
			[id, id, limit, offset]
		);

		const total = await fastify.db.get(
			`SELECT COUNT(*) as count 
			FROM friends 
			WHERE (player1_id = ? OR player2_id = ?) AND status = 'pending'`,
			[id, id]
		);

		if (!friends.length) {
			return { total: 0, limit, offset, friends: [] };
		}

		const friendIds = [...new Set(friends.map(f => f.player1_id === id ? f.player2_id : f.player1_id))];

		let users = [];
		if (friendIds.length) {
			const placeholders = friendIds.map(() => '?').join(',');
			users = await fastify.db.all(
			`SELECT id, username, avatar, score, show_scores_publicly, status
			FROM users WHERE id IN (${placeholders})`,
			friendIds
			);
		}

		const userMap = {};
		for (const u of users) {
			userMap[u.id] = u;
		}

		const friendList = friends.map(f => {
			const friendId = f.player1_id === id ? f.player2_id : f.player1_id;
			return {
			id: f.id,
			status: f.status,
			friend: userMap[friendId],
			isRequester: f.requester_id === id
			};
		});

		return {
			total: total.count,
			limit,
			offset,
			page: Math.floor(offset / limit) + 1,
  			totalPages: Math.ceil(total.count / limit),
			friends: friendList,
			currentUserId: id
		};
		});




	// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>	
	// Check if username is friend of current user 
	fastify.get('/isFriend', {
	preHandler: authenticate,
	schema: {
			querystring: {
			type: 'object',
			properties: {
				userId: { type: 'integer'},
			}
			}
		}
	}, async (request, reply) => {
	const { userId } = request.query;
	const tokenUser = request.user?.id;

	if (userId == tokenUser)
		return { isFriend: false, currentUser: true };
	// Check if a friendship row exists between tokenUser and targetUser
	const friendship = await fastify.db.get(
		`SELECT * FROM friends
		WHERE (player1_id = ? AND player2_id = ?)
			OR (player1_id = ? AND player2_id = ?)`,
		[tokenUser, userId, userId, tokenUser]
	);

	if (!friendship) {
		return { isFriend: false, currentUser: false };
	}

	return {
		isFriend: true,
		status: friendship.status,   // "pending" or "accepted"
		friendshipId: friendship.id,
		isRequester: friendship.requester_id === tokenUser
	};
	});


	// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>	
	// Send friend request
	fastify.post('/friends/request', {
		preHandler: authenticate,
		schema: {
			body: {
			type: 'object',
			required: ['userId'],
			properties: {
				userId: { type: 'integer' }
			}
			}
		}
		}, async (request, reply) => {
		const { userId } = request.body;
		const tokenUser = request.user?.id;

		if (userId === tokenUser) {
			return reply.code(400).send({ error: "You cannot send a request to yourself" });
		}

		// Check if friendship already exists
		const existing = await fastify.db.get(
			`SELECT * FROM friends 
			WHERE (player1_id = ? AND player2_id = ?)
				OR (player1_id = ? AND player2_id = ?)`,
			[tokenUser, userId, userId, tokenUser]
		);

		if (existing) {
			return reply.code(400).send({ error: "Friendship already exists" });
		}

		// Insert new pending friendship (tokenUser sent the request)
		const result = await fastify.db.run(
			`INSERT INTO friends (player1_id, player2_id, status, requester_id) 
			VALUES (?, ?, ?, ?)`,
			[tokenUser, userId, "pending", tokenUser]
		);

		return { success: true, friendshipId: result.lastID, status: "pending" };
		});



	// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>	
	// Accept friend request
	fastify.post('/friends/accept', {
		preHandler: authenticate,
		schema: {
			body: {
			type: 'object',
			required: ['friendshipId'],
			properties: {
				friendshipId: { type: 'integer' }
			}
			}
		}
		}, async (request, reply) => {
		const { friendshipId } = request.body;
		const tokenUser = request.user?.id;

		// Ensure current user is part of this friendship and is the receiver
		const friendship = await fastify.db.get(
			`SELECT * FROM friends WHERE id = ?`,
			[friendshipId]
		);

		if (!friendship) {
			return reply.code(404).send({ error: "Friend request not found" });
		}

		if (friendship.status !== "pending") {
			return reply.code(400).send({ error: "Request is not pending" });
		}

		if (friendship.requester_id === tokenUser) {
			return reply.code(403).send({ error: "You cannot accept your own request" });
		}

		// Update status to accepted
		await fastify.db.run(
			`UPDATE friends SET status = 'accepted' WHERE id = ?`,
			[friendshipId]
		);

		return { success: true, friendshipId, status: "accepted" };
		});
	
	
		// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>	
		// Reject fiend request
		fastify.post('/friends/reject', {
			preHandler: authenticate,
			schema: {
				body: {
				type: 'object',
				required: ['friendshipId'],
				properties: {
					friendshipId: { type: 'integer' }
				}
				}
			}
			}, async (request, reply) => {
			const { friendshipId } = request.body;
			const tokenUser = request.user?.id;

			const friendship = await fastify.db.get(
				`SELECT * FROM friends WHERE id = ?`,
				[friendshipId]
			);

			if (!friendship) {
				return reply.code(404).send({ error: "Friend request not found" });
			}

			if (friendship.player1_id !== tokenUser && friendship.player2_id !== tokenUser) {
				return reply.code(403).send({ error: "Not authorized" });
			}

			if (friendship.status !== "pending") {
				return reply.code(400).send({ error: "Friendship not pending" });
			}

			await fastify.db.run(`DELETE FROM friends WHERE id = ?`, [friendshipId]);

			return { success: true, status: "rejected" };
			});
	
	
	
			// <<<<<<<<<<<<<<                   >>>>>>>>>>>>>>>>	
			// Remove friend
			fastify.post('/friends/remove', {
				preHandler: authenticate,
				schema: {
					body: {
					type: 'object',
					required: ['friendshipId'],
					properties: {
						friendshipId: { type: 'integer' }
					}
					}
				}
				}, async (request, reply) => {
				const { friendshipId } = request.body;
				const tokenUser = request.user?.id;

				// Make sure this friendship exists
				const friendship = await fastify.db.get(
					`SELECT * FROM friends WHERE id = ?`,
					[friendshipId]
				);

				if (!friendship) {
					return reply.code(404).send({ error: "Friendship not found" });
				}

				// Ensure current user is part of this friendship
				if (friendship.player1_id !== tokenUser && friendship.player2_id !== tokenUser) {
					return reply.code(403).send({ error: "Not authorized" });
				}

				if (friendship.status !== "accepted") {
					return reply.code(400).send({ error: "Can only remove accepted friends" });
				}

				await fastify.db.run(`DELETE FROM friends WHERE id = ?`, [friendshipId]);

				return { success: true, status: "removed" };
				});



	}, { prefix: '/profile' });
}
