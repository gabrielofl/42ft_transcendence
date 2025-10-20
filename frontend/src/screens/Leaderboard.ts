import { apiService } from "../services/api.js";
import { initProfileModal, setupProfileLinks } from "./ProfileModal.js";
import { setupPagination } from "./ProfileFriends";
import { UserData } from "@shared/types/messages";

let playersPerPage = 10;
let currentPage = 1;

function formatScore(score: number): string {
	return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function renderPlayersPanel(players: UserData[], currentUserId?: number, page: number = 1, totalPages: number = 1, total: number = 0): string {
	// Players already sorted by score from backend
	return `
		<div class="grid gap-2 box-border px-4 pb-[200px]">
			<h2 class="block txt-subtitle text-center color-primary p-4">Leaderboard</h2>
			
			<!-- Pagination controls -->
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
				<button id="prev-btn" class="col-start-1 md:col-start-2 btn-disabled w-full">Prev Page</button>
				<button id="next-btn" class="col-start-2 md:col-start-3 btn-primary w-full">Next Page</button>
			</div>
			
			<!-- Page info -->
			<p id="page-info" class="block txt-subheading text-center pb-4">
				Page: ${page} / ${totalPages} | Total Players: ${total}
			</p>
			
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
						const winRate = player.matches > 0 ? ((player.wins / player.matches) * 100).toFixed(2) : '0.0';
						const isCurrentUser = currentUserId && player.id === currentUserId;
						
						const globalRank = (page - 1) * playersPerPage + index + 1;
						
						const highlightStyle = isCurrentUser ? 'style="background-color: rgba(255, 255, 150, 0.25);"' : '';
						const boldClass = (globalRank === 1 || isCurrentUser) ? 'font-bold' : '';
						
						const statusIndicator = player.status === 1 ? '🟢 ' : '⚫ ';
						const crownIndicator = globalRank === 1 ? '⭐ ' : '';
						
						return `
						<!-- Row ${index + 1} -->
						<div class="td ${boldClass}" ${highlightStyle}>#${globalRank}</div>
						<div class="td ${boldClass}" ${highlightStyle} style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
							${statusIndicator}${crownIndicator}<a href="#" class="open-profile" data-user="${player.username}">
								<span class="font-bold text-white hover:text-yellow-400 transition-colors">${player.username}</span>
							</a>
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

	await loadLeaderboard(1);
}

async function loadLeaderboard(page: number): Promise<void> {
	const main = document.getElementById('main');
	if (!main) return;

	try {
		const offset = (page - 1) * playersPerPage;
		const data = await apiService.getLeaderboard(playersPerPage, offset);
		
		let currentUserId: number | undefined;
		try {
			const currentUser = await apiService.getProfile();
			currentUserId = currentUser.id;
		} catch (error) {
			console.log('Could not fetch current user, continuing without highlighting');
		}
		
		currentPage = data.page;
		
		main.innerHTML = renderPlayersPanel(
			data.users, 
			currentUserId, 
			data.page, 
			data.totalPages, 
			data.total
		);
		
		setupLeaderboardPagination(data.page, data.totalPages);
		initProfileModal();
		setupProfileLinks();
	} catch (error) {
		console.error('Error loading leaderboard:', error);
		main.innerHTML = `
			<div class="grid gap-2 box-border px-4">
				<h2 class="block txt-subtitle text-center color-primary p-4">Leaderboard</h2>
				<div class="text-center text-red-400 py-4">
					Error loading leaderboard. Please try again later.
				</div>
			</div>
		`;
	}
}

function setupLeaderboardPagination(page: number, totalPages: number): void {
	const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
	const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;

	setupPagination(prevBtn, nextBtn, page, totalPages, (newPage) => {
		loadLeaderboard(newPage);
	});
}

export function setupLeaderboard() {
}
