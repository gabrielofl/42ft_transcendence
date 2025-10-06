export interface PlayerCardElements {
  root: HTMLElement;
  avatar: HTMLImageElement;
  profileLinks: NodeListOf<HTMLAnchorElement>;
  username: HTMLElement;
  statusIndicator: HTMLElement;
  statusTooltip: HTMLElement;
  score: HTMLElement;
}
import template from "./user_card.html?raw";

/**
 * Crea dinámicamente una tarjeta de jugador basada en la plantilla HTML.
 * Retorna tanto el nodo raíz como referencias a sus elementos internos.
 */
export function createPlayerCard(): PlayerCardElements {
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
