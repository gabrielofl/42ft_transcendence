// import Chart from '@toast-ui/chart';
// import '@toast-ui/chart/dist/toastui-chart.min.css';
// import Chart from 'chart.js/auto'
import sidebar from "../components/profile-sidebar.html?raw";
import { apiService } from '../services/api.js';

import profileAccount from "./profile-account.html?raw";
import { setupHistoryTab } from "./ProfileHistory";
import profilePerformance from "./profile-performance.html?raw";
import setupFriendModal from './modal-friends.html?raw';

import { setupProfileSidebar } from '../components/profile-sidebar';
import { AppStore } from '../redux/AppStore';
import { updateLangue } from '../redux/reducers/langueReducer';
import { replaceTemplatePlaceholders } from "./utils";
import { API_BASE_URL } from "./config";
// const API_BASE_URL = 'https://localhost:4444/api'; //Work on cluster
// const API_BASE_URL = 'https://localhost:443/api';


export function renderAccountTab() {

		const container = document.getElementById('profile-content');
		if (!container) return ;

		container.innerHTML = replaceTemplatePlaceholders(profileAccount, {API_BASE_URL});
		setupAccountTab();
  }

  export function setupAccountTab() {

	const usernameInput = document.getElementById('username') as HTMLInputElement | null;
	const updateUsernameBtn = document.getElementById('update-username-btn') as HTMLButtonElement | null;
	const googleIndicator = document.getElementById('google-indicator');
	const passwordSection = document.getElementById('password-section');
	// const resultBox = document.getElementById('profile-username');

	
	

	fetch(`${API_BASE_URL}/users/me`, {
		credentials: 'include',
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token')}`
		}
	})
		.then(res => res.json())
		.then(data => {
			const profileUsername = document.getElementById('profile-username');
			const profileName = document.getElementById('profile-display-name');
			if (!profileUsername || !profileName) return;
			
			profileName.textContent = data.first_name + ' ' + data.last_name;
			profileUsername.textContent = '@' + data.username;
			
			// Update 2FA status if available
			if (data.twoFactorEnabled !== undefined) {
				update2FAStatus(data.twoFactorEnabled);
			}
			document.getElementById('name')?.setAttribute('placeholder', data.first_name);
			document.getElementById('lastname')?.setAttribute('placeholder', data.last_name);
			document.getElementById('username')?.setAttribute('placeholder', data.username);
			document.getElementById('email')?.setAttribute('placeholder', data.email);

			// if (isGoogle) {
			// 	googleIndicator?.classList.remove('hidden');
			// 	passwordSection?.classList.add('hidden');
			// }


			// document.getElementById('wins-count')!.textContent = data.wins;
			// document.getElementById('losses-count')!.textContent = data.losses;
			// document.getElementById('last-login')!.textContent = new Date(data.last_login).toLocaleString();
			
		})
		.catch(err => console.error('Error loading profile:', err));


	updateUsernameBtn?.addEventListener('click', async () => {
		const username = usernameInput?.value.trim();
		if (!username || username.length < 2) return alert('Name too short');

		const res = await fetch(`${API_BASE_URL}/users/me`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${localStorage.getItem('token')}`
			},
			credentials: 'include', 
			body: JSON.stringify({ username }),
		});

		if (!res.ok)
			alert('Failed to update');
		else
			renderAccountTab();
		// const result = await res.json();
		// result.error.code 
		// if (result.success) alert('Profile updated!');
		// else alert(result.error || 'Failed to update');
	});


	//AAAAAAAAAAAAAAAAAA
	document.getElementById('update-password-btn')?.addEventListener('click', async () => {
		const password = (document.getElementById('password') as HTMLInputElement).value;
		const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
		// const rePassword = (document.getElementById('re-password') as HTMLInputElement).value;
		if (newPassword.length < 4) return alert('Password too short');

		// const currentPassword = prompt('Enter current password:');
		// if (!currentPassword) return;

		const res = await fetch(`${API_BASE_URL}/profile/password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include', 
			body: JSON.stringify({ password, newPassword }),
		});
		const result = await res.json();
		if (result.success) alert('Password changed!');
		else alert(result.error || 'Failed to update password');
	});

	// 2FA Event Listeners
	document.getElementById('setup-2fa-btn')?.addEventListener('click', async () => {
		try {
			const data = await apiService.setup2FA();
			console.log(data);
			if (data.success || data.qrCode) {
				// Show QR code in a modal/popup
				const qrModal = `
					<div id="qr-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div class="retro-modal w-3/5 text-center">
							<h3 class="block txt-subtitle color-text-light ">Set up Two-Factor Authentication</h3>
							<p class="txt-subheading color-secondary my-4">Scan this QR code with your authenticator app:</p>
							<div class="flex justify-center py-9 mb-4 ">
								<img src="${data.qrCode}" alt="QR Code" class="border border-white rounded">
							</div>
							<input id="verify-2fa-code" type="text" placeholder="Enter 6-digit code" 
								class="w-full retro-input mb-4">
							<div class="flex gap-2">
								<button id="verify-2fa-btn" class="btn-primary w-1/2">
									Enable 2FA
								</button>
								<button id="cancel-2fa-btn" class="btn-secondary w-1/2">
									Cancel
								</button>
							</div>
						</div>
					</div>
				`;
		
				document.body.insertAdjacentHTML('beforeend', qrModal);
				
				// Add event listeners for the modal
				document.getElementById('verify-2fa-btn')?.addEventListener('click', async () => {
					const code = (document.getElementById('verify-2fa-code') as HTMLInputElement)?.value;
					if (!code || code.length !== 6) {
						alert('Please enter a valid 6-digit code');
						return;
					}
					
					const verifyData = await apiService.verify2FA({ token: code });
					
					if (verifyData.success) {
						// Remove QR modal first
						document.getElementById('qr-modal')?.remove();
						
						// Show backup codes if available
						if (verifyData.backupCodes && verifyData.backupCodes.length > 0) {
							const backupCodesModal = `
								<div id="backup-codes-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
									<div class="retro-modal w-3/5 text-center">
										<h3 class="block txt-subtitle color-text-light">🎉 2FA Enabled Successfully!</h3>
										<p class="txt-subheading color-secondary my-4">Save these backup codes in a safe place. You can use them to log in if you lose access to your authenticator app:</p>
										<div class=" bg-gray-900 p-4 rounded mb-4 overflow-y-auto">
										
										<caption class="caption-bottom">⚠️ These codes can only be used once each. Keep them secure! </caption>
											 <div class="grid grid-cols-2  score-table ">
													${verifyData.backupCodes.map(code => `<div class="td" >${code}</div>`).join('')}
											</div>	
											

										</div>
										<div class="flex gap-2 mb-4">
											<button id="copy-codes-btn" class="btn-primary w-1/2">
												📋 Copy All
											</button>
											<button id="download-codes-btn" class="btn-primary w-1/2">
												💾 Download
											</button>
										</div>
										<button id="backup-codes-ok-btn" class="w-full btn-secondary">
											I've Saved My Backup Codes
										</button>
							</div>
								</div>
							`;
							document.body.insertAdjacentHTML('beforeend', backupCodesModal);
							
							// Copy button functionality
							document.getElementById('copy-codes-btn')?.addEventListener('click', async () => {
								const codesText = verifyData.backupCodes.join('\n');
								try {
									await navigator.clipboard.writeText(codesText);
									const btn = document.getElementById('copy-codes-btn');
									const originalText = btn?.textContent;
									if (btn) {
										btn.textContent = 'Copied!';
										btn.className = 'btn-success w-1/2';
										setTimeout(() => {
											btn.textContent = originalText;
											btn.className = 'btn-primary w-1/2';
										}, 2000);
									}
								} catch (err) {
									alert('Failed to copy codes to clipboard');
								}
							});

							// Download button functionality
							document.getElementById('download-codes-btn')?.addEventListener('click', () => {
								const codesText = `Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

⚠️ IMPORTANT: Keep these codes secure and private!
Each code can only be used once to log in if you lose access to your authenticator app.

Backup Codes:
${verifyData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Store these codes in a safe place such as:
- A password manager
- A secure notes app
- Print and store in a safe location

Do NOT share these codes with anyone.`;

								const blob = new Blob([codesText], { type: 'text/plain' });
								const url = URL.createObjectURL(blob);
								const a = document.createElement('a');
								a.href = url;
								a.download = `2FA-Backup-Codes-${new Date().toISOString().split('T')[0]}.txt`;
								document.body.appendChild(a);
								a.click();
								document.body.removeChild(a);
								URL.revokeObjectURL(url);

								// Update button to show success
								const btn = document.getElementById('download-codes-btn');
								const originalText = btn?.textContent;
								if (btn) {
									btn.textContent = 'Downloaded!';
									btn.className = 'btn-success w-1/2';
									setTimeout(() => {
										btn.textContent = originalText;
										btn.className = 'btn-primary w-1/2';
									}, 2000);
								}
							});
							
							document.getElementById('backup-codes-ok-btn')?.addEventListener('click', () => {
								document.getElementById('backup-codes-modal')?.remove();
								update2FAStatus(true);
							});
						} else {
							alert('2FA enabled successfully!');
							update2FAStatus(true);
						}
					} else {
						alert(verifyData.error || 'Invalid code');
					}
				});
				
				document.getElementById('cancel-2fa-btn')?.addEventListener('click', () => {
					document.getElementById('qr-modal')?.remove();
				});
			} else {
				alert(data.error || '2FA setup failed');
			}
		} catch (error) {
			console.error('2FA setup error:', error);
			alert('Failed to set up 2FA');
		}
	});

	document.getElementById('disable-2fa-btn')?.addEventListener('click', async () => {
		const password = prompt('Enter your password to disable 2FA:');
		if (!password) return;
		
		try {
			// Note: The API service doesn't have a disable2FA method, so we'll use direct fetch with proper auth
			const token = localStorage.getItem('token');
			const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				credentials: 'include',
				body: JSON.stringify({ password })
			});
			const data = await response.json();
			
			if (data.success) {
				alert('2FA disabled successfully!');
				update2FAStatus(false);
			} else {
				alert(data.error || 'Failed to disable 2FA');
			}
		} catch (error) {
			console.error('2FA disable error:', error);
			alert('Failed to disable 2FA');
		}
	});
}



  
// Helper function to update 2FA UI status
function update2FAStatus(enabled: boolean) {
	const statusEl = document.getElementById('twofa-status');
	const enableBtn = document.getElementById('setup-2fa-btn');
	const disableBtn = document.getElementById('disable-2fa-btn');
	
	if (statusEl) {
		statusEl.textContent = enabled ? '2FA is currently enabled' : '2FA is currently disabled';
		statusEl.className = enabled ? 'txt-body-small mb-2 color-success' : 'txt-body-small mb-2 color-warning';
	}
	
	if (enableBtn) {
		enableBtn.style.display = enabled ? 'none' : 'block';
	}
	
	if (disableBtn) {
		disableBtn.style.display = enabled ? 'block' : 'none';
	}
}

  export function renderPerformanceTab(): string {
	const rendered = replaceTemplatePlaceholders(profilePerformance, {API_BASE_URL});
	return rendered;
}

