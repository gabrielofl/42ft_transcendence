import { Event } from "./Event.js";

export class ObservableList {
    items = [];
    OnAddEvent = new Event();
    OnRemoveEvent = new Event();

    // Añade un elemento a la lista e invoca al evento OnAdd.
    Add(item) {
        const index = this.items.indexOf(item);
        if (index === -1) {
            this.items.push(item);
            this.OnAddEvent.Invoke(item);
            
            item?.OnDisposeEvent?.Subscribe(() => this.Remove(item));
        }
    }

    // Elimina un elemento de la lista e invoca al evento OnRemove.
    Remove(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.OnRemoveEvent.Invoke(item);
        }
    }

    // Obtiene una copia de los elementos.
    GetAll() {
        return [...this.items];
    }
}