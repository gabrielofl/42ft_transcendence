import { APlayerEffect } from "@shared/abstract/APlayerEffect";
import { ClientGame } from "../../ClientGame";
import { APlayer } from "../../Player/APlayer";

export class PaddleSpeedEffect extends APlayerEffect {
    private speed: number;

    constructor(game: ClientGame, imgPath: string, speed: number, durationMs: number = 5000) {
        super(game, imgPath, durationMs);
        this.speed = speed;
        this.IsNegative = speed < 0;
    }

    public Execute(target: APlayer): void {
        if (this.disposed) 
            return;

        target.GetPaddle().Speed = this.speed;
        this.game.MessageBroker.Publish("AppliedEffect", {
            type: "AppliedEffect",
            effect: this.IsNegative ? "SpeedDown" : "SpeedUp",
            origin: target.GetName()
        });
        super.Execute(target);
    }

    public Undo(target: APlayer): void {
        // target.GetPaddle().ResetSpeed();
        this.Dispose();
    }

    public CanExecute(target: APlayer): boolean {
        return !(this.IsNegative && target.Shields.GetAll().Any());
    }
}
