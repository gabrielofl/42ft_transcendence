type Listener = () => void;

export class HistoryStore<State, Action> {
  private history: State[] = [];    // historial de estados
  private index = -1;               // puntero al estado actual
  private listeners: Listener[] = [];

  constructor(
    private reducer: (s: State, a: Action) => State,
    initial: State
  ) {
    this.history.push(initial);
    this.index = 0;
  }

  public GetState(): State {
    return this.history[this.index];
  }

  public Dispatch(action: Action) {
    const current = this.GetState();
    const newState = this.reducer(current, action);

    // Si hay estados "adelante", los eliminamos (nuevo branch)
    this.history = this.history.slice(0, this.index + 1);

    // Guardamos el nuevo estado
    this.history.push(newState);
    this.index++;

    this.listeners.forEach(l => l());
  }

  public GoBack() {
    if (this.index > 0) {
      this.index--;
      this.listeners.forEach(l => l());
    }
  }

  public GoForward() {
    if (this.index < this.history.length - 1) {
      this.index++;
      this.listeners.forEach(l => l());
    }
  }

  public Subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}
