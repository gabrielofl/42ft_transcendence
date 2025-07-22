import Chart from '@toast-ui/chart';
import '@toast-ui/chart/dist/toastui-chart.min.css';
  

const API_BASE_URL = '/api';

export function renderHistoryTab(matches: any[] = [], loading = false): string {
	if (loading) {
		return `<p class="text-xs text-gray-400">Loading match history...</p>`;
	}

	if (!matches.length) {
		return `<p class="text-gray-400">No recent matches found.</p>`;
	}

	return `
		<h2 class="text-xs font-semibold mb-4">Recent Matches</h2>
		<div class="overflow-y-auto max-h-[60vh] pr-2">
		<ul class="space-y-3">
			${matches.map(m => {
				const date = new Date(m.created_at).toLocaleString();
				const winner =
					m.winner_id === null
						? 'Draw'
						: m.winner_id === 'AI'
						? 'AI'
						: m.winner_id === m.player1_id
						? m.player1_name
						: m.player2_name ?? 'Unknown';

				return `
					<li class="p-3 btn-vs  shadow">
						<div class="text-xs text-gray-400">${m.match_type.toUpperCase()} • ${date}</div>
						<div class="font-semibold">${m.player1_name ?? 'Unknown'} vs ${m.player2_name ?? 'AI / Local'}</div>
						<div class="text-green-400">Winner: ${winner}</div>
					</li>
				`;
			}).join('')}
		</ul>
		</div>
	`;
}

