import { avatarImgHTML } from "./fallback-avatar";

export type PreMatch = {
  p1: any;
  p2: any;
  p1Pts?: number;
  p2Pts?: number;
};

type Opts = {
  mountIn?: string | HTMLElement;
  subtitle?: string;
  autoStartMs?: number;
  onStart?: () => void;
  getDisplayName?: (u: any) => string;
};

export function renderPreTournamentView(matches: PreMatch[], opts: Opts = {}) {
  const {
    mountIn = 'main',
    autoStartMs = 5000,
    onStart,
    getDisplayName = (u: any) => (typeof u === 'number' ? `User #${u}` : String(u ?? '')),
  } = opts;
	

  const mount = typeof mountIn === 'string' ? document.getElementById(mountIn) : mountIn;
  if (!mount) return;

  const total = matches.length;

	mount.innerHTML =
  `
      <div class="w-full">
        <p id="pre-tourney-countdown" class="block text-center text-sm text-green-300 pb-4"></p>

        <div id="pre-tourney-list" class="grid grid-cols-1 gap-4"></div>
      </div>
    `
    ;

  const list = mount.querySelector('#pre-tourney-list') as HTMLElement;

  const rowHtml = (m: PreMatch, idx: number) => {
    const A = getDisplayName(m.p1).toUpperCase();
    const B = getDisplayName(m.p2).toUpperCase();
    const aPts = (m.p1Pts ?? '—');
    const bPts = (m.p2Pts ?? '—');

    return `
      <div class="flex justify-between items-center border-2 border-[--primary-color] p-4 gap-4">
        <!-- Player A -->
        <div class="player-card border-[--primary-color]">
          <div class="ml-3 flex flex-col">
            <div class="flex items-center space-x-2">
			${avatarImgHTML(undefined, getDisplayName(m.p1))}
              <span class="w-3 h-3 rounded-full bg-[--warning-color]"></span>
              <span class="font-bold text-white">${A}</span>
            </div>
            <div class="text-red-500 font-bold text-sm">${aPts} pts</div>
          </div>
        </div>

        <div class="border-2 border-[--primary-color] px-12 mx-6 py-2 text-white neon-border">
          VS
        </div>

        <!-- Player B -->
        <div class="player-card border-[--primary-color]">
          <div class="ml-3 flex flex-col">
            <div class="flex items-center space-x-2">
			${avatarImgHTML(undefined, getDisplayName(m.p2))}
              <span class="w-3 h-3 rounded-full bg-[--warning-color]"></span>
              <span class="font-bold text-white">${B}</span>
            </div>
            <div class="text-red-500 font-bold text-sm">${bPts} pts</div>
          </div>
        </div>
      </div>
    `;
  };

  list.innerHTML = matches.map(rowHtml).join('');

  const cdEl = mount.querySelector('#pre-tourney-countdown') as HTMLElement | null;
  if (cdEl && autoStartMs && onStart) {
    let remaining = Math.ceil(autoStartMs / 1000);
    cdEl.textContent = `Starting in ${remaining}s…`;
    const t = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(t);
        cdEl.textContent = 'Starting…';
        try { onStart(); } catch {}
        return;
      }
      cdEl.textContent = `Starting in ${remaining}s…`;
    }, 1000);
  }
}
