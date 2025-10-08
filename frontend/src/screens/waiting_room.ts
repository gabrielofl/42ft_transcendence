import view from "./waiting_room.html?raw";
import userCard from "./user-card.html?raw";
import { ClientSocketPlayer } from "./Game/Player/ClientSocketPlayer";
import { ClientGameSocket } from "./Game/ClientGameSocket";
import { SelectedMap } from "./Game/map-selection";
import { createAddPlayerCard } from "./add_player_card";
import { AllReadyMessage } from "@shared/types/messages";
import { navigateTo } from "../navigation";

let cards: { cardElement: HTMLDivElement, cleanup: () => void }[] = [];

export let localPlayersUserName: [number, string][] = [];
let gameCode;

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
    // ClientGameSocket.GetInstance().UIBroker.Subscribe("AllReady", (msg) => allReady(msg));

/*     if (container) {
        container.innerHTML = players.map(player => createPlayerCard(userCard, player)).join('');
    } */
}

function mocklocalPlayersUserName_loai(): [number, string][] {
    return [[1, "Jorge"], [0, "AI"]];
}

function mocklocalPlayersUserName_loloaiai() {
    return [[1, 'Jorge'], [-1, 'Pedro'], [0, 'AI1'], [0, 'AI2']];
}

function mocklocalPlayersUserName_lolo() {
    return [[1, 'Jorge'], [-1, 'Gabriel']];
}

function mocklocalPlayersUserName_loso() {
    return [[1, 'Jorge'], [42, 'Gabriel']];
}

function mocklocalPlayersUserName_lolo3() {
    return [[1, 'Jorge'], [-1, 'Gabriel']];
}

function mocklocalPlayersUserName_lolo2() {
    return [[43, 'David'], [-43, 'Gabriel']];
}

function mocklocalPlayersUserName_losososo() {
    return [[1, 'Jorge'], [42, 'Gabriel'], [43, 'David'], [44, 'Miguel']];
}

function allReady(msg: AllReadyMessage) {
    localPlayersUserName = mocklocalPlayersUserName_loai();
   //  const isLocal = msg.playerData.name === "Gabriel"; // Asumiendo que "Gabriel" es el jugador local
/*     let player: APlayer;
    if (isLocal) {
        player = new LocalPlayer(clientgame, msg.playerData.name, "d", "a");
    } else {
        player = new ClientSocketPlayer(clientgame, msg.playerData.name);
    } */
   navigateTo("game");
   ClientGameSocket.Canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
   ClientGameSocket.GetInstance().CreateGame();
}

function addPlayer() {
    // Buscar tarjeta libre en cards y meter tarjeta
    //card = cards.find();
    // if (card)
    // card.innerHTML = createUserCard();
}