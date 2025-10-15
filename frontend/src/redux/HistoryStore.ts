type Listener<T> = (prev: T, next: T) => void;

export class HistoryStore<State, Action> {
  private history: State[] = [];
  private index = -1;
  private listeners: Listener<State>[] = [];

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
    const prev = this.GetState();
    const newState = this.reducer(prev, action);

    this.history = this.history.slice(0, this.index + 1);
    this.history.push(newState);
    this.index++;

    this.listeners.forEach(l => l(prev, newState));
  }

  public GoBack() {
    if (this.index > 0) {
      const prev = this.GetState();
      this.index--;
      const next = this.GetState();
      this.listeners.forEach(l => l(prev, next));
    }
  }

  public GoForward() {
    if (this.index < this.history.length - 1) {
      const prev = this.GetState();
      this.index++;
      const next = this.GetState();
      this.listeners.forEach(l => l(prev, next));
    }
  }

  public Subscribe(listener: Listener<State>) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

