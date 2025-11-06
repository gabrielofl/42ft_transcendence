import { ClientGame } from "../ClientGame";
import { ClientPaddle } from "../ClientPaddle";
import { APlayer } from "./APlayer";

export class ClientSocketPlayer extends APlayer {
    protected game: ClientGame;

    constructor(game: ClientGame, name: string, userId?: number) {
        super(game, name);
        this.game = game;
        if (userId !== undefined) {
            this.id = userId;
        }
    }
    
    public ProcessPlayerAction(inputMap: Record<string, boolean>): void {}
}