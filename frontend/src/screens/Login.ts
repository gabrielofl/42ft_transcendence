import { navigateTo } from "../navigation.js";

export function renderLogin(): string {
  return `
    <div class="relative z-10 flex items-center justify-center min-h-screen overflow-hidden">
      <div class="m-8 w-full max-w-md rounded-xl bg-white bg-opacity-30 backdrop-blur-md shadow-lg p-8 space-y-6">
        <div id="login-box" class="space-y-6">
          <!-- Google Auth -->
          <button
            id="google-auth-button"
            type="button"
            class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign in with Google
          </button>

          <!-- Divider -->
          <div class="relative">
            <div class="relative flex justify-center text-sm">
              <span class="px-2 text-gray-900">Or continue with email</span>
            </div>
          </div>

          <!-- Email Field -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">📧</div>
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
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">🔒</div>
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
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                👁️
              </button>
            </div>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
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
            </button>
          </div>

          <!-- Submit Button -->
          <button
            id="login-submit"
            type="button"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Sign In
          </button>
        </div>

        <pre id="login-result" class="text-xs text-red-400 whitespace-pre-wrap text-left"></pre>
      </div>
    </div>
  `;
}

export function setupLogin() { 
	const registerBtn = document.getElementById('register-btn')!;
	const registerForm = document.getElementById('register-form');
	const submitRegisterBtn = document.getElementById('submit-register-btn')!;
	const goBackRegisterBtn = document.getElementById('go-back-register-btn');
	const registerResult = document.getElementById('register-result');
	
	const loginBtn = document.getElementById('login-btn')!;
	const loginForm = document.getElementById('login-form');
	const submitLoginBtn = document.getElementById('login-submit');
	const loginResult = document.getElementById('login-result');

	const getUserInput = () => { 
		const username = (document.getElementById('email') as HTMLInputElement).value;
		const password = (document.getElementById('password') as HTMLInputElement).value;
		return { username, password };
	}

	loginBtn?.addEventListener('click', async () => {
		if (!loginForm) return; // add registerform check?
		if (loginForm.classList.contains('hidden')) {
			loginForm.classList.remove('hidden');
			loginBtn?.classList.add('hidden');
			registerBtn?.classList.add('hidden');
			goBackRegisterBtn?.classList.remove('hidden');
		}
		else { 
			loginForm.classList.add('hidden');
			loginBtn?.classList.remove('hidden');
			registerBtn?.classList.remove('hidden');
			goBackRegisterBtn?.classList.add('hidden');
		}
	});

	goBackRegisterBtn?.addEventListener('click', () => {
		if (!loginForm) return; // add registerform check?

		loginForm.classList.add('hidden');
		loginBtn?.classList.remove('hidden');
		registerBtn?.classList.remove('hidden');
		goBackRegisterBtn?.classList.add('hidden');
	});

	submitLoginBtn?.addEventListener('click', async () => {
		const { username, password } = getUserInput();
		loginResult!.innerText = '';

		navigateTo('home'); //navigation test

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
	});
}