import { MessageBroker } from "@shared/utils/MessageBroker";
import { Game } from "./Game";
import { AllMessages, CreatePowerUpMessage, Message, MessagePayloads, MessageTypes } from "@shared/types/messages";
import { PowerUpBox } from "../PowerUps/PowerUpBox";

export class ClientGameSocket {
    private game: Game;
    private handlers: Partial<{[T in MessageTypes]: (msg: Extract<AllMessages, { type: T }>) => void}>;

    constructor(game: Game) {
        this.game = game;

        this.handlers = {
            "CreatePowerUp": (m: Extract<AllMessages, { type: "CreatePowerUp" }>) => this.HandleCreatePowerUp(m),
            "GameStart": (m: Extract<AllMessages, { type: "GameStart" }>) => this.HandleCreatePowerUp(m),
        };
    }

    public RecieveSocketMessage(payload: any) {
        const msg = payload as AllMessages;

        const handler = this.handlers[msg.type];
        if (handler) {
            handler(msg); // TS asegura narrow, pero aquí necesitamos el cast
        } else {
            console.warn("Mensaje desconocido:", msg);
        }
    }

    private HandleCreatePowerUp(msg: CreatePowerUpMessage) {
        new PowerUpBox(this.game, msg.x, msg.z, msg.powerUpType);
    }
}