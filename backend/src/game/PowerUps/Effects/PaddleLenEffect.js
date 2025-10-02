import { APlayerEffect } from "../../abstract/APlayerEffect.js";
import { APlayer } from "../../Player/APlayer.js";
import { AGame } from "../../abstract/AGame.js";
import { logToFile } from "../../Game/logger.js";

export class PaddleLenEffect extends APlayerEffect {
    Len;

    /**
     * 
     * @param {AGame} game 
     * @param {string} imgPath 
     * @param {number} len 
     * @param {number} durationMs 
     */
    constructor(game, imgPath, len = 4, durationMs = 5000) {
        super(game, imgPath, durationMs);
        this.Len = len;
        this.IsNegative = len < 0;
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns 
     */
    Execute(target) {
        logToFile("PaddleLenEffect Execute Start");
        if (this.disposed) 
            return;
        
        target.PaddleLen.Values.Add(this);
        this.game.MessageBroker.Publish("AppliedEffect", {
            type: "AppliedEffect",
            effect: this.IsNegative ? "LessLength" : "MoreLength",
            origin: target.GetName(),
        });
        super.Execute(target);
        logToFile("PaddleLenEffect Execute End");
    }

    /**
     * 
     * @param {APlayer} target 
     */
    Undo(target) {
        target.PaddleLen.Values.Remove(this);
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
