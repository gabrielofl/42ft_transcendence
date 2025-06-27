import { navigateTo } from "../navigation.js";

export function renderHome(): string {
    return `
        <div>
            <!-- Header -->
            <nav class="font-press text-purple-900 px-6 py-4 flex justify-between rounded-sm items-center shadow-md">
                <div class="text-2xl font-press font-bold tracking-wide">PONG</div>
                <div class="flex gap-2">
                    <button id="nav-home" class="menu-tab border border-purple-900 hover:bg-purple-900/20">Home</button>
                    <button id="nav-profile" class="menu-tab border border-purple-900 hover:bg-purple-900/20">User</button>
                    <button id="nav-logout" class="menu-tab border border-red-600 text-red-600 hover:bg-red-900/20">Logout</button>
                </div>
            </nav>
            <div class="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">

                <!-- Home Options -->
				
                <button id="local-btn"
                    class="w-1/4 bg-yellow-900 hover:bg-yellow-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
                    Local game
                </button>
                <button id="ai-btn"
                    class="w-1/4 bg-red-900 hover:bg-red-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
                    AI game
                </button>
                <button id="multiplayer-btn"
                    class="w-1/4 bg-green-900 hover:bg-green-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
                    Multiplayer game
                </button>
            </div>
        </div>
    `;
}

// <!-- Modes Panel -->
//                 <button id="mode-btn"
//                     class="w-1/4 bg-yellow-900 hover:bg-yellow-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                     Choose mode selection button
//                 </button>
//                 <div id="modes-panel"
//                     class="w-[500px] z-20 relative top-0 left-0 h-auto flex flex-col bg-gray-900 text-white shadow-lg border-l border-gray-700 rounded-lg overflow-hidden transform transition-all duration-300 scale-0 origin-left pointer-events-none">
//                     <div>
//                         <button id="close-modes-panel" class="absolute mr-4 mt-4 text-md right-2 text-red-500 hover:text-red-800">&times;</button>
//                     </div>
//                     <div id="modes-panel-content" class="flex justify-center pt-14 pb-8">
//                         <!-- Content injection -->
//                     </div>
//                 </div>
//                 <div class="text-gray-900 font-press text-center text-sm my-3">or</div>

// export function renderModesPanel(): string {
//     return `
//         <div class="flex flex-col items-center justify-center px-4">
//             <button id="local2-btn"
//                 class="w-full bg-yellow-900 hover:bg-yellow-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 Local game
//             </button>
//             <button id="ai2-btn"
//                 class="w-full bg-red-900 hover:bg-red-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 AI game
//             </button>
//             <button id="multiplayer2-btn"
//                 class="w-full bg-green-900 hover:bg-green-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 Multiplayer game
//             </button>
//         </div>
//     `;
// }

export function setupHome() { 
	const logoutBtn = document.getElementById('nav-logout')!;
	// const modeBtn = document.getElementById('mode-btn')!;
	
	const localBtn = document.getElementById('local-btn')!;
	const aiBtn = document.getElementById('ai-btn')!;
	const multiplayerBtn = document.getElementById('multiplayer-btn')!;

	logoutBtn?.addEventListener('click', async () => {
		navigateTo('login');
	});

	// const panels = ['modes-panel'];
	// function closeAllPanels() {
    //     panels.forEach((panelId) => {
    //         const panel = document.getElementById(panelId)!;
    //         const content = panel.querySelector('.content') as HTMLElement | null;
    //         panel.classList.remove('active', 'scale-100');
    //         panel.classList.add('scale-0');
    //         if (content) content.innerHTML = '';
    //     });

    //     document.body.classList.remove('panel-open');
    // }
	
	// function openPanel(panelId: string, contentId: string, html: string) {
    //     closeAllPanels();

    //     const panel = document.getElementById(panelId)!;
    //     const content = document.getElementById(contentId)!;

    //     content.innerHTML = html;
    //     panel.classList.add('active');
	// 	panel.classList.remove('scale-0', 'pointer-events-none');

    //     document.body.classList.add('panel-open');
    // }

    // function closePanelFunc(panelId: string, contentId: string) {
    //     const panel = document.getElementById(panelId)!;
    //     const content = document.getElementById(contentId)!;

	// 	panel.classList.remove('active');
	// 	panel.classList.add('scale-0', 'pointer-events-none');
    //     content.innerHTML = '';

    //     document.body.classList.remove('panel-open');
    // }

	// modeBtn?.addEventListener('click', async () => {
	// 	openPanel('modes-panel', 'modes-panel-content', renderModesPanel());
	// });

	// document.getElementById('close-modes-panel')?.addEventListener('click', () => {
	// 	closePanelFunc('modes-panel', 'modes-panel-content');
	// });
}