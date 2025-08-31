import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleSpeedEffect } from "./Effects/PaddleSpeedEffect";
import { GameEvent } from "@shared/types/types";
import { Game } from "../Game/Game";

export class PowerUpSpeedDown implements IPowerUp {
    public ImgPath: string;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedDown.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        const factory = () => {
            const effect = new PaddleSpeedEffect(this.game, this.ImgPath, -0.2);
            effect.Origin = player;
            return effect;
        };

        this.game.MessageBroker.Publish(GameEvent.MassEffect, factory);
    }
}
