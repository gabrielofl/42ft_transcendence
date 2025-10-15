import { ServerPaddle } from "../Collidable/ServerPaddle.js";
import { APlayer } from "./APlayer.js";

export class ServerSocketPlayer extends APlayer {
    game;

    constructor(game, name) {
        super(game, name);
        this.game = game;
    }
    
    /**
     * 
     * @param {Record<string, boolean>} inputMap 
     */
    ProcessPlayerAction(inputMap) {}

    /**
     * 
     * @returns {IPaddle}
     */
    InstancePaddle() {
        return new ServerPaddle(this.game, this, 8);
    }
}