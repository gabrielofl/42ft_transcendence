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
}