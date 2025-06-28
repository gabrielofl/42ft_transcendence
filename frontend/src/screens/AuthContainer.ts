import { navigateTo } from "../navigation.js";

declare global {
interface Window {
	google: any;
	handleCredentialResponse: (response: any) => void;
}
}

let isLogin = true;

export function renderAuthContainer(): void {
const main = document.getElementById('main');
if (!main) return;

main.innerHTML = `
	<div class="min-h-screen flex items-center justify-center p-4">
	<div class="max-w-md w-full space-y-8">
		<div class="bg-white rounded-2xl shadow-xl p-8">
		<div class="text-center mb-8">
			<h2 class="text-3xl font-bold text-gray-900 mb-2">
			${isLogin ? 'Welcome Back' : 'Create Account'}
			</h2>
			<p class="text-gray-600">
			${isLogin ? 'Sign in to your account to continue' : 'Join us today and get started'}
			</p>
		</div>

		<div class="flex bg-gray-100 rounded-lg p-1 mb-6">
			<button id="sign-in-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
			}">Sign In</button>
			<button id="sign-up-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
			}">Sign Up</button>
		</div>

		<div class="p-1 mb-6">
		<!-- g_id_onload contains Google Identity Services settings -->
			<div
			id="g_id_onload"
			data-auto_prompt="false"
			data-callback="handleCredentialResponse"
			data-client_id="PUT_YOUR_WEB_CLIENT_ID_HERE"
			></div>
			<!-- g_id_signin places the button on a page and supports customization -->
			<div class="g_id_signin"></div>
			</div>
			<!-- Divider -->
		<div class="relative">
			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-300"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="bg-white px-3 text-gray-500">Or continue with email</span>
				</div>
				</div>
		</div>
		<div id="auth-form-wrapper">
			${isLogin ? renderLoginForm() : renderRegisterForm()}
		</div>
		</div>
	</div>
	</div>
`;

setupAuthEvents();
}

function renderLoginForm(): string {
return `
	<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 my-2">
			Email Address
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">mail</span>
			<input
				id="email"
				name="email"
				type="email"
				class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Enter your email"
			/>
			</div>
		</div>

		<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 my-2">
			Password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Enter your password"
			/>
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
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
			<label for="remember-me" class="ml-2 block text-sm text-gray-700">
				Remember me
			</label>
			</div>
			<button type="button" class="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
			Forgot password?
			</div>
		<div>
			</button>
			<button id="submit-login-btn" class="w-full bg-indigo-600 text-white text-sm font-medium p-3 rounded-lg hover:bg-indigo-700 transition">
			Sign In
			</button>
		</div>
`;
}

