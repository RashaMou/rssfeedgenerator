import { State } from "./StateTypes";

export class Store {
  private store: State = {
    status: "",
    currentUrl: "",
    html: "",
    originalFeedItems: [],
    currentFeedItems: [],
    feedLink: "",
    selectionMode: false,
    activeSelector: "",
    iframeDocument: null,
  };

  public stateProxy = new Proxy(this.store, {
    set<T extends keyof State>(
      target: State,
      property: T,
      newValue: State[T],
    ): boolean {
      const oldValue = target[property];
      if (newValue === oldValue) return true;

      target[property] = newValue;
      return true;
    },

    get(target: State, property: keyof State) {
      return target[property];
    },
  });
}
