import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { PaddleLenEffect } from "./Effects/PaddleLenEffect";
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

        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "MoreLength",
            origin: player.GetName(),
        });
    }
}
