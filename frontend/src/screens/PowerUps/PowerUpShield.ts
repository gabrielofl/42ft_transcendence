import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleShieldEffect } from "./Effects/PaddleShieldEffect";
import { Game } from "../Game/Game";

export class PowerUpShield implements IPowerUp {
    public ImgPath: string;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpShield.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleShieldEffect(this.game, this.ImgPath);
            effect.Origin = player;
            return effect;
        };
       
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "Shield",
            origin: player.GetName(),
        });
    }
}
