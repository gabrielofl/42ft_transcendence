import { apiService } from "../services/api.js";
import { initProfileModal, setupProfileLinks } from "./ProfileModal.js";

interface Player {
	id: number;
	username: string;
	score: number;
	max_score: number;
	wins: number;
	losses: number;
	matches: number;
	status: number; // 0 = offline, 1 = online
	avatar?: string;
}

function formatScore(score: number): string {
	return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function renderPlayersPanel(players: Player[], currentUserId?: number): string {
	// Players already sorted by score from backend
	return `
		<div class="grid gap-2 box-border px-4 pb-[200px]">
			<h2 class="block txt-subtitle text-center color-primary p-4">Leaderboard</h2>
			${players.length === 0 ? `
				<div class="text-center text-gray-400 py-4">
					No players yet
				</div>
			` : `
				<!-- Header Row -->
				<div class="grid grid-cols-7 score-table">
					<div class="th">Rank</div>
					<div class="th">Player</div>
					<div class="th">Score</div>
					<div class="th">Matches</div>
					<div class="th">Wins</div>
					<div class="th">Losses</div>
					<div class="th">Win Rate</div>
					
					${players.map((player, index) => {
						// Calculate win rate
						const winRate = player.matches > 0 ? ((player.wins / player.matches) * 100).toFixed(2) : '0.0';
						const isCurrentUser = currentUserId && player.id === currentUserId;
						
						const highlightStyle = isCurrentUser ? 'style="background-color: rgba(255, 255, 150, 0.25);"' : '';
						const boldClass = (index === 0 || isCurrentUser) ? 'font-bold' : '';
						
						return `
						<!-- Row ${index + 1} -->
						<div class="td ${boldClass}" ${highlightStyle}>#${index + 1}</div>
						<div class="td ${boldClass}" ${highlightStyle} style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
							${index === 0 ? '⭐ ' : ''}
							<a href="#" class="open-profile" data-user="${player.username}">
								<span class="font-bold text-white hover:text-yellow-400 transition-colors">${player.username}</span>
							</a>
							${player.status === 1 ? ' 🟢' : ''}
						</div>
						<div class="td ${boldClass}" ${highlightStyle}>${formatScore(player.score)}</div>
						<div class="td ${boldClass}" ${highlightStyle}>${player.matches || 0}</div>
						<div class="td ${boldClass}" ${highlightStyle}>${player.wins || 0}</div>
						<div class="td ${boldClass}" ${highlightStyle}>${player.losses || 0}</div>
						<div class="td ${boldClass}" ${highlightStyle}>${winRate}%</div>
						`;
					}).join('')}
				</div>
			`}
		</div>
	`;
}

export async function renderLeaderboard(): Promise<void> {
	const main = document.getElementById('main');
	if (!main) return;

	try {
		// Fetch leaderboard data from API
		// const players = await apiService.getLeaderboard(10); // Get top 10 players
		const players = await apiService.getLeaderboard(); // Get all users (no limit parameter)
		
		// Get current user ID
		let currentUserId: number | undefined;
		try {
			const currentUser = await apiService.getProfile();
			currentUserId = currentUser.id;
		} catch (error) {
			console.log('Could not fetch current user, continuing without highlighting');
		}
		
		main.innerHTML += `
			${renderPlayersPanel(players, currentUserId)}
		`;
		setupLeaderboard();
		initProfileModal();
		setupProfileLinks();
	} catch (error) {
		console.error('Error loading leaderboard:', error);
		main.innerHTML += `
			<div class="grid gap-2 box-border px-4">
				<h2 class="block txt-subtitle text-center color-primary p-4">Leaderboard</h2>
				<div class="text-center text-red-400 py-4">
					Error loading leaderboard. Please try again later.
				</div>
			</div>
		`;
	}
}

export function setupLeaderboard() {

}
