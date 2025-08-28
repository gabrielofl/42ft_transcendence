import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { AGame } from "../abstract/AGame";

export class PowerUpLessLength implements IPowerUp {
    public ImgPath: string;
    private game: AGame;

    constructor(game: AGame) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLessLength.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "LessLength",
            origin: player.GetName(),
        });
    }
}
