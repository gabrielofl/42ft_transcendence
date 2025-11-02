import { replaceTemplatePlaceholders } from "./utils";
import userCardTemplate from "./user-card.html?raw";
const API_BASE_URL = import.meta.env.VITE_BASE_URL_API;
import { UserData } from "@shared/types/messages";

export function createUserCard(userData: UserData): string {
	const avatarUrl = userData.avatar
		? `${API_BASE_URL}/profile/avatar/${userData.avatar}`
		: 'default.jpg';

	const statusInfo = getStatusInfo(userData.status);
	
	const scoreDisplay = userData.show_scores_publicly === 1 
		? `${userData.score ?? 0} pts` : '🔒 Private';

	return replaceTemplatePlaceholders(userCardTemplate, {
		borderColor: '[--primary-color]',
		username: userData.username,
		avatarUrl,
		...statusInfo,
		score: scoreDisplay,
	});
}

function getStatusInfo(status: number): { statusColor: string, statusText: string } {
	if (status === 1) {
		return { statusColor: "bg-[--success-color]", statusText: "Online" };
	}
	return { statusColor: "bg-gray-400", statusText: "Offline" };
}

/* export interface PlayerCardElements {
  root: HTMLElement;
  avatar: HTMLImageElement;
  profileLinks: NodeListOf<HTMLAnchorElement>;
  username: HTMLElement;
  statusIndicator: HTMLElement;
  statusTooltip: HTMLElement;
  score: HTMLElement;
}
import template from "./user-card.html?raw"; */

/**
 * Crea dinámicamente una tarjeta de jugador basada en la plantilla HTML.
 * Retorna tanto el nodo raíz como referencias a sus elementos internos.
 */
/* export function createPlayerCard(): PlayerCardElements {
	const container = document.createElement('div');
	container.innerHTML = template;
	const root = container.firstElementChild as HTMLElement;

	// Referencias directas a los subelementos
	const avatar = root.querySelector('img') as HTMLImageElement;
	const profileLinks = root.querySelectorAll('.open-profile') as NodeListOf<HTMLAnchorElement>;
	const username = root.querySelector('.username') as HTMLElement;
	const statusIndicator = root.querySelector('.status-indicator') as HTMLElement;
	const statusTooltip = root.querySelector('.status-tooltip') as HTMLElement;
	const score = root.querySelector('.score') as HTMLElement;

	return { root, avatar, profileLinks, username, statusIndicator, statusTooltip, score };
}
 */
