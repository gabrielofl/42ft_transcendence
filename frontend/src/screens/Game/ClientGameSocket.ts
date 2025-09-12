import { MessageBroker } from "@shared/utils/MessageBroker";
import { Game } from "./Game";
import { AllMessages, CreatePowerUpMessage, Message, MessagePayloads, MessageTypes, PickPowerUpBoxMessage } from "@shared/types/messages";
import { APlayer } from "../Player/APlayer";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { ClientPowerUpBox } from "../PowerUps/ClientPowerUpBox";

export class ClientGameSocket {
    private game: Game;
    // private handlers: Partial<{[T in MessageTypes]: (msg: Extract<AllMessages, { type: T }>) => void}>;
    private handlers: Partial<{[K in MessageTypes]: (payload: MessagePayloads[K]) => void }>;

    constructor(game: Game) {
        this.game = game;

        this.handlers = {
            "CreatePowerUp": (m: MessagePayloads["CreatePowerUp"]) => this.HandleCreatePowerUp(m),
            "PickPowerUpBox": (m: MessagePayloads["PickPowerUpBox"]) => this.HandlePickPowerUpBox(m),
        };
    }

    public RecieveSocketMessage(payload: any) {
        const msg = payload as AllMessages;

        const handler = this.handlers[msg.type as AllMessages["type"]];
        if (handler) {
            handler(msg as any); // TS asegura narrow, pero aquí necesitamos el cast
        } else {
            console.warn("Mensaje desconocido:", msg);
        }
    }

    private HandleCreatePowerUp(msg: CreatePowerUpMessage): void {
        console.log("Handling PowerUp");
        new ClientPowerUpBox(this.game, msg.id, msg.x, msg.z, msg.powerUpType);
    }

    private HandlePickPowerUpBox(msg: PickPowerUpBoxMessage): void {
        console.log("Handling PickedPowerUp");
        let players = this.game.GetPlayers();
        let target: APlayer | undefined = players.find(p => p.GetName() === msg.username);
        let box: IPowerUpBox | undefined = this.game.PowerUps.GetAll().find(p => p.ID === msg.id);

        if (target && box)
        {
            box.PickUp(target);
        }

        // Reenviar el mensaje para que puedan recibirlo los componentes html.
        // this.msg.Publish(PickPowerUpBoxMessage, msg);
    }
}