export async function setupHistoryTab() {
	const container = document.getElementById('profile-content');
	if (!container) return;

	container.innerHTML = renderHistoryTab([]);

	try {
		const res = await fetch(`${API_BASE_URL}/profile/match-history`, {
			credentials: 'include',
		});

		if (!res.ok) throw new Error(await res.text());

		const data = await res.json();
		container.innerHTML = renderHistoryTab(data.matchHistory || []);

	} catch (err) {
		console.error('Failed to load match history:', err);
		container.innerHTML = `<p class="text-red-500">Failed to load match history.</p>`;
	}
}

  export function renderAccountTab(): string {
	return `
	  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	  <div>
		<!-- Avatar + Rank -->
		<div class="btn-vs p-4  text-center shadow-lg">
		  <img id="avatar-preview" src="${API_BASE_URL}/avatars/default.jpg" alt="Avatar" class="w-32 h-32 mx-auto rounded-full border-4 border-blue-500 mb-4">
		  <input id="avatar-upload" type="file" accept="image/*" class="mb-2 w-full text-xs text-gray-300" />
		  <div class="text-xs font-bold">Battle Rank <span class="text-yellow-400">6</span></div>
		  <div id="profile-username" class="text-xs font-semibold mt-2">@username</div>
		  <div id="profile-display-name" class="text-xs mt-2">displayname</div>
		  <div id="google-indicator" class="text-xs text-green-400 hidden mt-1">Google Account</div>
		</div>
  
		<!-- Match Stats -->
		<div class="btn-vs p-4  shadow-lg mt-6">
		  <div class="flex items-center justify-between mb-4">
			<h3 class="text-xs font-semibold">Match Stats</h3>
			<button id="edit-profile-btn" title="Edit Info" class="hover:text-yellow-400">
			  <i class="fas fa-cog"></i>
			</button>
		  </div>
		  <p>Wins: <span id="wins-count">0</span></p>
		  <p>Losses: <span id="losses-count">0</span></p>
		  <p>Leaderboard Rank: <span class="text-blue-400">#1482</span></p>
		  <p>Last Login: <span id="last-login">Unknown</span></p>
		</div>
		</div>

		<!-- User Info Edit -->
		<div class="btn-vs p-4  shadow-lg" id="profile-edit-form">
		  <label for="edit-account-header" class="block text-xs font-semibold mb-1">Edit account</label>
		  <div id="display-name-section">
		    <label for="display-name" class="block text-xs mt-4 mb-1">Change Display Name</label>
		    <input id="display-name" type="text" placeholder="New display name" autocomplete="off" class="w-full px-3 py-2  bg-gray-700/50 text-white mb-2" />
		    <button id="update-display-btn" class="w-full btn-profile hover:btn-looser text-white py-2">Update</button>
		 </div> 
		  <div id="password-section">
			<label for="new-password" class="block text-xs mt-4 mb-1">Change Password</label>
			<input id="new-password" type="password" placeholder="New password" class="w-full px-3 py-2  bg-gray-700/50 text-white mb-2" />
			<input id="new-password-repeat" type="password" placeholder="Repeat new password" class="w-full px-3 py-2 bg-gray-700/50 text-white mb-2" />
			<button id="change-password-btn" class="w-full btn-profile hover:btn-looser text-white py-2 ">Update</button>
		  </div>
		  <div id="email-section">
			<label for="new-email" class="block text-xs mt-4 mb-1">Change e-mail</label>
			<input id="new-email" type="text" placeholder="New e-mail" autocomplete="off" class="w-full px-3 py-2  bg-gray-700/50 text-white mb-2" />
			<button id="change-email-btn" class="w-full btn-profile hover:btn-looser text-white py-2 ">Update</button>
		  </div>
		</div>

		<!-- Account Data GDPR -->
		<div class="btn-vs p-4  shadow-lg" id="user-data-form">
		  <label for="account-data" class="block text-xs font-semibold mb-1">Data preferences</label>
		  <div id="download-my-data-section">
			<label for="download-data-word" class="block text-xs mt-4 mb-1">Account data</label>
			<button id="download-data-btn" class="w-full btn-profile hover:btn-looser text-white py-2 ">Download my data</button>
		  </div>
			<!-- Toggle for Data Collection -->
			<div class="flex items-center justify-between mt-4  btn-profile">
				<label for="data-collection-toggle" class="text-xs ml-1">Allow Data Collection</label>
				<input id="data-collection-toggle" type="checkbox" class="toggle-checkbox mr-4">
			</div>

			<!-- Toggle for Data Processing -->
			<div class="flex items-center justify-between mt-4  btn-profile">
				<label for="data-processing-toggle" class="text-xs ml-1">Allow Data Processing</label>
				<input id="data-processing-toggle" type="checkbox" class="toggle-checkbox mr-4">
			</div>

			<!-- Toggle for Data AI Improvement -->
			<div class="flex items-center justify-between mt-4  btn-profile">
				<label for="data-ai-use-toggle" class="text-xs ml-1">My data trains AI opponents</label>
				<input id="data-ai-use-toggle" type="checkbox" class="toggle-checkbox mr-4">
			</div>

			<!-- Toggle for Data Sharing on Leaderboard -->
			<div class="flex items-center justify-between mt-4  btn-profile">
				<label for="data-score-toggle" class="text-xs ml-1">Show my scores publicly</label>
				<input id="data-score-toggle" type="checkbox" class="toggle-checkbox mr-4">
			</div>

		  <div id="delete-my-data-section">
			<label for="delete-data-word" class="block text-xs mt-4 mb-1">Delete my account</label>
			<input id="delete-data-password" type="password" placeholder="Enter password" class="w-full px-3 py-2  bg-gray-700/50 text-white mb-2" />
			<button id="delete-data-btn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 ">Confirm</button>
		  </div>
		</div>
	  </div>
	`;
  }

  export function setupAccountTab(username: string, isGoogle: boolean) {

	const avatarInput = document.getElementById('avatar-upload') as HTMLInputElement | null;
	const displayInput = document.getElementById('display-name') as HTMLInputElement | null;
	const updateBtn = document.getElementById('update-display-btn') as HTMLButtonElement | null;
	const googleIndicator = document.getElementById('google-indicator');
	const passwordSection = document.getElementById('password-section');
	const resultBox = document.getElementById('profile-username');

	if (!resultBox) return;

	resultBox.textContent = '@' + username;

	if (isGoogle) {
		googleIndicator?.classList.remove('hidden');
		passwordSection?.classList.add('hidden');
	}

	fetch(`${API_BASE_URL}/profile`, {
		credentials: 'include', 
	})
		.then(res => res.json())
		.then(data => {
			document.getElementById('profile-display-name')!.textContent = data.display_name;
			// const avatarUrl = `${data.avatar}?t=${Date.now()}`;
			document.getElementById('avatar-preview')?.setAttribute('src', data.avatar);
			document.getElementById('wins-count')!.textContent = data.wins;
			document.getElementById('losses-count')!.textContent = data.losses;
			document.getElementById('last-login')!.textContent = new Date(data.last_login).toLocaleString();
		})
		.catch(err => console.error('Error loading profile:', err));

	avatarInput?.addEventListener('change', async () => {
		const file = avatarInput.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			(document.getElementById('avatar-preview') as HTMLImageElement).src = reader.result as string;
		};
		reader.readAsDataURL(file);

		const formData = new FormData();
		formData.append('file', file);

		const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
			method: 'POST',
			credentials: 'include', 
			body: formData
		});
		const result = await res.json();
		if (!result.success) alert('Avatar upload failed');
	});

	updateBtn?.addEventListener('click', async () => {
		const displayName = displayInput?.value.trim();
		if (!displayName || displayName.length < 2) return alert('Name too short');

		const res = await fetch(`${API_BASE_URL}/profile/display-name`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include', 
			body: JSON.stringify({ displayName }),
		});
		const result = await res.json();
		if (result.success) alert('Profile updated!');
		else alert(result.error || 'Failed to update');
	});

	document.getElementById('change-password-btn')?.addEventListener('click', async () => {
		const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
		if (newPassword.length < 4) return alert('Password too short');

		const currentPassword = prompt('Enter current password:');
		if (!currentPassword) return;

		const res = await fetch(`${API_BASE_URL}/profile/password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include', 
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		const result = await res.json();
		if (result.success) alert('Password changed!');
		else alert(result.error || 'Failed to update password');
	});
}

  export function renderPerformanceTab(): string {
	return `
	  <div class="text-white space-y-6">
		<h2 class="text-2xl font-press font-bold mb-4">Dashboard</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		  <!-- Left Panel: Key Stats -->
		  <div class="bg-indigo-800 p-6  shadow-lg space-y-2">
			<h3 class="text-xs font-semibold text-yellow-400">Match Highlights</h3>
			<p>Missed Balls: <span id="missed-balls" class="font-bold text-red-400">--</span></p>
			<p>Successful Intercepts: <span id="intercepts" class="font-bold text-green-400">--</span></p>
			<p>Longest Rally: <span id="longest-rally" class="font-bold text-blue-400">--</span></p>
			<p>Idle Time: <span id="idle-time" class="font-bold text-gray-300">--</span> sec</p>
		  </div>

		  <!-- Right Panel: Chart Preview -->
		  <div class="bg-indigo-800 p-6  shadow-lg">
			<h3 class="text-xs font-semibold text-yellow-400 mb-2">Match Accuracy</h3>
			<div id="accuracy-chart" class="w-full max-w-sm mx-auto h-[300px]"></div>
		  </div>
		</div>
	  </div>
	`;
}

export async function setupPerformanceTab() {
	try {

		const res = await fetch(`${API_BASE_URL}/profile/ai-stats`, {
			credentials: 'include', 
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Backend error: ${text}`);
		}

		const data = await res.json();

		document.getElementById('missed-balls')!.textContent = data.missed_balls;
		document.getElementById('intercepts')!.textContent = data.intercepts;
		document.getElementById('longest-rally')!.textContent = data.longest_rally;
		document.getElementById('idle-time')!.textContent = data.idle_time;

		const container = document.getElementById('accuracy-chart')!;
		if (!container) {
			console.error("Chart container not found!");
			return;
		}
		container.style.width = '100%';
        container.style.height = '300px';
		container.innerHTML = '';

		const chart = Chart.pieChart({
			el: container,
			data: {
				series: [
					{
						name: 'Intercepts',
						data: data.intercepts,
					},
					{
						name: 'Misses',
						data: data.missed_balls,
					},
				],
			},
			options: {
				chart: {
					responsive: true,
					height: 'auto',
				},
				legend: {
					visible: true, label: {
						fontFamily: 'ui-sans-serif',
						color: '#fff'
					},
				},
				series: {
					doughnutRatio: 0.3,
					colors: ['#0d9488', '#1e3a8a'],
					dataLabels: {
						visible: true,
						useSeriesColor: true,
						fontWeight: 'bold',
						color: '#fff',
					},
				},
				theme: {
					chart: {
						backgroundColor: 'rgba(0, 0, 0, 0)',
					},
					label: {
						color: '#ffffff',
					},
					series: {
						colors: ['#0d9488', '#0a255f'],
					},
					legend: {
						label: {
							color: '#ffffff',
						},
					}
				},
			}
		});
	} catch (err) {
		console.error('Error loading stats:', err);
	}
}

  export function renderPowerupsTab(): string {
	return `
	  <div class="text-white space-y-6">
		<h2 class="text-2xl font-bold mb-4">Powerup Store</h2>

		<div id="powerup-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6">
		  <!-- Filled dynamically -->
		</div>
	  </div>
	`;
}

  export async function setupPowerupsTab() {
	fetch(`${API_BASE_URL}/store/powerups`, {
		credentials: 'include', 
	})
		.then(res => res.json())
		.then(data => {
			const powerups = data.powerups;
			const container = document.getElementById('powerup-grid')!;
			container.innerHTML = powerups.map((p: any) => `
				<div class="bg-indigo-300 p-4 shadow-lg text-center">
					<img src="${p.icon}" alt="${p.name}" class="w-12 h-12 mx-auto mb-2" />
					<h3 class="text-xs font-bold text-black mb-2">${p.name}</h3>
					<p class="text-xs text-indigo-900 mb-2">${p.description}</p>
					<p class="text-indigo-700 font-bold mb-4">$${(p.price / 100).toFixed(2)}</p>
					<button data-id="${p.id}" class="buy-btn bg-blue-600 hover:bg-blue-700 text-black py-2 px-8 ">Buy</button>
				</div>
			`).join('');

			document.querySelectorAll('.buy-btn').forEach(btn => {
				btn.addEventListener('click', async e => {
					const productId = (e.currentTarget as HTMLElement).dataset.id;
					const res = await fetch(`${API_BASE_URL}/store/checkout`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						credentials: 'include', 
						body: JSON.stringify({ productId }),
					});
					const session = await res.json();
					if (session.url) {
						window.location.href = session.url;
					} else {
						alert('Checkout failed');
					}
				});
			});
		})
		.catch(err => console.error('Error loading powerups:', err));
  }

