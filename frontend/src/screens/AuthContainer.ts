import { navigateTo } from "../navigation.js";
import { apiService, LoginRequest, RegisterRequest } from "../services/api.js";
import { setupAlert } from "./AlertModal.js";

declare global {
interface Window {
	google: any;
	handleCredentialResponse: (response: any) => void;
}
}

// Global Google Sign-In callback
window.handleCredentialResponse = async (response: any) => {
	try {
		// console.log('Google credential received:', response);
		if (!response.credential)
			return;
		const result = await apiService.googleLogin(response.credential);
		
	// ✅ Detect 2FA requirement
		if (result.status === 202 && result.requires2FA) {
		console.log('2FA required for user:', result.user?.username);
		show2FA(false);
		return;
		}

		// ✅ Normal login success
		if (result.success) {
		console.log('Google login successful:', result.user);
		navigateTo('home');
		return;
		}

		// ✅ Any other error
		setupAlert('Whoops!', result.error || 'Google authentication failed', "close");
	} catch (error) {
		console.error('Google authentication error:', error);
		setupAlert('Whoops!', 'Google authentication failed. Please try again.', "close");
	}
};

let isLogin = true;

export function renderAuthContainer(): void {
const main = document.getElementById('main');
if (!main) return;

	main.innerHTML = `
<div id="auth-form-container">
	<div class="flex items-center justify-center p-4">
	<div class="max-w-md w-full space-y-8">
		<div class="bg-[#25004d] border border-[#ff00ff] rounded-2xl shadow-xl p-8">
		<div class="text-center mb-8">
			<h2 class="text-2xl font-bold text-[#ff00ff] mb-2">
			${isLogin ? 'Welcome Back' : 'Create Account'}
			</h2>
			<p class="text-[#ffff66] text-sm">
			${isLogin ? 'Sign in to your account to continue' : 'Join us today and get started'}
			</p>
		</div>

		<div class="flex rounded-lg gap-4 p-1 mb-6">
			<button id="sign-in-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			isLogin ? 'text-white shadow-sm btn-four' : ' hover:text-gray-700 btn-five font-normal'
			}">SIGN IN</button>
			<button id="sign-up-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			!isLogin ? 'text-white shadow-sm btn-four' : 'hover:text-gray-700 btn-five font-normal'
			}">SIGN UP</button>
		</div>

		<div class="p-1 mb-6">
			<!-- Google Sign-In Button -->
			<button id="google-login-btn" class="btn-primary w-full rounded-lg text-xs">
			${isLogin ? 'SIGN IN WITH GOOGLE' : 'SIGN UP WITH GOOGLE'}
			</button>
		</div>
			<!-- Divider -->
		<div class="relative">
			<div class="relative my-8">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-[--secondary-color]"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="bg-[#25004d] text-xs px-3 text-[--secondary-color]">Or continue with email</span>
				</div>
				</div>
		</div>
		<div id="auth-form-wrapper">
			${isLogin ? renderLoginForm() : renderRegisterForm()}
		</div>
		</div>
		</div>
	</div>
	</div>
	<div
  id="twofa-container"
  class="hidden fixed inset-0 flex items-center justify-center bg-[#25004d] z-50"
>
  <div class="w-full max-w-sm p-6 border border-[--primary-color] bg-[#1a0033] rounded-lg shadow-md">
    <div class="text-center text-[#ff00ff] mb-4" id="twofa-mode-register">
      Scan this QR code with your authenticator app:
    </div>
    <div class="text-center text-[#ff00ff] mb-4 hidden" id="twofa-mode-login">
      Enter your 2FA code from your app:
    </div>
    <div class="text-center text-[#ff00ff] mb-4 hidden" id="backup-mode-login">
      Enter one of your backup codes:
    </div>
    <div id="qrcode-wrapper" class="flex justify-center mb-4">
      <img id="qrcode-img" src="" class="h-24 w-24 border border-white rounded-md" />
    </div>
    <input
      id="twofa-code"
      type="text"
      placeholder="Enter 6-digit code"
      class="block w-full px-4 py-3 border border-[--secondary-color] rounded-lg text-sm bg-[--bg-color] text-white placeholder-white mb-4"
    />
    <input
      id="backup-code"
      type="text"
      placeholder="Enter 8-character backup code"
      class="block w-full px-4 py-3 border border-[--secondary-color] rounded-lg text-sm bg-[--bg-color] text-white placeholder-white mb-4 hidden"
    />
    <button
      id="submit-twofa-btn"
      class="w-full btn-primary text-white py-2 rounded-lg"
    >
      Verify 2FA
    </button>
    <button
      id="toggle-backup-btn"
      class="mt-2 w-full text-sm text-[--secondary-color] hover:text-[#ff00ff]"
    >
      Use backup code instead
    </button>
    <button
      id="back-to-auth"
      class="mt-4 w-full text-sm text-[--secondary-color] hover:text-[#ff00ff]"
    >
      ← Back to Sign In
    </button>
  </div>
</div>



`;

	setupAuthEvents();
	initializeGoogleSignIn();
}

