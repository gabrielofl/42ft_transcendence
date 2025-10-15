// add_player_card.ts
import template from "./add_player_card.html?raw";

type Opts = {
  onAddAI: () => void;
  onAddLocal: () => void;
};

export function createAddPlayerCard(opts: Opts): {
  cardElement: HTMLDivElement;
  cleanup: () => void;
} {
  const container = document.createElement("div");
  container.innerHTML = template;
  const cardElement = container.firstChild as HTMLDivElement;

  // mark as empty by default; waiting-room will flip this when it fills the slot
  cardElement.dataset.empty = "true";

  const menu = cardElement.querySelector<HTMLDivElement>("#add-player-menu");
  const addAiPlayerBtn = cardElement.querySelector<HTMLAnchorElement>("#add-ai-player");
  const addLocalPlayerBtn = cardElement.querySelector<HTMLAnchorElement>("#add-local-player");

  const toggleMenu = (event: MouseEvent) => {
    event.stopPropagation();
    // only open menu when the slot is empty
    if (cardElement.dataset.empty === "true") {
      menu?.classList.toggle("hidden");
    }
  };

  const handleAddAiPlayer = (event: MouseEvent) => {
    event.preventDefault();
    menu?.classList.add("hidden");
    opts.onAddAI?.();
  };

  const handleAddLocalPlayer = (event: MouseEvent) => {
    event.preventDefault();
    menu?.classList.add("hidden");
    opts.onAddLocal?.();
  };

  // Click anywhere on the card to toggle the add-player menu (if empty)
  cardElement.addEventListener("click", toggleMenu);
  addAiPlayerBtn?.addEventListener("click", handleAddAiPlayer);
  addLocalPlayerBtn?.addEventListener("click", handleAddLocalPlayer);

  const cleanup = () => {
    cardElement.removeEventListener("click", toggleMenu);
    addAiPlayerBtn?.removeEventListener("click", handleAddAiPlayer);
    addLocalPlayerBtn?.removeEventListener("click", handleAddLocalPlayer);
  };

  return { cardElement, cleanup };
}