export function renderProfile() {
const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
	<div class="flex p-10 text-white font-press mx-auto shadow-lg min-h-[600px] max-h-[720px] h-full">
		<!-- Sidebar -->
		<div class="w-64 btn-vs flex flex-col p-4 space-y-4">
		  <button class="sidebar-tab text-left px-3 py-2 hover:bg-indigo-700" data-tab="account">Account</button>
		  <button class="sidebar-tab text-left px-3 py-2 hover:bg-indigo-700" data-tab="history">Match History</button>
		  <button class="sidebar-tab text-left px-3 py-2 hover:bg-indigo-700" data-tab="performance">Performance</button>
		  <button class="sidebar-tab text-left px-3 py-2 hover:bg-indigo-700" data-tab="powerups">Powerups</button>
		</div>
  
		<!-- Main Content -->
		<div class="flex-1 p-4 overflow-y-auto" id="profile-content">
		  <!-- Dynamic content will be injected here -->
		</div>
	  </div>
	`;

	setupProfile('alice', false);
}
  
export function setupProfile(username: string, isGoogle: boolean) {
	document.querySelectorAll('.sidebar-tab').forEach(btn => {
		btn.addEventListener('click', async e => {
			const tab = (e.currentTarget as HTMLElement).dataset.tab;
			const container = document.getElementById('profile-content');
			
			document.querySelectorAll('.sidebar-tab').forEach(b =>
				b.classList.remove('bg-[--secondary-color]', 'text-[--primary-color]')
			);

			(e.currentTarget as HTMLElement).classList.add('bg-[--secondary-color]', 'text-[--primary-color]');

			switch (tab) {
				case 'performance':
					container!.innerHTML = renderPerformanceTab();
					await setupPerformanceTab();
					break;
				case 'history':
					await setupHistoryTab()
					break;
				case 'powerups':
					container!.innerHTML = renderPowerupsTab();
					await setupPowerupsTab();
					break;
				default:
					container!.innerHTML = renderAccountTab();
					setupAccountTab(username, isGoogle);
			}
		});
	});
}
  
export const mockMatchHistory = {
  matchHistory: [
    {
      created_at: new Date().toISOString(),
      match_type: 'remote',
      player1_id: 1,
      player2_id: 2,
      player1_name: 'Alice',
      player2_name: 'Bob',
      winner_id: 1,
    },
    {
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      match_type: 'ai',
      player1_id: 3,
      player2_id: 'AI',
      player1_name: 'Charlie',
      player2_name: null,
      winner_id: 'AI',
    },
    {
      created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
      match_type: 'local',
      player1_id: 4,
      player2_id: 5,
      player1_name: 'Dave',
      player2_name: 'Eve',
      winner_id: null,
    },
  ],
};

export const mockAiStats = {
  missed_balls: 12,
  intercepts: 38,
  longest_rally: 19,
  idle_time: 5.2,
};


export const mockPowerups = {
  powerups: [
    {
      id: 'pu1',
      name: 'Speed Boost',
      description: 'Temporarily increases paddle speed.',
      icon: 'https://example.com/icons/speed.png',
      price: 199,
    },
    {
      id: 'pu2',
      name: 'Shrink Opponent',
      description: 'Shrinks opponent’s paddle for 10 seconds.',
      icon: 'https://example.com/icons/shrink.png',
      price: 299,
    },
    {
      id: 'pu3',
      name: 'Curve Ball',
      description: 'Serve a ball that curves mid-flight.',
      icon: 'https://example.com/icons/curve.png',
      price: 249,
    },
  ],
};


export const mockProfile = {
  display_name: 'Alice the Ace',
  avatar: 'https://example.com/avatars/alice.jpg',
  wins: 42,
  losses: 18,
  last_login: new Date().toISOString(),
};


globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  let body: any = null;
  let status = 200;

  if (url.endsWith('/api/profile') && method === 'GET') {
    body = JSON.stringify(mockProfile);
  } else if (url.endsWith('/api/profile/display-name') && method === 'POST') {
    body = JSON.stringify({ success: true });
  } else if (url.endsWith('/api/profile/password') && method === 'POST') {
    body = JSON.stringify({ success: true });
  } else if (url.endsWith('/api/profile/avatar') && method === 'POST') {
    body = JSON.stringify({ success: true });
  } else if (url.includes('/api/match-history')) {
    body = JSON.stringify(mockMatchHistory);
  } else if (url.includes('/api/ai-stats')) {
    body = JSON.stringify(mockAiStats);
  } else if (url.includes('/api/store/powerups')) {
    body = JSON.stringify(mockPowerups);
  } else {
    status = 404;
    body = 'Not found';
  }

  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  setTimeout(() => {
    document.querySelector('[data-tab="account"]')?.dispatchEvent(new Event('click'));
  }, 0);
});

interface PlayerStats {
name: string;
wins: number;
losses: number;
ratio: number;
time: string;
}
const davidStats: PlayerStats = {
name: "David",
wins: 10,
losses: 3,
ratio: 5.0,
time: "12:34"
};

export function renderGameStatsPanel(player: PlayerStats): string {

return `
<div class="bg-gray-300/70 rounded-xl p-4 h-full w-full">
		<h3 class="text-md text-gray-900 font-semibold mb-4">Player Statistics</h3>
		
		<div class="grid grid-cols-2 gap-4 text-sm">
			<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
				<div class="text-2xl font-bold text-green-400">${player.wins}</div>
				<div class="text-white text-xs">Wins</div>
			</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-red-400">${player.losses}</div>
			<div class="text-white text-xs">Losses</div>
		</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-yellow-400">${player.ratio}</div>
			<div class="text-white text-xs">W/L Ratio</div>
		</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-blue-400">${player.time}</div>
			<div class="text-white text-xs">Time played</div>
		</div>
		</div>
	</div>
	`;
}