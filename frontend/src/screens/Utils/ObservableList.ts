import { Event } from "./Event";
import { IDisposable } from "../Interfaces/IDisposable";

export class ObservableList<T> {
    private items: T[] = [];
    public OnAddEvent = new Event<T>();
    public OnRemoveEvent = new Event<T>();

    // Añade un elemento a la lista e invoca al evento OnAdd.
    public Add(item: T) {
        const index = this.items.indexOf(item);
        if (index === -1) {
            this.items.push(item);
            this.OnAddEvent.Invoke(item);
            
            (item as IDisposable)?.OnDisposeEvent.Subscribe(() => this.Remove(item));
        }
    }

    // Elimina un elemento de la lista e invoca al evento OnRemove.
    public Remove(item: T) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.OnRemoveEvent.Invoke(item);
        }
    }

    // Obtiene una copia de los elementos.
    public GetAll(): T[] {
        return [...this.items];
    }
}