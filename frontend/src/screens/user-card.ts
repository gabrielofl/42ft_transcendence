import { replaceTemplatePlaceholders } from "./utils";
import userCardTemplate from "./user-card.html?raw";
import { API_BASE_URL } from "./config";
import { UserData } from "@shared/types/messages";

export function createUserCard(userData: UserData): string {
	const avatarUrl = userData.avatar
		? `${API_BASE_URL}/profile/avatar/${userData.avatar}`
		: 'default.jpg';

	const statusInfo = getStatusInfo(userData.status);

	return replaceTemplatePlaceholders(userCardTemplate, {
		borderColor: '[--primary-color]',
		username: userData.username,
		avatarUrl,
		...statusInfo,
		score: (userData.score ?? 0).toString(),
	});
}

function getStatusInfo(status: number): { statusColor: string, statusText: string } {
	switch (status) {
		case 1:
			return { statusColor: "bg-[--success-color]", statusText: "Online" };
		case 2:
			return { statusColor: "bg-[--warning-color]", statusText: "Inactive" };
		default:
			return { statusColor: "bg-gray-400", statusText: "Offline" };
	}
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