function renderLoginForm(): string {
return `
	<!-- Login Result Message -->
	<div id="login-result" class="text-center text-red-500 text-xs mb-2"></div>
	<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-[#ff00ff] my-2">
			Email
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">mail</span>
			<input
				id="email"
				name="email"
				type="email"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your email"
			/>
			</div>
		</div>

		<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-[#ff00ff] my-2">
			Password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-12 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your password"
			/>
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-gray-700 focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>

			</div>
		</div>

		<!-- Remember Me & Forgot Password -->
		<div class="flex w-full items-center justify-between py-6">
			<div class="flex items-center">
			<input
				id="remember-me"
				name="remember-me"
				type="checkbox"
				class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
			/>
			<label for="remember-me" class="ml-2 block text-xs text-[#ff00ff]">
				Remember me
			</label>
			</div>
			<button type="button" class="text-xs text-[--secondary-color] hover:text-indigo-500 font-medium">
			Forgot password?
			</div>
		<div>
			</button>
			<button id="submit-login-btn" class="w-full bg-indigo-600 text-white text-sm font-medium p-3 rounded-lg hover:bg-indigo-700 transition btn-primary">
			SIGN IN
			</button>
		</div>
`;
}

function renderRegisterForm(): string {
	return `
<!-- Firstname and Lastname Field -->
		<div class="flex">
		<div class="mr-4">
			<label for="firstname" class="block text-sm font-medium text-[#ff00ff] my-2">
			Name
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">person</span>
			<input
				id="firstname"
				name="firstName"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="First name"
				required
			/>
			</div>
			</div>
			<div>
			<label for="lastname" class="block text-sm font-medium text-[#ff00ff] my-2">
			Last Name
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">person</span>
			<input
				id="lastname"
				name="lastName"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Last name"
				required
			/>
			</div>
			</div>
		</div>

		<!-- Username -->
		<div>
			<label for="username" class="block text-sm font-medium text-[#ff00ff] my-2">
			Username
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">account_circle</span>
			<input
				id="username"
				name="username"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter a username"
				required
			/>
			</div>
			</div>

		<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-[#ff00ff] my-2">
			Email
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">mail</span>
			<input
				id="email"
				name="emailAddress"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your email"
				required
			/>
			</div>
			</div>

			<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-[#ff00ff] my-2">
			Password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Create a password"
				required
			/>
			
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-[#ff00ff] focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			<div>
			<label for="confirmpassword" class="block text-sm font-medium text-[#ff00ff] my-2">
			Confirm password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="confirm-password"
				name="confirmPassword"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Confirm your password"
				required
			/>
			
			<button
				type="button"
				id="toggle-confirm-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-[#ff00ff] focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			</div>
		</div>

			<!-- I agree to the Terms of Service and Privacy Policy -->
		<div class="flex w-full items-center justify-between py-4">
			<div class="flex items-center">
			<input
				id="terms"
				name="terms"
				type="checkbox"
				class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
			/>
			<label for="terms" class="m-1 block text-[0.4rem] text-[#ff00ff]">
				I agree to the
			</label>
			
			<button type="button" class="text-[0.4rem] text-[--secondary-color] hover:text-indigo-500 font-medium">
			Terms of Service
			</button>
			<label for="terms" class="m-1 block text-[0.4rem] text-[#ff00ff]">
				and
			</label>

			<button type="button" class="text-[0.4rem] text-[--secondary-color] hover:text-indigo-500 font-medium">
				Privacy Policy
			</button>
		</div>
		</div>

			<div>
				<button id="submit-register-btn" class="w-full bg-[--secondary-color] text-sm font-medium text-white py-3 rounded-lg hover:bg-indigo-700 transition btn-primary">CREATE ACCOUNT</button>
			</div>
		<div>
		</div>
`;
}

