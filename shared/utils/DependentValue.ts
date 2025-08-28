import { Event } from "@shared/utils/Event";
import { ObservableList } from "./ObservableList";

/**
 * Small observer design pattern to update changes on a value
 * that can be affected by different sources.
 */
export class DependentValue<T, V> {
    public OnChangeEvent: Event<V> = new Event();
    public Values: ObservableList<T> = new ObservableList();
    private value: (values: ObservableList<T>) => V;
    
    public constructor(fValue: (values: ObservableList<T>) => V) {
        this.value = fValue;
        this.Values.OnAddEvent.Subscribe(x => this.OnChangeEvent.Invoke(this.Value()));
        this.Values.OnRemoveEvent.Subscribe(x => this.OnChangeEvent.Invoke(this.Value()));
    }

    public Value(): V {
        return this.value(this.Values);
    } 
}