/**
 * Representa un temporizador que se puede pausar, reanudar y cancelar.
 */
export class PausableTimer {
    /**
     * Crea una instancia de PausableTimer.
     * @param {function} callback La función a ejecutar cuando el temporizador finaliza.
     * @param {number} duration La duración total del temporizador en milisegundos.
     */
    constructor(callback, duration) {
        this.callback = callback;
        this.duration = duration;
        this.remaining = duration;
        this.timerId = null;
        this.startTime = null;
        this.running = false;
    }

    /**
     * Inicia o reanuda el temporizador.
     */
    Start() {
        if (this.running)
            return;
        this.running = true;
        this.startTime = Date.now();
        this.timerId = setTimeout(() => {
            this.running = false;
            this.callback();
        }, this.remaining);
    }

    /**
     * Pausa el temporizador.
     * El tiempo restante se calcula y se guarda para poder reanudarlo más tarde.
     */
    Pause() {
        if (!this.running)
            return;

        clearTimeout(this.timerId);
        this.running = false;
        const elapsed = Date.now() - this.startTime;
        this.remaining -= elapsed;
    }

    /**
     * Reanuda el temporizador desde el punto en que fue pausado.
     */
    Resume() {
        if (this.running || this.remaining <= 0)
            return;

        this.Start();
    }

    /**
     * Cancela el temporizador por completo.
     * Detiene la ejecución y reinicia el tiempo restante.
     */
    Cancel() {
        clearTimeout(this.timerId);
        this.running = false;
        this.remaining = 0;
    }
}