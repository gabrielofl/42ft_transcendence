import profilePerformance from "./profile-performance.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { API_BASE_URL } from "./config";


export function renderPerformanceTab() {
	const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profilePerformance, {API_BASE_URL});
		setupPerformanceTab();
	} catch (err) {
    console.error("Failed to load performance:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load performance tab.</p>`;
  	}
}

export async function setupPerformanceTab() {
	try {
		const res = await fetch(`${API_BASE_URL}/users/me`, {
			credentials: 'include',
			headers: {
				'Authorization': `Bearer ${localStorage.getItem('token')}`
			}
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Backend error: ${text}`);
		}
	    const data = await res.json();

		loadUserStats(data.username);
		loadUserGameStats(data.id);
		const scoreTitle = document.getElementById('score-ranking-title')!;
		if (scoreTitle) {
			let rankingPos = data.ranking | 0;
			scoreTitle.textContent = `${data.score} Pts | Top ranking #${rankingPos}`;
		}
		
	} catch (err) {
		console.error('Error loading stats:', err);
	}
}


export async function loadUserStats(username: string | number) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/username?username=${encodeURIComponent(username)}`, {
      credentials: "include",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
if (!res.ok) throw new Error(`Failed to fetch profile for ${username}`);
    const data = await res.json();

    // Update DOM
    const profileScore = document.getElementById("profile-score");
	const statMatches = document.getElementById("stat-matches");
	const statWins = document.getElementById("stat-wins");
	const statLosses = document.getElementById("stat-losses");
	const statWinRate = document.getElementById("stat-winrate");
	const statMaxScore = document.getElementById("stat-maxscore");

    if (profileScore)
		profileScore.textContent = data.score ? `${data.score} pts` : `0 pts`;
	if (statMatches && statWins && statLosses && statMaxScore && statWinRate)
	{
		statMatches.textContent = data.matches ?? 0;
		statWins.textContent = data.wins ?? 0;
		statLosses.textContent = data.losses ?? 0;
		statMaxScore.textContent = data.max_score ?? 0;
		const totalGames = data.wins + data.losses;
		const winRate = totalGames > 0 ? (data.wins / totalGames) * 100 : 0;
		statWinRate.textContent = `${winRate.toFixed(2)}%`;
	}
  } catch (err) {
    console.error("Error loading game stats:", err);
  }
}

export async function loadUserGameStats(userId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/profile/games/stats/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch stats");

    const stats = await res.json();

    // Update DOM
    const topVictimCell = document.getElementById("top-victim");
    const winsVictimCell = document.getElementById("wins-victim");
    const strongestOppCell = document.getElementById("strongest-opp");
    const lossesOppCell = document.getElementById("losses-opp");

    if (stats.topVictim) {
      topVictimCell!.textContent = stats.topVictim.user.username;
      winsVictimCell!.textContent = stats.topVictim.wins.toString();
    } else {
      topVictimCell!.textContent = "-";
      winsVictimCell!.textContent = "0";
    }

    if (stats.strongestOpponent) {
      strongestOppCell!.textContent = stats.strongestOpponent.user.username;
      lossesOppCell!.textContent = stats.strongestOpponent.losses.toString();
    } else {
      strongestOppCell!.textContent = "-";
      lossesOppCell!.textContent = "0";
    }
  } catch (err) {
    console.error("Error loading game stats:", err);
  }
}

