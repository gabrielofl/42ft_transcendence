import profileAccount from "./profile-account.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { API_BASE_URL } from "./config";
import { initAlertModal, setupAlert } from "./AlertModal.js";

export function renderAccountTab() {

	const container = document.getElementById('profile-content');
	if (!container) return ;
	try {
		container.innerHTML = replaceTemplatePlaceholders(profileAccount, {API_BASE_URL});
		setupAccountTab();
		initAlertModal();
	} catch (err) {
	console.error("Failed to load account:", err);
	container.innerHTML = `<p class="text-red-500">Failed to load account tab.</p>`;
	}
  }


export function setupAccountTab() {

	const avatarInput = document.getElementById('avatar-upload') as HTMLInputElement | null;
	const nameInput = document.getElementById('name') as HTMLInputElement | null;
	const lastnameInput = document.getElementById('lastname') as HTMLInputElement | null;
	const updateNameBtn = document.getElementById('update-name-btn') as HTMLButtonElement | null;
	const usernameInput = document.getElementById('username') as HTMLInputElement | null;
	const updateUsernameBtn = document.getElementById('update-username-btn') as HTMLButtonElement | null;
	const emailInput = document.getElementById('email') as HTMLInputElement | null;
	const updateEmailBtn = document.getElementById('update-email-btn') as HTMLButtonElement | null;
	const downloadDataBtn = document.getElementById('download-data') as HTMLButtonElement | null;
	const deleteDataBtn = document.getElementById('delete-data-btn') as HTMLButtonElement | null;
	const deletePassInput = document.getElementById('delete-data-password') as HTMLInputElement | null;
	const googleDeletePassInput = document.getElementById('isgoogle-delete-data-password') as HTMLInputElement | null;
	const googleIndicator = document.getElementById('google-indicator');
	const passwordGoogleIndicator = document.getElementById('password-section-google');
	const passwordSection = document.getElementById('password-section');

	fetch(`${API_BASE_URL}/users/me`, {
		credentials: 'include',
		headers: {
			
		}
	})
		.then(res => res.json())
		.then(data => {
			const profileUsername = document.getElementById('profile-username');
			const profileName = document.getElementById('profile-display-name');
			const profileScore = document.getElementById('profile-score');
			const dataCollection = document.getElementById('data-collection-toggle') as HTMLInputElement;
			const dataProcessing = document.getElementById('data-processing-toggle') as HTMLInputElement;
			const dataAiUse = document.getElementById('data-ai-use-toggle') as HTMLInputElement;
			const dataScore = document.getElementById('data-score-toggle') as HTMLInputElement;

			if (!profileUsername || !profileName || !profileScore) return;
			
			profileName.textContent = data.first_name + ' ' + data.last_name;
			profileUsername.textContent = '@' + data.username;
			profileScore.textContent = data.score ? `${data.score} pts` : `0 pts`;
			
			// Avatar
			if (data.avatar) {
				const avatarUrl = `${API_BASE_URL}/profile/avatar/${data.avatar}`;
				(document.getElementById('avatar-preview') as HTMLImageElement).src = avatarUrl;
			}
			
			document.getElementById('name')?.setAttribute('placeholder', data.first_name);
			document.getElementById('lastname')?.setAttribute('placeholder', data.last_name);
			document.getElementById('username')?.setAttribute('placeholder', data.username);
			document.getElementById('email')?.setAttribute('placeholder', data.email);
			
			// Update checkboxes
			dataCollection.checked = data.allow_data_collection;
			dataProcessing.checked = data.allow_data_processing;
			dataAiUse.checked = data.allow_ai_training;
			dataScore.checked = data.show_scores_publicly;
			
			// === Add listeners for changes ===
			[dataCollection, dataProcessing, dataAiUse, dataScore].forEach(cb => {
			cb.addEventListener('change', async () => {
				const res = await fetch(`${API_BASE_URL}/users/privacy-settings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					
				},
				credentials: 'include',
				body: JSON.stringify({
					allowDataCollection: dataCollection.checked,
					allowDataProcessing: dataProcessing.checked,
					allowAiTraining: dataAiUse.checked,
					showScoresPublicly: dataScore.checked
				})
				});

				let result;
				try {
				result = await res.json();
				} catch {
				result = {};
				}

				if (!res.ok || !result.success) {
				setupAlert('Oops!', result.error || 'Failed to update privacy settings', "close");
				// rollback UI if update failed
				cb.checked = !cb.checked;
				} else {
				console.log(result.message);
				}
			});
			});


			// Update 2FA status if available
			if (data.twoFactorEnabled !== undefined) {
				update2FAStatus(data.twoFactorEnabled);
			}
			// Google account settings
			if (data.google_id) {
				googleIndicator?.classList.remove('hidden');
				passwordGoogleIndicator?.classList.remove('hidden');
				googleDeletePassInput?.classList.remove('hidden');
				passwordSection?.classList.add('hidden');
				deletePassInput?.classList.add('hidden');
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
		
		let result;
		try {
		result = await res.json();
		} catch {
		result = {};
		}

		if (!result.success) setupAlert('Oops!','Avatar upload failed', "close");
	});


	// Update name and lastname
	updateNameBtn?.addEventListener('click', async () => {
		const name = nameInput?.value.trim();
		const lastname = lastnameInput?.value.trim();
		if (!name || name.length < 3) return setupAlert('Oops!','Name too short', "close");
		if (!lastname || lastname.length < 3) return setupAlert('Oops!','Last name too short', "close");

		const res = await fetch(`${API_BASE_URL}/users/me`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				
			},
			credentials: 'include', 
			body: JSON.stringify({ firstName: name, lastName: lastname }),
		});

		if (!res.ok)
			setupAlert('Oops!','Oh no! Failed to update', "close");
		else
			renderAccountTab();

		let result;
		try {
		result = await res.json();
		} catch {
		result = {};
		}
		if (result.success) setupAlert('Oops!',result.message, "close");
		else setupAlert('Oops!',result.error || 'Oh no! Failed to update', "close");
	});

	// Update username
	updateUsernameBtn?.addEventListener('click', async () => {
		const username = usernameInput?.value.trim();
		if (!username || username.length < 3) return setupAlert('Oops!','Name too short', "close");

		const res = await fetch(`${API_BASE_URL}/users/me`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				
			},
			credentials: 'include', 
			body: JSON.stringify({ username }),
		});

		if (!res.ok)
			setupAlert('Oops!','Oh no! Failed to update', "close");
		else
			renderAccountTab();

		let result;
		try {
		result = await res.json();
		} catch {
		result = {};
		}
		if (result.success) setupAlert('Success!', result.message, "close");
		else setupAlert('Oops!', result.error || 'Oh no! Failed to update', "close");
	});

	// Update email
	updateEmailBtn?.addEventListener('click', async () => {
		const email = emailInput?.value.trim();
		if (!email || email.length < 5) return setupAlert('Oops!', 'Invalid email: email too short', "close");

		const res = await fetch(`${API_BASE_URL}/users/me`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				
			},
			credentials: 'include', 
			body: JSON.stringify({ email }),
		});

		if (!res.ok)
			setupAlert('Oops!', 'Oh no! Failed to update', "close");
		else
			renderAccountTab();
		
		let result;
		try {
		result = await res.json();
		} catch {
		result = {};
		}

		if (result.success) setupAlert('Success!', result.message, "close");
		else setupAlert('Oops!', result.error || 'Oh no! Failed to update', "close");
	});

	document.getElementById('update-password-btn')?.addEventListener('click', async () => {
		const password = (document.getElementById('password') as HTMLInputElement).value;
		const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
		// const rePassword = (document.getElementById('re-password') as HTMLInputElement).value;
		if (newPassword.length < 4) return setupAlert('Oops!', 'Oh no! Password too short', "close");

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
		
		let result;
		try {
		result = await res.json();
		} catch {
		result = {};
		}

		if (result.success) setupAlert('Success!', 'Yay! Password changed!', "close");
		else setupAlert('Oops!', result.error || 'Failed to update password', "close");
	});

	
		// Download data button
	downloadDataBtn?.addEventListener('click', async () => {

		
	fetch(`${API_BASE_URL}/users/me`, {
		credentials: 'include',
		headers: {
			
		}
	})
	
	.then(res => res.json())
		.then(data => {
			
			document.getElementById('name')?.setAttribute('placeholder', data.first_name);
			document.getElementById('lastname')?.setAttribute('placeholder', data.last_name);
			document.getElementById('username')?.setAttribute('placeholder', data.username);
			document.getElementById('email')?.setAttribute('placeholder', data.email);
			
			const codesText = `Profile data downladed: ${new Date().toLocaleString()}
<<< Personal data  >>>
Name: ${data.first_name}
Last Name: ${data.last_name}
Username: ${data.username}
Email: ${data.email}

<<<  Statistics  >>>
Matches: ${data.matches}
Win: ${data.wins}
Losses: ${data.losses}
Score: ${data.score}
Max Score: ${data.max_score}
Profile created: ${data.created_at}
			`;

		const blob = new Blob([codesText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `Profile-Data-${data.username}_${new Date().toISOString().split('T')[0]}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		// Update button to show success
		const btn = document.getElementById('download-data');
		const originalText = btn?.textContent;
		if (btn) {
			btn.textContent = 'Downloaded!';
			btn.className = 'btn-success w-full';
			setTimeout(() => {
				btn.textContent = originalText;
				btn.className = 'btn-primary w-full';
			}, 2000);
		}
		})
		.catch(err => console.error('Error loading profile:', err));
	});


	//Delete account open modal listener
	deleteDataBtn?.addEventListener('click', async () => {
		let password;
		if (!deletePassInput?.classList.contains("hidden"))
		{
			password = deletePassInput?.value.trim();
			if (!password || password.length < 3) return setupAlert('Whoops!', 'Password is required', "close");
		}
		else if (!googleDeletePassInput?.classList.contains("hidden"))
		{
			password = googleDeletePassInput?.value.trim();
			if (!password || password.length < 3) return setupAlert('Whoops!', 'Type DELETE to continue', "close");
		}

		const modalDelete = document.getElementById("user-delete-modal");	
		 // Show modal
		modalDelete?.classList.remove("hidden");

		// Close modal
		document.getElementById("close-delete-btn")?.addEventListener("click", () => {
			modalDelete?.classList.add("hidden");
		});
	});

	//Delete account confirmation button listener
	const deleteConfirmBtn = document.getElementById('delete-confirm-btn') as HTMLButtonElement | null;
	deleteConfirmBtn?.addEventListener('click', async () => {
		let password;
		if (!deletePassInput?.classList.contains("hidden"))
		{
			password = deletePassInput?.value.trim();
			if (!password || password.length < 3) return setupAlert('Whoops!', 'Password is required', "close");
		}
		else if (!googleDeletePassInput?.classList.contains("hidden"))
		{
			password = googleDeletePassInput?.value.trim();
			if (!password || password.length < 3) return setupAlert('Whoops!', 'Type DELETE to continue', "close");
		}
		try {
			const res = await fetch(`${API_BASE_URL}/profile/delete`, {
			method: "POST",
			credentials: 'include',
			headers: {
					"Content-Type": "application/json",
			},
			body: JSON.stringify({ password }),
			});

			const data = await res.json();

			if (!res.ok) {
			throw new Error(data.error || "Failed to delete account");
			}

			// Success → maybe redirect to homepage
			setupAlert('Boom!', "Account deleted successfully!", "close");
			window.location.href = "/"; // redirect after deletion
		} catch (err) { //err: unknown
			// console.error("Error deleting account:", err);
			const message = err instanceof Error ? err.message : String(err);
			setupAlert('Whoops!', message || "Something went wrong", "close");
		}
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
						setupAlert('Whoops!', 'Please enter a valid 6-digit code', "close");
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
									setupAlert('Whoops!', 'Failed to copy codes to clipboard', "close");
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
							setupAlert('Boom!', '2FA enabled successfully!', "close");
							update2FAStatus(true);
						}
					} else {
						setupAlert('Whoops!', verifyData.error || 'Invalid code', "close");
					}
				});
				
				document.getElementById('cancel-2fa-btn')?.addEventListener('click', () => {
					document.getElementById('qr-modal')?.remove();
				});
			} else {
				setupAlert('Whoops!', data.error || '2FA setup failed', "close");
			}
		} catch (error) {
			console.error('2FA setup error:', error);
			setupAlert('Whoops!', 'Failed to set up 2FA', "close");
		}
	});

