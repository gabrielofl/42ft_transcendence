import { IPowerUp } from "./IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleLenEffect } from "./Effects/PaddleLenEffect";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { APlayerEffect, PlayerEffectFactory } from "./Effects/APlayerEffect";
import { Game } from "../Game/Game";

export class PowerUpMoreLength implements IPowerUp {
    public ImgPath: string;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLong.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleLenEffect(this.game, this.ImgPath, 4);
            effect.Origin = player;
            return effect;
        };

        MessageBroker.Publish(GameEvent.SelfEffect, factory);
    }
}
