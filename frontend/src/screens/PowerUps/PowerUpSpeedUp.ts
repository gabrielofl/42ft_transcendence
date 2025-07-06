import { IPowerUp } from "./IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleSpeedEffect } from "./Effects/PaddleSpeedEffect";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { PlayerEffectFactory } from "./Effects/APlayerEffect";

export class PowerUpSpeedUp implements IPowerUp {
    public ImgPath: string;

    constructor() {
        this.ImgPath = "textures/PowerUpSpeedUp.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleSpeedEffect(this.ImgPath, 0.8);
            effect.Origin = player;
            return effect;
        };

        MessageBroker.Publish<PlayerEffectFactory>(GameEvent.SelfEffect, factory);
    }
}
