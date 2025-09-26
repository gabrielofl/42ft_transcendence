// Clase simplificada para manejo de eventos.
export class Event<T> {
    private callbacks: ((data: T) => void)[] = [];

    // Subscribir al evento.
    public Subscribe(callback: (data: T) => void) {
        this.callbacks.push(callback);
    }

    // Cancelar suscripción.
    public Unsubscribe(callback: (data: T) => void) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    // Invocar evento.
    public Invoke(data: T) {
        this.callbacks.forEach(cb => cb(data));
    }

    // Eliminar todos los registros.
    public Clear() {
        this.callbacks = [];
    }
}