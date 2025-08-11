import Chart from '@toast-ui/chart';
import '@toast-ui/chart/dist/toastui-chart.min.css';
import { apiService } from '../services/api.js';
  

const API_BASE_URL = 'https://localhost:443/api';

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

// New account


  export function renderAccountTab(): string {
	return `
	  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	  <div class="box-border ">
		<!-- Avatar + Rank -->
		<div class="flex items-center grid grid-cols-2 p-4  text-center shadow-lg">
		  <div class="block w-32 h-32 mx-auto rounded-full ">
				<label for="avatar-upload" class="overlay rounded-full">
				<svg class="plus" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
					<path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
				</svg>
				</label>
			<img id="avatar-preview" src="${API_BASE_URL}/avatars/default.jpg"  class="w-32 h-32 mx-auto rounded-full border-4 border-blue-500 mb-4 ">
		  	<input id="avatar-upload" type="file" accept="image/*" style="display:none" class="mb-2 w-full text-xs text-gray-300 plus" />
			</div>
		<div class="text-left">
		<div id="profile-username" class="text-s mt-2 uppercase">username</div>
			<div class="text-xs font-bold text-red-400">1526 Pts</div>
			<div class="text-xs font-bold">Battle Rank <span class="text-yellow-400">6</span></div>
			<div id="profile-display-name" class="text-xs mt-2">displayname</div>
			<div id="google-indicator" class="text-xs text-green-400 hidden mt-1">Google Account</div>
		</div>
		</div>
  
		<!-- Match Stats -->
		<div class=" p-4  shadow-lg mt-6">
		  <div class="block mb-4">
			<span class="color-primary body-base">Two-factor authentication</span>
			<button id="edit-profile-btn" title="Edit Info" class="hover:text-yellow-400">
			  <i class="fas fa-cog">asd</i>
			</button>
		  </div>
		  <p>Wins: <span id="wins-count">0</span></p>
		  <p>Losses: <span id="losses-count">0</span></p>
		  <p>Leaderboard Rank: <span class="text-blue-400">#1482</span></p>
		  <p>Last Login: <span id="last-login">Unknown</span></p>
		</div>
		</div>

		<!-- User Info Edit -->
		<div class="box-border p-4  shadow-lg" id="profile-edit-form">
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
		  

		  <!-- ESTO LO HIZO MIGUMORE PARA PODER PROBAR, CAMBIARLO POR EL DISEÑO QUE CORRESPONE -->
		  <!-- Two-Factor Authentication Section -->
		  <div id="twofa-section">
			<label for="twofa-setup" class="block text-xs mt-4 mb-1">Two-Factor Authentication</label>
			<div id="twofa-status" class="text-xs mb-2 text-gray-300">2FA is currently disabled</div>
			<button id="setup-2fa-btn" class="w-full btn-profile hover:btn-looser text-white py-2 mb-2">Enable 2FA</button>
			<button id="disable-2fa-btn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 hidden">Disable 2FA</button>
		  </div>

<!-- ********************************************************************************************* -->


		</div>

		<!-- Account Data GDPR -->
		<div class="box-border p-4  shadow-lg" id="user-data-form">
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

	fetch(`${API_BASE_URL}/users/me`, {
		credentials: 'include',
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token')}`
		}
	})
		.then(res => res.json())
		.then(data => {
			document.getElementById('profile-display-name')!.textContent = data.display_name;
			// const avatarUrl = `${data.avatar}?t=${Date.now()}`;
			document.getElementById('avatar-preview')?.setAttribute('src', data.avatar);
			document.getElementById('wins-count')!.textContent = data.wins;
			document.getElementById('losses-count')!.textContent = data.losses;
			document.getElementById('last-login')!.textContent = new Date(data.last_login).toLocaleString();
			
			// Update 2FA status if available
			if (data.twoFactorEnabled !== undefined) {
				update2FAStatus(data.twoFactorEnabled);
			}
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

	// 2FA Event Listeners
	document.getElementById('setup-2fa-btn')?.addEventListener('click', async () => {
		try {
			const data = await apiService.setup2FA();
			
			if (data.success || data.qrCode) {
				// Show QR code in a modal/popup
				const qrModal = `
					<div id="qr-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div class="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
							<h3 class="text-lg font-bold text-white mb-4">Set up Two-Factor Authentication</h3>
							<p class="text-gray-300 text-sm mb-4">Scan this QR code with your authenticator app:</p>
							<div class="flex justify-center mb-4">
								<img src="${data.qrCode}" alt="QR Code" class="border border-white rounded">
							</div>
							<input id="verify-2fa-code" type="text" placeholder="Enter 6-digit code" 
								class="w-full px-3 py-2 bg-gray-700 text-white rounded mb-4">
							<div class="flex gap-2">
								<button id="verify-2fa-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded">
									Enable 2FA
								</button>
								<button id="cancel-2fa-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded">
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
									<div class="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
										<h3 class="text-lg font-bold text-white mb-4">🎉 2FA Enabled Successfully!</h3>
										<p class="text-gray-300 text-sm mb-4">Save these backup codes in a safe place. You can use them to log in if you lose access to your authenticator app:</p>
										<div class="bg-gray-900 p-4 rounded mb-4 max-h-40 overflow-y-auto">
											<div class="grid grid-cols-2 gap-2 text-sm font-mono text-white">
												${verifyData.backupCodes.map(code => `<div class="p-1 bg-gray-700 rounded text-center">${code}</div>`).join('')}
											</div>
										</div>
										<p class="text-yellow-400 text-xs mb-4">⚠️ These codes can only be used once each. Keep them secure!</p>
										<div class="flex gap-2 mb-4">
											<button id="copy-codes-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm">
												📋 Copy All
											</button>
											<button id="download-codes-btn" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm">
												💾 Download
											</button>
										</div>
										<button id="backup-codes-ok-btn" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded">
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
										btn.textContent = '✅ Copied!';
										btn.className = 'flex-1 bg-green-600 text-white py-2 rounded text-sm';
										setTimeout(() => {
											btn.textContent = originalText;
											btn.className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm';
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
									btn.textContent = '✅ Downloaded!';
									btn.className = 'flex-1 bg-green-600 text-white py-2 rounded text-sm';
									setTimeout(() => {
										btn.textContent = originalText;
										btn.className = 'flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm';
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



// OLD Account

  export function renderOldAccountTab(): string {
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
		  

		  <!-- ESTO LO HIZO MIGUMORE PARA PODER PROBAR, CAMBIARLO POR EL DISEÑO QUE CORRESPONE -->
		  <!-- Two-Factor Authentication Section -->
		  <div id="twofa-section">
			<label for="twofa-setup" class="block text-xs mt-4 mb-1">Two-Factor Authentication</label>
			<div id="twofa-status" class="text-xs mb-2 text-gray-300">2FA is currently disabled</div>
			<button id="setup-2fa-btn" class="w-full btn-profile hover:btn-looser text-white py-2 mb-2">Enable 2FA</button>
			<button id="disable-2fa-btn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 hidden">Disable 2FA</button>
		  </div>

<!-- ********************************************************************************************* -->


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

  export function setupOldAccountTab(username: string, isGoogle: boolean) {

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

	fetch(`${API_BASE_URL}/users/me`, {
		credentials: 'include',
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token')}`
		}
	})
		.then(res => res.json())
		.then(data => {
			document.getElementById('profile-display-name')!.textContent = data.display_name;
			// const avatarUrl = `${data.avatar}?t=${Date.now()}`;
			document.getElementById('avatar-preview')?.setAttribute('src', data.avatar);
			document.getElementById('wins-count')!.textContent = data.wins;
			document.getElementById('losses-count')!.textContent = data.losses;
			document.getElementById('last-login')!.textContent = new Date(data.last_login).toLocaleString();
			
			// Update 2FA status if available
			if (data.twoFactorEnabled !== undefined) {
				update2FAStatus(data.twoFactorEnabled);
			}
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

	// 2FA Event Listeners
	document.getElementById('setup-2fa-btn')?.addEventListener('click', async () => {
		try {
			const data = await apiService.setup2FA();
			
			if (data.success || data.qrCode) {
				// Show QR code in a modal/popup
				const qrModal = `
					<div id="qr-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div class="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
							<h3 class="text-lg font-bold text-white mb-4">Set up Two-Factor Authentication</h3>
							<p class="text-gray-300 text-sm mb-4">Scan this QR code with your authenticator app:</p>
							<div class="flex justify-center mb-4">
								<img src="${data.qrCode}" alt="QR Code" class="border border-white rounded">
							</div>
							<input id="verify-2fa-code" type="text" placeholder="Enter 6-digit code" 
								class="w-full px-3 py-2 bg-gray-700 text-white rounded mb-4">
							<div class="flex gap-2">
								<button id="verify-2fa-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded">
									Enable 2FA
								</button>
								<button id="cancel-2fa-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded">
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
									<div class="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
										<h3 class="text-lg font-bold text-white mb-4">🎉 2FA Enabled Successfully!</h3>
										<p class="text-gray-300 text-sm mb-4">Save these backup codes in a safe place. You can use them to log in if you lose access to your authenticator app:</p>
										<div class="bg-gray-900 p-4 rounded mb-4 max-h-40 overflow-y-auto">
											<div class="grid grid-cols-2 gap-2 text-sm font-mono text-white">
												${verifyData.backupCodes.map(code => `<div class="p-1 bg-gray-700 rounded text-center">${code}</div>`).join('')}
											</div>
										</div>
										<p class="text-yellow-400 text-xs mb-4">⚠️ These codes can only be used once each. Keep them secure!</p>
										<div class="flex gap-2 mb-4">
											<button id="copy-codes-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm">
												📋 Copy All
											</button>
											<button id="download-codes-btn" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm">
												💾 Download
											</button>
										</div>
										<button id="backup-codes-ok-btn" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded">
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
										btn.textContent = '✅ Copied!';
										btn.className = 'flex-1 bg-green-600 text-white py-2 rounded text-sm';
										setTimeout(() => {
											btn.textContent = originalText;
											btn.className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm';
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
									btn.textContent = '✅ Downloaded!';
									btn.className = 'flex-1 bg-green-600 text-white py-2 rounded text-sm';
									setTimeout(() => {
										btn.textContent = originalText;
										btn.className = 'flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm';
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
		statusEl.className = enabled ? 'text-xs mb-2 text-green-400' : 'text-xs mb-2 text-gray-300';
	}
	
	if (enableBtn) {
		enableBtn.style.display = enabled ? 'none' : 'block';
	}
	
	if (disableBtn) {
		disableBtn.style.display = enabled ? 'block' : 'none';
	}
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
		  <button class="sidebar-tab text-left px-3 py-2 hover:bg-indigo-700" data-tab="oldaccount">Old Account</button>
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
				case 'oldaccount':
					container!.innerHTML = renderOldAccountTab();
					await setupOldAccountTab(username, isGoogle);
					break;
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