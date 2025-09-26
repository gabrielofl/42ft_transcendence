// Clase simplificada para manejo de eventos.
export class Event {
    callbacks = [];

    // Subscribir al evento.
    Subscribe(callback) {
        this.callbacks.push(callback);
    }

    // Cancelar suscripción.
    Unsubscribe(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    // Invocar evento.
    Invoke(data) {
        this.callbacks.forEach(cb => cb(data));
    }

    // Eliminar todos los registros.
    Clear() {
        this.callbacks = [];
    }
}