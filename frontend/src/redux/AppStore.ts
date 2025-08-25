import { HistoryStore } from "./HistoryStore";
import * as L from "./reducers/langueReducer";
import * as V from "./reducers/navigationReducer";

export class AppStore {
    public static LangueStore: HistoryStore<L.Langue, L.Action> = new HistoryStore(L.langReducer, "es");
    public static NavigoStore: HistoryStore<V.Screen, V.Action> = new HistoryStore(V.navigationReducer, "profile");
}
