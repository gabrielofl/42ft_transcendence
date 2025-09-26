import { APlayer } from "@shared/Player/APlayer";
import { ClientGame } from "./ClientGame";
import { IPaddle } from "@shared/interfaces/IPaddle";
import { ClientPaddle } from "@shared/ClientPaddle";

export class ClientSocketPlayer extends APlayer {
    protected game: ClientGame;

    constructor(game: ClientGame, name: string) {
        super(game, name);
        this.game = game;
    }
    
    public ProcessPlayerAction(inputMap: Record<string, boolean>): void {}

    public InstancePaddle(): IPaddle {
        return new ClientPaddle(this.game, this, 8);
    }
}