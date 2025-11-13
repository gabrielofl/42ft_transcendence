import { API_BASE_URL } from "./config";

async function fetchAvaxPacket(tournamentId?: number): Promise<{
  id: number | null;
  matches: Array<{
    matchId: number;
    player1: string;
    player2: string;
    winner: string;
    score1: number;
    score2: number;
    timestamp: number;
    txhash: string | null;
  }>;
  finalBracket: string | null;
  finalBracketTx: string | null;
  finished: boolean;
}> {
  let id = tournamentId ?? null;

  if (id == null) {
    const s = await fetch(`${API_BASE_URL}/api/tournament/current`, { credentials: 'include' });
    const j = await s.json();
    id = j?.id ?? null;
  }

  if (id == null) {
    return { id: null, matches: [], finalBracket: null, finalBracketTx: null, finished: false };
  }

  const r = await fetch(`${API_BASE_URL}/tournament/avalanche/${id}`, { credentials: 'include' });
  if (!r.ok) throw new Error('Avalanche endpoint failed');
  const data = await r.json();
  const finished = !!data.finalBracket && data.finalBracket.length > 0;

  return {
    id,
    matches: data.matches || [],
    finalBracket: data.finalBracket || null,
    finalBracketTx: data.finalBracketTx || null,
    finished
  };
}

function renderTabs() {
  return `
    <div class="flex flex-col gap-2">
      <!-- Row 1: Tabs -->
      <div class="flex items-center gap-2 flex-wrap">
        ${tabButton('summary','Summary')}
        ${tabButton('matches','Matches')}
        ${tabButton('bracket','Final Bracket')}
      </div>

      <!-- Row 2: Selector + updated time + refresh -->
      <div class="flex items-center gap-2 justify-start flex-wrap">
        <label class="text-xs text-gray-400">Tournament:</label>
        <select id="avax-select"
                class="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded"></select>
        <span id="avax-updated" class="text-xs text-gray-400"></span>
        <button id="avax-refresh" class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">Refresh</button>
      </div>
    </div>
  `;
}

function renderSummary(id: number|null, matchesCount: number, hasBracket: boolean, finalTx?: string|null) {
  return sectionCard(`
    <div class="grid gap-2 text-sm">
      <div><strong>Network:</strong> Avalanche Fuji</div>
      <div class="flex items-center gap-2">
        <strong>Contract:</strong>
        <span class="font-mono truncate">…${(window as any).CONTRACT_ADDRESS?.slice(-10) || 'set in env'}</span>
        <button class="text-xs px-2 py-1 bg-gray-700 rounded" id="copy-contract">Copy</button>
      </div>
      <div><strong>Tournament ID:</strong> ${id ?? 'None'}</div>
      <div><strong>On-chain matches:</strong> ${matchesCount}</div>
      <div><strong>Final bracket stored:</strong> ${hasBracket ? 'Yes' : 'No'}</div>
      ${
        finalTx
          ? `<div class="flex items-center gap-2"><strong>Final bracket tx:</strong>
               <a target="_blank" class="underline text-blue-300 break-all" href="${snowtraceTx(finalTx)}">${finalTx}</a>
               <button class="text-xs px-2 py-1 bg-gray-700 rounded" id="copy-finaltx">Copy</button>
             </div>`
          : ''
      }
    </div>
  `);
}

function renderMatches(matches: any[]) {
  if (!matches.length) return sectionCard(`No matches yet`);
  return `
    <div class="grid gap-2">
      ${matches.map((m, i) => sectionCard(`
        <div class="flex items-start justify-between gap-2">
          <div class="text-sm">
            <div class="text-gray-300">Match #${i+1} (id: ${m.matchId})</div>
            <div class="text-lg font-semibold">${m.player1} <span class="opacity-70">(${m.score1})</span> vs ${m.player2} <span class="opacity-70">(${m.score2})</span></div>
            <div>Winner: <span class="font-medium">${m.winner}</span></div>
            <div class="text-xs text-gray-400">${new Date(Number(m.timestamp)*1000).toLocaleString()}</div>
          </div>
          <div class="text-xs text-right">
            ${
              m.txhash
                ? `<a target="_blank" class="underline text-blue-300 break-all" href="${snowtraceTx(m.txhash)}">View Tx</a>
                   <button class="ml-2 px-2 py-1 bg-gray-700 rounded" data-copy="${m.txhash}">Copy</button>`
                : `<span class="text-gray-500">No tx recorded</span>`
            }
          </div>
        </div>
      `)).join('')}
    </div>
  `;
}

