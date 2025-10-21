export type Screen =
  | "login"
  | "home"
  | "game"
  | "waiting"
  | "join"
  | "create"
  | "tournament-selection"
  | "tournament-lobby"
  | "tournament-waiting"
  | "profile"
  | "leaderboard"
  | "contact";

export type Action = 
  | { type: "NAVIGATE"; payload: Screen };

export function navigationReducer(
  state: Screen,
  action: Action
): Screen {
  switch (action.type) {
    case "NAVIGATE":
      return action.payload;
    default:
      return state;
  }
}
