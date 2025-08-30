import { IPowerUp } from "./IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleShieldEffect } from "./Effects/PaddleShieldEffect";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { APlayerEffect, PlayerEffectFactory } from "./Effects/APlayerEffect";
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
       
        MessageBroker.Publish(GameEvent.SelfEffect, factory);
    }
}