function renderRegisterForm(): string {
	return `
<!-- Firstname and Lastname Field -->
		<div class="flex">
		<div class="mr-4">
			<label for="firstname" class="block text-sm font-medium text-gray-700 my-2">
			First Name
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">person</span>
			<input
				id="firstname"
				name="firstName"
				type="text"
				class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="First name"
				required
			/>
			</div>
			</div>
			<div>
			<label for="lastname" class="block text-sm font-medium text-gray-700 my-2">
			Last Name
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">person</span>
			<input
				id="lastname"
				name="lastName"
				type="text"
				class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Last name"
				required
			/>
			</div>
			</div>
		</div>

		<!-- Username -->
		<div>
			<label for="username" class="block text-sm font-medium text-gray-700 my-2">
			Username
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">account_circle</span>
			<input
				id="username"
				name="username"
				type="text"
				class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Enter a username"
				required
			/>
			</div>
			</div>

		<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 my-2">
			Email Address
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">mail</span>
			<input
				id="email"
				name="emailAddress"
				type="text"
				class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Enter your email"
				required
			/>
			</div>
			</div>

			<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 my-2">
			Password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Create a password"
				required
			/>
			
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			<div>
			<label for="confirmpassword" class="block text-sm font-medium text-gray-700 my-2">
			Confirm password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-3.5 text-gray-400">lock</span>
			<input
				id="confirm-password"
				name="confirmPassword"
				type="password"
				class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
				placeholder="Confirm your password"
				required
			/>
			
			<button
				type="button"
				id="toggle-confirm-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			</div>
		</div>

			<!-- I agree to the Terms of Service and Privacy Policy -->
		<div class="flex w-full items-center justify-between pb-2 pt-2 py-1">
			<div class="flex items-center">
			<input
				id="terms"
				name="terms"
				type="checkbox"
				class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
			/>
			<label for="terms" class="m-1 block text-sm text-gray-700">
				I agree to the
			</label>
			
			<button type="button" class="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
			Terms of Service
			</button>
			<label for="terms" class="m-1 block text-sm text-gray-700">
				and
			</label>

			<button type="button" class="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
				Privacy Policy
			</button>
		</div>
		</div>

			<div>
				<button id="submit-register-btn" class="w-full bg-indigo-600 text-sm font-medium text-white py-3 rounded-lg hover:bg-indigo-700 transition">Create Account</button>
			</div>
		<div>
		</div>
`;
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

	const loginBtn = document.getElementById('submit-login-btn');
	if (loginBtn) {
	loginBtn.addEventListener('click', (e) => {
		// e.preventDefault();
		const email = (document.getElementById('email') as HTMLInputElement)?.value;
		const password = (document.getElementById('password') as HTMLInputElement)?.value;
		
		// try {
		// 	const response = await fetch(`https://localhost:443/login`, { //or direct to backend port?
		// 		method: 'POST',
		// 		headers: { 'Content-Type': 'application/json' },
		// 		body: JSON.stringify({ username, password }),
		// 		credentials: 'include',
		// 	});

		// 	const data = await response.json();
		// 	if (!response.ok) {
		// 		try {
		// 			loginResult!.innerText = data?.error;
		// 		}
		// 		catch {
		// 			loginResult!.innerText = 'Login failed.';
		// 		}
		// 		return;
		// 	}
		// 	//login function?
		// 	navigateTo('home');
		// } catch (err) {
		// 	loginResult!.innerText = 'Something went wrong. Try again.';
		// }
		navigateTo('home');
	});
	}

const registerBtn = document.getElementById('submit-register-btn');
	if (registerBtn) {
	registerBtn.addEventListener('click', (e) => {
		// e.preventDefault();
		const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value;
		const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value;
		const username = (document.getElementById('email') as HTMLInputElement)?.value;
		const email = (document.getElementById('email') as HTMLInputElement)?.value;
		const password = (document.getElementById('password') as HTMLInputElement)?.value;
		
		// try {
		// 	const response = await fetch(`https://localhost:443/register`, { //or direct to backend port?
		// 		method: 'POST',
		// 		headers: { 'Content-Type': 'application/json' },
		// 		body: JSON.stringify({ firstName, lastName, email, username, password }),
		// 		credentials: 'include',
		// 	});

		// 	const data = await response.json();
		// 	if (!response.ok) {
		// 		try {
		// 			loginResult!.innerText = data?.error;
		// 		}
		// 		catch {
		// 			loginResult!.innerText = 'Register failed.';
		// 		}
		// 		return;
		// 	}
		// 	//login function?
		// 	navigateTo('home');
		// } catch (err) {
		// 	loginResult!.innerText = 'Something went wrong. Try again.';
		// }
		navigateTo('home');
	});
	}

if (window.google && window.google.accounts?.id) {
	const buttonDiv = document.querySelector(".g_id_signin");
	if (buttonDiv) {
	window.google.accounts.id.renderButton(buttonDiv, {
		theme: "outline",
		size: "large",
		width: "100%"
	});
	}
}
}

document.addEventListener('DOMContentLoaded', () => {
renderAuthContainer();
});
