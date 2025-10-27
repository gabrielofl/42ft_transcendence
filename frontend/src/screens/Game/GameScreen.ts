import gameTemplate from "./game.html?raw";
import { ClientGameSocket } from "./ClientGameSocket";
import { ReactiveViewModel } from "../../mvvm/ReactiveViewModel";
import { DOMBinder } from "../../mvvm/DOMBinder";
import { onScreenLeave } from "../../navigation";
const API_BASE_URL = 'https://localhost:443';
var unsubscribeFromGameLeave: () => void;

interface GameViewModel {
  [username: string]: Partial<{
    score: number;
    inventory: Record<number, { path: string }>;
    effects: string[];
  }>;
}

export const GameViewModel = new ReactiveViewModel<GameViewModel>();
const binder = new DOMBinder(GameViewModel);

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function renderGame() {
	const main = document.getElementById('main');
	if (!main) return;
	
	main.innerHTML = gameTemplate;

	const container = document.getElementById("player-cards-client");
	if (!container)
		return;

	console.log("Registrando bindings");
	binder.RegisterBindings(container.parentElement as HTMLElement);

	ClientGameSocket.GetInstance().UIBroker.Subscribe("PointMade", (msg) => {
		const obj = msg.results.reduce((acc, m) => {
			acc[m.username] = { score: m.score };
			return acc;
		}, {} as Record<string, { score: number }>);

		GameViewModel.UpdateFromObject(obj);
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("InventoryChanged", (msg) => {
		GameViewModel.UpdateFromObject( {
			[msg.username]: {
				["inventory"]: {
					[msg.slot]: {
						["path"]: msg.path 
					}
				}
			}
		});
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("EffectsChanged", (msg) => {
		GameViewModel.UpdateFromObject(msg.data);
	});

	if (!unsubscribeFromGameLeave) {
		unsubscribeFromGameLeave = onScreenLeave("game", () => {
			console.log("Vaciando GameViewModel, cerrando Socket y liberando ClientGame");
			GameViewModel.data = {};
			ClientGameSocket.GetInstance()?.DisposeGame();
		});
	}
}
