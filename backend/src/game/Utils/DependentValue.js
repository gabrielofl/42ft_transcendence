import { Event } from "./Event.js";
import { ObservableList } from "./ObservableList.js";

/**
 * Small observer design pattern to update changes on a value
 * that can be affected by different sources.
 */
export class DependentValue { //DependentValue<T, V>
    OnChangeEvent = new Event();//Event<V>
    Values = new ObservableList();//ObservableList<T>
    value;//(values: ObservableList<T>) => V
    
    /**
     * 
     * @param {(values: ObservableList<T>) => V} fValue 
     */
    constructor(fValue) {
        this.value = fValue;
        this.Values.OnAddEvent.Subscribe(x => this.OnChangeEvent.Invoke(this.Value()));
        this.Values.OnRemoveEvent.Subscribe(x => this.OnChangeEvent.Invoke(this.Value()));
    }

    /**
     * 
     * @returns {V}
     */
    Value() {
        return this.value(this.Values);
    } 
}