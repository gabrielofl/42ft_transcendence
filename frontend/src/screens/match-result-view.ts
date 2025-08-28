export type ResultScope = 'match' | 'tournament';
export type ResultOutcome = 'win' | 'lose' | 'final';

type ResultOptions = {
  outcome: ResultOutcome;
  scope?: ResultScope;
  mountIn?: string | HTMLElement;
  frameImgUrl?: string;
  frameLabel?: string;
  pointsEarned?: number;
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
    <div class="w-full max-w-3xl mx-auto px-6">
      <div class="border-2 border-[--primary-color] p-8 text-center mb-10">
        <h2 class="text-3xl font-extrabold ${result.color} mb-3 tracking-wide">${result.title}</h2>
        <p class="text-white/90">${result.subtitle}</p>
        <div class="text-4xl mt-6">${result.emoji}</div>
      </div>

      <div class="text-left text-2xl text-white/80 mb-2">${scope === 'tournament' ? 'Tournament' : ''}</div>

      <div class="flex flex-col items-center">
        ${
          frameImgUrl
            ? `<img src="${frameImgUrl}" class="w-[260px] h-[260px] object-cover border-2 border-[--primary-color]" alt="frame" />`
            : `<div class="w-[260px] h-[260px] bg-purple-900/40 border-2 border-[--primary-color]"></div>`
        }

        <div class="mt-6 text-center">
          <p class="text-[10px] tracking-widest text-green-300">
            ${outcome === 'win' ? 'CONGRATULATION!!' : 'BETTER LUCK NEXT TIME'}
          </p>
          ${
            typeof pointsEarned === 'number'
              ? `<p class="text-[12px] text-cyan-300 font-semibold">${result.pointsPrefix} <span class="text-green-300">+${pointsEarned}PTS</span></p>`
              : ''
          }
        </div>

        <button id="result-continue"
                class="mt-6 px-6 py-2 text-sm font-bold text-pink-200 border-2 border-pink-500 hover:bg-pink-600/10 transition">
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
