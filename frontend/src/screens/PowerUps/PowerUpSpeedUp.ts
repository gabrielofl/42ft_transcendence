import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleSpeedEffect } from "./Effects/PaddleSpeedEffect";
import { Game } from "../Game/Game";

export class PowerUpSpeedUp implements IPowerUp {
    public ImgPath: string;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedUp.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleSpeedEffect(this.game, this.ImgPath, 0.8);
            effect.Origin = player;
            return effect;
        };

        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "SpeedUp",
            origin: player.GetName(),
        });
    }
}