export async function setupPerformanceTab() {
	try {

		// const res = await fetch(`${API_BASE_URL}/profile/ai-stats`, {
		// 	credentials: 'include', 
		// });
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

		const container = document.getElementById('accuracy-chart')!;
		if (!container) {
			console.error("Chart container not found!");
			return;
		}
		container.style.width = '100%';
		container.style.height = '500px';
		container.innerHTML = '';

		// const data = await res.json();


// tui.chart
// const data = {
//  categories: ['Wins', 'Losses', 'Rate', 'Matches', 'Time', 'Max Score'],
// 			series: [
// 			{
// 				name: 'This Month',
// 				data: [50, 30, 50, 70, 60, 40],
// 			},
// 			],
// };

// const myRadarTheme = {
//   series: {
//     colors: ['#FF6347']  // customize main color(s)
//   }
  
// };

// // register the theme
// // Chart.registerTheme('myRadarTheme', myRadarTheme);

// const options = {
//   chart: {
//     width: 500,
//     height: 400,
//   },
//   theme: 'myRadarTheme',
//   legend: {
//     visible: false, // hide legend
//   },
  
// };

// // // // create the radar chart
// const chart = new Chart.RadarChart({
//   el: container, // ✅ matches your "accuracy-chart"
//   data,
//   options,
// });


// Chart.js

// const data = {
//   labels: [
//     'Eating',
//     'Drinking',
//     'Sleeping',
//     'Designing',
//     'Coding',
//     'Cycling',
//     'Running'
//   ],
//   datasets: [{
//     label: 'My First Dataset',
//     data: [65, 59, 90, 81, 56, 55, 40],
//     fill: true,
//     backgroundColor: 'rgba(255, 99, 132, 0.2)',
//     borderColor: 'rgb(255, 99, 132)',
//     pointBackgroundColor: 'rgb(255, 99, 132)',
//     pointBorderColor: '#fff',
//     pointHoverBackgroundColor: '#fff',
//     pointHoverBorderColor: 'rgb(255, 99, 132)'
//   }, {
//     label: 'My Second Dataset',
//     data: [28, 48, 40, 19, 96, 27, 100],
//     fill: true,
//     backgroundColor: 'rgba(54, 162, 235, 0.2)',
//     borderColor: 'rgb(54, 162, 235)',
//     pointBackgroundColor: 'rgb(54, 162, 235)',
//     pointBorderColor: '#fff',
//     pointHoverBackgroundColor: '#fff',
//     pointHoverBorderColor: 'rgb(54, 162, 235)'
//   }]
// };

// const config = {
//   type: 'radar',
//   data: data,
//   options: {
//     elements: {
//       line: {
//         borderWidth: 3
//       }
//     }
//   },
// };

//  new Chart(
//     document.getElementById('accuracy-chart'),
//     {
//         type: 'radar',
// 		data: data,
// 		options: {
// 			elements: {
// 			line: {
// 				borderWidth: 3
// 			}
// 			}
// 		},
//     }
//   );

// (async function() {
//   const data = [
//     { year: 2010, count: 10 },
//     { year: 2011, count: 20 },
//     { year: 2012, count: 15 },
//     { year: 2013, count: 25 },
//     { year: 2014, count: 22 },
//     { year: 2015, count: 30 },
//     { year: 2016, count: 28 },
//   ];

//   new Chart(
//     document.getElementById('accuracy-chart'),
//     {
//       type: 'bar',
//       data: {
//         labels: data.map(row => row.year),
//         datasets: [
//           {
//             label: 'Acquisitions by year',
//             data: data.map(row => row.count)
//           }
//         ]
//       }
//     }
//   );
// })();

 

 







	 // tui.chart
		
	// const chart = Chart.radarChart({
	// 	el: container,
	// 	data: {
	// 		categories: ['Wins', 'Losses', 'Rate', 'Matches', 'Time', 'Max Score'],
	// 		series: [
	// 		{
	// 			name: 'This Month',
	// 			data: [50, 30, 50, 70, 60, 40],
	// 		},
	// 		],
	// 	},
	// 	options: {
	// 		theme: {
	// 			chart: {
	// 								backgroundColor: 'rgba(0, 0, 0, 0)',
	// 							},
	// 			plot: {
	// 				lineColor: '#fffcf2',   // background grid lines
	// 				lineWidth: 2,
	// 				backgroundColor:'rgba(0, 80, 180, 0.1)'
	// 			},
	// 			circularAxis: {
	// 				label: {
	// 				color: '#ffff66',     // category labels color
	// 				},
	// 				lineColor: '#fffcf2',   // circular lines (outer rings)
	// 			},
	// 			radialAxis: {
	// 				label: {
	// 				color: '#ffff66',     // angle axis labels (if shown)
	// 				},
	// 				lineColor: '#fffcf2',   // radial lines
	// 			},
	// 			series: {
	// 				colors: ['#ff00ff'],    // radar shape color
	// 				areaOpacity: 0.5,       // semi-transparent fill
	// 				lineWidth: 3,
	// 				dot: {
	// 				radius: 4,
	// 				color: '#ff00ff',
	// 				},
	// 			},
	// 		},
	// 		legend: {
	// 		visible: false,
	// 		},
	// 	},
	// 	});
	} catch (err) {
		console.error('Error loading stats:', err);
	}
}

  export function renderFriendsTab(): string {
	return `
	  <div class="text-white space-y-6">
		<h2 class="text-2xl font-bold mb-4">Powerup Store</h2>

		<div id="powerup-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6">
		  <!-- Filled dynamically -->
		</div>
	  </div>
	`;
}

  export async function setupFriendsTab() {
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
		${sidebar}
  
		<!-- Main Content -->
		<div class="flex-1 px-4 h-9/10" id="profile-content">
		  <!-- Dynamic content will be injected here -->
		</div>
	  </div>
	`;
	// API to DB or cookie
	// setupProfile('alice', false);
	setupProfileSidebar();
	setTimeout(() => {
    document.querySelector('[data-tab="account"]')?.dispatchEvent(new Event('click'));
  	}, 0);

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


// export const mockProfile = {
//   display_name: 'Alice the Ace',
//   avatar: 'https://example.com/avatars/alice.jpg',
//   wins: 42,
//   losses: 18,
//   last_login: new Date().toISOString(),
// };

// export const mockProfile = {
//   name: 'David',
//   lastname: 'Aviles',
//   username: 'daviles-',
//   email: 'dm.daviles@gmail.com',
//   password: 'lalalala',
//   avatar: 'https://www.shutterstock.com/image-vector/duck-head-vector-illustration-design-600nw-2399558539.jpg',
//   wins: 42,
//   losses: 18,
//   last_login: new Date().toISOString(),
// };


// globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
//   const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
//   const method = init?.method || 'GET';
//   let body: any = null;
//   let status = 200;

//   if (url.endsWith('/api/profile') && method === 'GET') {
//     body = JSON.stringify(mockProfile);
//   } else if (url.endsWith('/api/profile/display-name') && method === 'POST') {
//     body = JSON.stringify({ success: true });
//   } else if (url.endsWith('/api/profile/password') && method === 'POST') {
//     body = JSON.stringify({ success: true });
//   } else if (url.endsWith('/api/profile/avatar') && method === 'POST') {
//     body = JSON.stringify({ success: true });
//   } else if (url.includes('/api/match-history')) {
//     body = JSON.stringify(mockMatchHistory);
//   } else if (url.includes('/api/ai-stats')) {
//     body = JSON.stringify(mockAiStats);
//   } else if (url.includes('/api/store/powerups')) {
//     body = JSON.stringify(mockPowerups);
//   } else {
//     status = 404;
//     body = 'Not found';
//   }

//   return new Response(body, {
//     status,
//     headers: { 'Content-Type': 'application/json' },
//   });
// };

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