document.getElementById('disable-2fa-btn')?.addEventListener('click', async () => {
	const modal = document.getElementById('password-modal');
	const input = document.getElementById('password-input') as HTMLInputElement | null;;
	const confirmBtn = document.getElementById('confirm-password-btn') as HTMLButtonElement | null;
	const cancelBtn = document.getElementById('cancel-password-btn') as HTMLButtonElement | null;

	if (!modal || !input || !confirmBtn || !cancelBtn)
		return;
	// Show the modal
	modal.classList.remove('hidden');
	input.value = '';
	input.focus();

	// Return a Promise that resolves with the entered password
	const getPassword = () => new Promise((resolve) => {
		const cleanup = () => {
		confirmBtn.removeEventListener('click', onConfirm);
		cancelBtn.removeEventListener('click', onCancel);
		modal.classList.add('hidden');
		};

		const onConfirm = () => {
		const password = input.value.trim();
		cleanup();
		resolve(password || null);
		};

		const onCancel = () => {
		cleanup();
		resolve(null);
		};

		confirmBtn.addEventListener('click', onConfirm);
		cancelBtn.addEventListener('click', onCancel);
	});

	const password = await getPassword();
	if (!password) return; // Cancel or empty

	try {
		const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
		method: 'POST',
		headers: { 
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify({ password })
		});

		const data = await response.json();
		if (data.success) {
		setupAlert('Boom!', '2FA disabled successfully!', "close");
		update2FAStatus(false);
		} else {
		setupAlert('Whoops!', data.error || 'Failed to disable 2FA', "close");
		
		}
	} catch (error) {
		console.error('2FA disable error:', error);
		setupAlert('Whoops!', 'Failed to disable 2FA', "close");
	}
	});

}



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
		
	  },
	  body: JSON.stringify(data)
	});
	return response.json();
  }
};

  
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