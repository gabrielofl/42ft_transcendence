import { ClientGame } from "../ClientGame";
import { ClientPaddle } from "../ClientPaddle";
import { APlayer } from "./APlayer";

export class ClientSocketPlayer extends APlayer {
    protected game: ClientGame;

    constructor(game: ClientGame, name: string) {
        super(game, name);
        this.game = game;
    }
    
    public ProcessPlayerAction(inputMap: Record<string, boolean>): void {}

    public InstancePaddle(): ClientPaddle {
        return new ClientPaddle(this.game, this, 8);
    }
}