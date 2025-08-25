import { translations } from "../../components/tanslations";

export const langues = ["es", "en", "fr"] as const;
export type Langue = typeof langues[number];

export type Action =
  | { type: "CHANGE_LANG"; payload: Langue };

export function langReducer(state: Langue, action: Action): Langue {
  switch (action.type) {
    case "CHANGE_LANG":
      // ESTO ES UNA MALA PRÁCTICA EN REDUX: el reducer solo debe transformar estado.
      // TODO: Comentar en reunión y explicar como debería realizarse.
      updateLangue(document.documentElement, action.payload);
      return action.payload;

    default:
      return state;
  }
}

/**
 * Update child elements langue using data-tab content as key.
 * @param element 
 * @param langue 
 */
export function updateLangue(element: HTMLElement, langue: Langue): void {
  element.querySelectorAll<HTMLElement>("[data-tab]").forEach((el) => {
    const key = el.dataset.tab as string;
    el.textContent = translations[langue][key];
  });
}