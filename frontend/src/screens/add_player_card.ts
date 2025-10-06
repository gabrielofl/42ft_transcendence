import template from "./add_player_card.html?raw";

/**
 * Crea y configura una tarjeta para añadir jugadores.
 * Devuelve el elemento HTML de la tarjeta y una función para limpiar los eventos.
 * @returns {{ cardElement: HTMLDivElement, cleanup: () => void }}
 */
export function createAddPlayerCard(): { cardElement: HTMLDivElement, cleanup: () => void } {
    const container = document.createElement('div');
    container.innerHTML = template;
    const cardElement = container.firstChild as HTMLDivElement;

    console.log(cardElement);
    const menu = cardElement.querySelector<HTMLDivElement>('#add-player-menu');
    const addAiPlayerBtn = cardElement.querySelector<HTMLAnchorElement>('#add-ai-player');
    const addLocalPlayerBtn = cardElement.querySelector<HTMLAnchorElement>('#add-local-player');

    const toggleMenu = (event: MouseEvent) => {
        event.stopPropagation();
        menu?.classList.toggle('hidden');
    };

    const handleAddAiPlayer = (event: MouseEvent) => {
        event.preventDefault();
        console.log("Adding AI Player...");
        menu?.classList.add('hidden');
        // Aquí iría la lógica para añadir un jugador IA
    };

    const handleAddLocalPlayer = (event: MouseEvent) => {
        event.preventDefault();
        console.log("Adding Local Player...");
        menu?.classList.add('hidden');
        // Aquí iría la lógica para añadir un jugador local
    };

    cardElement.addEventListener('click', toggleMenu);
    addAiPlayerBtn?.addEventListener('click', handleAddAiPlayer);
    addLocalPlayerBtn?.addEventListener('click', handleAddLocalPlayer);

    const cleanup = () => {
        cardElement.removeEventListener('click', toggleMenu);
        addAiPlayerBtn?.removeEventListener('click', handleAddAiPlayer);
        addLocalPlayerBtn?.removeEventListener('click', handleAddLocalPlayer);
    };

    return { cardElement, cleanup };
}