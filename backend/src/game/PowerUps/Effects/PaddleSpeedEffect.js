import { APlayerEffect } from "../../abstract/APlayerEffect.js";
import { APlayer } from "../../Player/APlayer.js";

export class PaddleSpeedEffect extends APlayerEffect {
    speed;

    constructor(game, imgPath, speed, durationMs = 5000) {
        super(game, imgPath, durationMs);
        this.speed = speed;
        this.IsNegative = speed < 0;
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns 
     */
    Execute(target) {
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

    /**
     * 
     * @param {APlayer} target 
     */
    Undo(target) {
        target.GetPaddle().ResetSpeed();
        this.Dispose();
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns {boolean}
     */
    CanExecute(target) {
        return !(this.IsNegative && target.Shields.GetAll().Any());
    }
}