function renderBracket(bracketJson: string|null) {
  if (!bracketJson) return sectionCard('Final bracket not available yet');
  return sectionCard(`
    <div class="flex items-center justify-between">
      <div class="font-semibold">Final Bracket JSON</div>
      <div class="flex items-center gap-2">
        <button id="copy-bracket" class="px-2 py-1 text-xs bg-gray-700 rounded">Copy</button>
        <button id="toggle-bracket" class="px-2 py-1 text-xs bg-gray-700 rounded">Toggle</button>
      </div>
    </div>
    <pre id="bracket-pre" class="mt-2 whitespace-pre-wrap text-xs bg-gray-900 p-2 rounded overflow-x-auto">${bracketJson}</pre>
  `);
}

export async function fillAvaxPanel(contentEl: HTMLElement, chosenId?: number) {
  try {
    contentEl.innerHTML = `
      ${renderTabs()}
      <div id="avax-tab-summary" class="mt-3"></div>
      <div id="avax-tab-matches" class="mt-3 hidden"></div>
      <div id="avax-tab-bracket" class="mt-3 hidden"></div>
    `;

    const histRes = await fetch(`${API_BASE_URL}/api/tournaments/history?limit=50`, { credentials: 'include' });
    const hist = await histRes.json();
    const select = document.getElementById('avax-select') as HTMLSelectElement;

    select.innerHTML = `<option value="">Current</option>` +
      (hist.tournaments || []).map((t: any) =>
        `<option value="${t.id}">#${t.id} — ${t.name ?? 'Tournament'} ${t.finished_at ? `(${new Date(t.finished_at).toLocaleDateString()})` : ''}</option>`
      ).join('');

    await renderTournamentIntoPanel(contentEl, chosenId ? Number(chosenId) : undefined);

    select.addEventListener('change', async () => {
      const selected = select.value ? Number(select.value) : undefined;
      await renderTournamentIntoPanel(contentEl, selected);
    });

    document.getElementById('avax-refresh')!.addEventListener('click', async () => {
      const selected = select.value ? Number(select.value) : undefined;
      await renderTournamentIntoPanel(contentEl, selected);
    });

  } catch (err) {
    console.error(err);
    contentEl.innerHTML = sectionCard(`<div class="text-red-400">Failed to fetch Avalanche data.</div>`);
  }
}

async function renderTournamentIntoPanel(contentEl: HTMLElement, id?: number) {
  const { id: realId, matches, finalBracket, finalBracketTx, finished } = await fetchAvaxPacket(id);

  el('avax-tab-summary').innerHTML = renderSummary(realId, matches.length, !!finalBracket, finalBracketTx);
  el('avax-tab-matches').innerHTML = renderMatches(matches);
  el('avax-tab-bracket').innerHTML = renderBracket(finalBracket);

  el('avax-updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;

  const contractAddr = (window as any).CONTRACT_ADDRESS || '';
  const copyContract = el('copy-contract');
  if (copyContract && contractAddr) copyContract.addEventListener('click', () => copyText(contractAddr));

  const copyFinalTx = document.getElementById('copy-finaltx');
  if (copyFinalTx && finalBracketTx) copyFinalTx.addEventListener('click', () => copyText(finalBracketTx));

  contentEl.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyText((btn as HTMLElement).getAttribute('data-copy')!));
  });

  const pre = document.getElementById('bracket-pre');
  const toggle = document.getElementById('toggle-bracket');
  const copyB = document.getElementById('copy-bracket');
  if (toggle && pre) toggle.addEventListener('click', () => pre.classList.toggle('hidden'));
  if (copyB && finalBracket) copyB.addEventListener('click', () => copyText(finalBracket));

}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function el(id: string) { return document.getElementById(id)!; }

function snowtraceTx(tx: string) {
  return `https://testnet.snowtrace.io/tx/${tx}`;
}

function tabButton(id: string, label: string) {
  return `<button data-tab="${id}" class="tab-btn px-3 py-1 rounded bg-gray-700 hover:bg-gray-600">${label}</button>`;
}

function sectionCard(inner: string) {
  return `<div class="rounded border border-gray-700 bg-gray-800 p-3">${inner}</div>`;
}
