export type ResultScope = 'match' | 'tournament';
export type ResultOutcome = 'win' | 'lose' | 'final';

type ResultOptions = {
  outcome: ResultOutcome;
  scope?: ResultScope;
  mountIn?: string | HTMLElement;
  frameImgUrl?: string;
  frameLabel?: string;
  pointsEarned?: number;
  winnerName?: string;
  onContinue?: () => void;
};

const RESULT = {
  win: {
    title: 'Congratulations!',
    subtitle: 'You have won the game',
    emoji: '✨✨',
    color: 'text-yellow-300',
    pointsPrefix: 'YOU EARN',
  },
  lose: {
    title: 'Oh, you almost got it!',
    subtitle: 'You lost the game',
    emoji: '🔥🔥',
    color: 'text-pink-400',
    pointsPrefix: 'AT LEAST YOU GOT SOMETHING',
	},
  final: {
    title: 'Tournament winner!',
    subtitle: 'UNDEFEATED',
    emoji: '👑👑',
    color: 'text-green-400',
    pointsPrefix: 'TOURNAMENT LEGEND',
  },
} as const;

export function showResultOverlay(opts: ResultOptions) {
  const existing = document.getElementById('result-overlay');
  if (existing) existing.remove();

  const {
    outcome,
    scope = 'match',
    mountIn = 'main',
    frameImgUrl,
    frameLabel = scope === 'tournament' ? 'Champion' : '',
    pointsEarned,
    winnerName,
    onContinue,
  } = opts;

  const mount =
    typeof mountIn === 'string' ? document.getElementById(mountIn) : mountIn || document.body;
  if (!mount) return { destroy() {} };

  const result = RESULT[outcome];

  const overlay = document.createElement('div');
  overlay.id = 'result-overlay';
  overlay.className =
    'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm';

  overlay.innerHTML = `
    <div class="w-full max-w-4xl mx-auto px-6">
      <div class="border-2 border-[--primary-color] p-8 text-center mb-10">
        <h2 class="text-4xl font-extrabold ${result.color} mb-3 tracking-wide">${result.title}</h2>
        <p class="text-white/90 text-xl">${result.subtitle}</p>
        <div class="text-6xl mt-6">${result.emoji}</div>
      </div>

      <div class="text-center text-3xl text-white/80 mb-6 font-bold">${scope === 'tournament' ? 'TOURNAMENT CHAMPION' : ''}</div>

      <div class="flex flex-col items-center">
        ${
          frameImgUrl
            ? `<img src="${frameImgUrl}" class="w-[300px] h-[300px] object-cover border-4 border-[--primary-color] rounded-lg" alt="frame" />`
            : `<div class="w-[300px] h-[300px] bg-gradient-to-br from-purple-900/40 to-yellow-900/40 border-4 border-[--primary-color] rounded-lg flex items-center justify-center">
                <div class="text-8xl">🏆</div>
               </div>`
        }

        <div class="mt-8 text-center">
          <p class="text-sm tracking-widest text-green-300 mb-4">
            ${outcome === 'final' ? 'CONGRATULATIONS CHAMPION!!' : outcome === 'win' ? 'CONGRATULATION!!' : 'BETTER LUCK NEXT TIME'}
          </p>
          ${winnerName ? `<p class="text-2xl font-bold text-yellow-300 mb-4">🏆 ${winnerName}</p>` : ''}
          ${
            typeof pointsEarned === 'number'
              ? `<p class="text-sm text-cyan-300 font-semibold">${result.pointsPrefix} <span class="text-green-300">+${pointsEarned}PTS</span></p>`
              : ''
          }
        </div>

        <button id="result-continue"
                class="mt-8 px-8 py-3 text-lg font-bold text-pink-200 border-2 border-pink-500 hover:bg-pink-600/10 transition rounded-lg">
          CONTINUE
        </button>
      </div>
    </div>
  `;

  const parent = mount === document.body ? document.body : mount;
  parent.appendChild(overlay);

  const cleanup = () => overlay.remove();
  overlay.querySelector<HTMLButtonElement>('#result-continue')?.addEventListener('click', () => {
    cleanup();
    onContinue?.();
  });

  return { destroy: cleanup };
}