// Initialize Google Sign-In
function initializeGoogleSignIn(retryCount = 0) {
	const maxRetries = 10;
	
	if (window.google && window.google.accounts?.id) {
		try {
			window.google.accounts.id.initialize({
				client_id: '723996318435-bavdbrolseqgqq06val5dc1sumgam12j.apps.googleusercontent.com',
				callback: window.handleCredentialResponse,
				auto_select: false,
				cancel_on_tap_outside: true,
			});
			console.log('Google Sign-In initialized successfully');
		} catch (error) {
			console.error('Error initializing Google Sign-In:', error);
		}
	} else if (retryCount < maxRetries) {
		console.warn(`Google Identity Services not loaded yet, retrying... (${retryCount + 1}/${maxRetries})`);
		setTimeout(() => initializeGoogleSignIn(retryCount + 1), 500);
	} else {
		console.error('Google Identity Services failed to load after maximum retries');
	}
}

function setupAuthEvents(): void {
document.getElementById('sign-in-tab')?.addEventListener('click', () => {
	isLogin = true;
	renderAuthContainer();
});

document.getElementById('sign-up-tab')?.addEventListener('click', () => {
	isLogin = false;
	renderAuthContainer();
});
	
const googleLoginBtn = document.getElementById('google-login-btn');
if (googleLoginBtn) {
	googleLoginBtn.addEventListener('click', () => {
		if (window.google?.accounts?.id) {
			// Use the one_tap method instead of prompt() for better UX
			window.google.accounts.id.prompt((notification: any) => {
				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					console.log('Google Sign-In prompt not shown:', notification);
				}
			});
		} else {
			console.error('Google Identity Services not loaded');
			setupAlert('Darn!', 'Google Sign-In is not available. Please try again later.', "close");
		}
	});
}

	const loginBtn = document.getElementById('submit-login-btn');
	if (loginBtn) {
	loginBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		const email = (document.getElementById('email') as HTMLInputElement)?.value;
		const password = (document.getElementById('password') as HTMLInputElement)?.value;
		
		if (!email || !password) {
			setupAlert('Oops!', 'Please fill in all fields', "close");
			return;
		}

		try {
			const loginData: LoginRequest = {
				username: email, // Using email as username for login
				password: password
			};

			const response = await apiService.login(loginData);
			
			if (response.success) {
				if (response.requires2FA) {
					show2FA(false); // Show 2FA for login (no QR code needed)
				} else {
					navigateTo('home'); // Direct login if no 2FA
				}
			} else {
				setupAlert('Oops!', response.error || 'Login failed', "close");
			}
		} catch (err) {
			console.error('Login error:', err);
			setupAlert('Oops!', 'Something went wrong. Try again.', "close");
		}
	});

	}

const registerBtn = document.getElementById('submit-register-btn');
	if (registerBtn) {
	registerBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		const firstName = (document.getElementById('firstname') as HTMLInputElement)?.value;
		const lastName = (document.getElementById('lastname') as HTMLInputElement)?.value;
		const username = (document.getElementById('username') as HTMLInputElement)?.value;
		const email = (document.getElementById('email') as HTMLInputElement)?.value;
		const password = (document.getElementById('password') as HTMLInputElement)?.value;
		const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement)?.value;
		
		if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
			setupAlert('Oops!', 'Please fill in all fields', "close");
			return;
		}

		if (password !== confirmPassword) {
			setupAlert('Oops!', 'Passwords do not match', "close");
			return;
		}

		try {
			const registerData: RegisterRequest = {
				firstName: firstName,
				lastName: lastName,
				username: username,
				email: email,
				password: password
			};

			const response = await apiService.register(registerData);
			
			if (response.success) {
				setupAlert('Yay!', 'Registration successful! Please log in.', "close");
				isLogin = true; // Switch to login mode
				renderAuthContainer(); // Re-render to show login form
			} else {
				setupAlert('Oops!', response.error || 'Registration failed', "close");
			}
		} catch (err) {
			console.error('Registration error:', err);
			setupAlert('Oops!', 'Something went wrong. Try again.', "close");
		}
	});
	}

