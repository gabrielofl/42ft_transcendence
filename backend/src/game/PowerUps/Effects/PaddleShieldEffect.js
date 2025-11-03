import { APlayer } from "../../Player/APlayer.js";
import { APlayerEffect } from "../../abstract/APlayerEffect.js";
import { logToFile } from "../../Game/logger.js";

export class PaddleShieldEffect extends APlayerEffect {
    constructor(game, imgPath, durationMs = 5000) {
        super(game, imgPath, durationMs);
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns 
     */
    Execute(target) {
        logToFile("PaddleShieldEffect Execute Start");
        if (this.disposed) 
            return;

        target.Shields.Add(this);

        // Limpiar efectos negativos
        target.Effects.GetAll().Where(e => e.IsNegative).forEach(e => e.Undo(target));
        super.Execute(target);
        logToFile("PaddleShieldEffect Execute End");
    }

    /**
     * 
     * @param {APlayer} target 
     */
    Undo(target) {
        target.Shields.Remove(this);
        this.Dispose();
    }

    Dispose() {
        super.Dispose();
    }
}
