import view from "./waiting_room.html?raw";
import userCard from "./user_card.html?raw";
import { ClientSocketPlayer } from "./Game/Player/ClientSocketPlayer";
import { ClientGameSocket } from "./Game/ClientGameSocket";
import { SelectedMap } from "./Game/map-selection";
import { createAddPlayerCard } from "./add_player_card";

let cards: { cardElement: HTMLDivElement, cleanup: () => void }[] = [];

export function renderWaitingRoom(): void {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = view;

    const container = document.getElementById('player-cards-container');

    SelectedMap.spots.forEach(_ => {
        console.log("Creando tarjeta");
        let card = createAddPlayerCard();
        cards.push(card);
        container?.appendChild(card.cardElement);
    });

    // ClientGameSocket.GetInstance().UIBroker.Subscribe("AddPlayer", (msg) => addPlayer(msg));

/*     if (container) {
        container.innerHTML = players.map(player => createPlayerCard(userCard, player)).join('');
    } */
}