if (window.google && window.google.accounts?.id) {
  const buttonDiv = document.querySelector('.g_id_signin');
  if (buttonDiv) {
    window.google.accounts.id.renderButton(buttonDiv, {
      theme: 'outline',
      size: 'large',
      width: '100%',
      type: 'standard',
      logo_alignment: 'left',
      text: 'signin_with',
      shape: 'rect'
    });
  }
}
}

document.addEventListener('DOMContentLoaded', () => {
renderAuthContainer();
});

function show2FA(isRegistering: boolean, qrCodeData?: string): void {
  const container = document.getElementById('twofa-container');
  const authContainer = document.getElementById('auth-form-container');
  const qrWrapper = document.getElementById('qrcode-wrapper');
  const registerText = document.getElementById('twofa-mode-register');
  const loginText = document.getElementById('twofa-mode-login');
  const submit2FAbtn = document.getElementById('submit-twofa-btn');
  const qrImg = document.getElementById('qrcode-img') as HTMLImageElement;

  if (!container || !authContainer || !qrWrapper || !registerText || !loginText) {
    console.warn('2FA elements missing');
    return;
  }

  // Hide auth UI, show 2FA
  container.classList.remove('hidden');
  authContainer.classList.add('hidden');

  if (isRegistering) {
    qrWrapper.classList.remove('hidden');
    registerText.classList.remove('hidden');
    loginText.classList.add('hidden');
    
    // Set QR code image if provided
    if (qrCodeData && qrImg) {
      qrImg.src = qrCodeData;
    }
  } else {
    qrWrapper.classList.add('hidden');
    registerText.classList.add('hidden');
    loginText.classList.remove('hidden');
  }

  const backBtn = document.getElementById('back-to-auth');
  backBtn?.addEventListener('click', () => {
    container.classList.add('hidden');
    authContainer.classList.remove('hidden');
  });
	
	// Toggle between TOTP and backup code modes
	const toggleBackupBtn = document.getElementById('toggle-backup-btn');
	const twofaCodeInput = document.getElementById('twofa-code') as HTMLInputElement;
	const backupCodeInput = document.getElementById('backup-code') as HTMLInputElement;
	const twofaModeLogin = document.getElementById('twofa-mode-login');
	const backupModeLogin = document.getElementById('backup-mode-login');
	
	let isBackupMode = false;
	
	toggleBackupBtn?.addEventListener('click', () => {
		isBackupMode = !isBackupMode;
		
		if (isBackupMode) {
			// Switch to backup code mode
			twofaCodeInput.classList.add('hidden');
			backupCodeInput.classList.remove('hidden');
			twofaModeLogin?.classList.add('hidden');
			backupModeLogin?.classList.remove('hidden');
			toggleBackupBtn.textContent = 'Use authenticator code instead';
		} else {
			// Switch to TOTP mode
			twofaCodeInput.classList.remove('hidden');
			backupCodeInput.classList.add('hidden');
			twofaModeLogin?.classList.remove('hidden');
			backupModeLogin?.classList.add('hidden');
			toggleBackupBtn.textContent = 'Use backup code instead';
		}
		
		// Clear both inputs when switching
		twofaCodeInput.value = '';
		backupCodeInput.value = '';
	});

	submit2FAbtn?.addEventListener('click', async () => {
		const code = isBackupMode 
			? backupCodeInput?.value
			: twofaCodeInput?.value;
		
		if (!code || (!isBackupMode && code.length !== 6) || (isBackupMode && code.length !== 8)) {
			const expectedFormat = isBackupMode ? '8-character backup code' : '6-digit code';
			setupAlert('Whoops!', `Please enter a valid ${expectedFormat}`, "close");
			return;
		}

		try {
			const verifyData = await apiService.verify2FA({ token: code });
					
			if (verifyData.success) {
				navigateTo('home');
			} else {
				setupAlert('Whoops!', verifyData.error || '2FA verification failed', "close");
			}
		} catch (err) {
			console.error('2FA login error:', err);
			setupAlert('Whoops!', 'Something went wrong. Try again.', "close");
		}
  });
	
	
}
