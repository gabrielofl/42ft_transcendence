export function renderLogin(): string {
    return `
        <div class="relative z-10 flex items-center justify-center min-h-screen overflow-hidden">

            <!-- Login Form -->
            <form id="login-form" class="flex flex-col w-full max-w-sm bg-black bg-opacity-40 p-6 rounded-lg shadow-lg">
                <label for="username" class="text-white mb-1">Username</label>
                <input id="username" type="text" placeholder="Username" autocomplete="off"
                    class="w-full px-4 py-2 mb-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <label for="password" class="text-white mb-1">Password</label>
                <input id="password" type="password" placeholder="Password"
                    class="w-full px-4 py-2 mb-3 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <button id="submit-login-btn"
                    class="w-full bg-purple-900 hover:bg-purple-600 text-white font-press py-2 px-4 rounded-lg transition">
                    Enter
                </button>
				<button id="register-btn"
                    class="w-full bg-purple-900 hover:bg-purple-600 text-white font-press my-4 py-2 px-4 rounded-lg transition">
                    Register
                </button>
            </form>
			<!-- Register Form (daviles-)-->

        </div>
    `;
}

export function loginOptions() { 
	const registerBtn = document.getElementById('register-btn')!;
	registerBtn?.addEventListener('click', async () => { 
		loginForm.classlist.add('hidden');
		actualRegisterForm.classlist.remove('hidden');

	})

}
