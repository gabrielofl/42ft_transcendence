import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleSpeedEffect } from "./Effects/PaddleSpeedEffect";
import { AGame } from "../abstract/AGame";

export class PowerUpSpeedDown implements IPowerUp {
    public ImgPath: string;
    private game: AGame;

    constructor(game: AGame) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedDown.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "SpeedDown",
            origin: player.GetName(),
        });
    }
}
