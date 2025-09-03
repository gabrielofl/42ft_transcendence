
import sidebar from "../screens/profile-sidebar.html?raw";
import { renderAccountTab } from "../screens/ProfileAccount";
import { renderPerformanceTab } from "../screens/ProfilePerformance";
import { renderHistoryTab } from "../screens/ProfileHistory";
import { renderFriendsTab } from "../screens/ProfileFriends";

import { AppStore } from '../redux/AppStore';
import { updateLangue } from '../redux/reducers/langueReducer';
import { replaceTemplatePlaceholders } from "./utils";
import { API_BASE_URL } from "./config";

// API service interface for 2FA operations
interface ApiService {
  setup2FA(): Promise<any>;
  verify2FA(data: { token: string }): Promise<any>;
}

// Mock API service - replace with actual implementation
const apiService: ApiService = {
  setup2FA: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },
  verify2FA: async (data: { token: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Function to update 2FA status in the UI
function update2FAStatus(enabled: boolean) {
  const setupBtn = document.getElementById('setup-2fa-btn');
  const disableBtn = document.getElementById('disable-2fa-btn');
  const statusText = document.getElementById('2fa-status');
  
  if (setupBtn && disableBtn && statusText) {
    if (enabled) {
      setupBtn.style.display = 'none';
      disableBtn.style.display = 'block';
      statusText.textContent = 'Enabled';
      statusText.className = 'text-green-500';
    } else {
      setupBtn.style.display = 'block';
      disableBtn.style.display = 'none';
      statusText.textContent = 'Disabled';
      statusText.className = 'text-red-500';
    }
  }
}

export function setupProfileSidebar() {
  const sidebar = document.getElementById("profile-sidebar");
  if (!sidebar)
	return;

  // Configurar eventos de tabs
  sidebar.querySelectorAll(".sidebar-tab").forEach(btn => {
	btn.addEventListener("click", async e => {
	  const tab = (e.currentTarget as HTMLElement).dataset.tab;
	  const container = document.getElementById("profile-content");
	  if (!container)
		return;

	  // Reset de clases activas
	  sidebar.querySelectorAll(".sidebar-tab").forEach(b =>
		b.classList.remove("active")
	  );
	  (e.currentTarget as HTMLElement).classList.add("active");

	  switch (tab) {
		case "friends":
		  await renderFriendsTab();
		  break;
		case "performance":
		  await renderPerformanceTab();
		  break;
		case "history":
		  await renderHistoryTab();
		  break;
		default:
		  renderAccountTab();
		//   setupAccountTab();
		  break;
	  }
	});
  });
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

		const res = await fetch(`${API_BASE_URL}/users/profile/password`, {
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
													${verifyData.backupCodes.map((code: string) => `<div class="td" >${code}</div>`).join('')}
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
									const originalText = btn?.textContent || '';
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
${verifyData.backupCodes.map((code: string, index: number) => `${index + 1}. ${code}`).join('\n')}

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
								const originalText = btn?.textContent || '';
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
	setupProfileSidebar();
	setTimeout(() => {
	    document.querySelector('[data-tab="friends"]')?.dispatchEvent(new Event('click'));
  	}, 0);

}

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  setTimeout(() => {
    document.querySelector('[data-tab="account"]')?.dispatchEvent(new Event('click'));
  }, 0);
});

// interface PlayerStats {
// name: string;
// wins: number;
// losses: number;
// ratio: number;
// time: string;
// }
// const davidStats: PlayerStats = {
// name: "David",
// wins: 10,
// losses: 3,
// ratio: 5.0,
// time: "12:34"
// };

