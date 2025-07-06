import { IPowerUp } from "./IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleShieldEffect } from "./Effects/PaddleShieldEffect";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { APlayerEffect, PlayerEffectFactory } from "./Effects/APlayerEffect";

export class PowerUpShield implements IPowerUp {
    public ImgPath: string;

    constructor() {
        this.ImgPath = "textures/PowerUpShield.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleShieldEffect(this.ImgPath);
            effect.Origin = player;
            return effect;
        };
       
        MessageBroker.Publish<PlayerEffectFactory>(GameEvent.SelfEffect, factory);
    }
}
