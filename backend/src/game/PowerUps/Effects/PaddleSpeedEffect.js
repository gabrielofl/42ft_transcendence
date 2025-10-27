import { APlayerEffect } from "../../abstract/APlayerEffect.js";
import { APlayer } from "../../Player/APlayer.js";
import { logToFile } from "../../Game/logger.js";

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
        logToFile("PaddleSpeedEffect Execute Start");
        if (this.disposed) 
            return;

        target.GetPaddle().Speed = this.speed;
        super.Execute(target);
        logToFile("PaddleSpeedEffect Execute End");
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
