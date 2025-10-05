import { renderFooter } from "./components/Footer.js";
import { renderAuthContainer } from "./screens/AuthContainer.js";
import { renderHome } from "./screens/Home.js";
// import { renderTournament } from "./screens/Tournament.js";
import { renderProfile } from "./screens/Profile.js";
import { renderLeaderboard } from "./screens/Leaderboard.js";
import { PlayerData, renderGame } from "./screens/Game/GameScreen.js";
import { renderHeader } from "./components/Header.js";
import { AppStore } from "./redux/AppStore.js";
import { Screen } from "./redux/reducers/navigationReducer.js";
import { ClientGameSocket } from "./screens/Game/ClientGameSocket.js";

export function navigateTo(screen: Screen): void {
	// Cambiar estado en Store
	AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: screen });

	// Actualizar la URL del navegador (sin recargar)
  window.history.pushState({ screen }, "", `#${screen}`);
}

export function initNavigation() {
  // Renderizar en base al estado del store
  AppStore.NavigoStore.Subscribe(() => {
    const screen = AppStore.NavigoStore.GetState();

    let socket: ClientGameSocket = ClientGameSocket.GetInstance();
  
    if (socket) {
      if (AppStore.NavigoStore.GetState() === "game")
        {
          console.log("Cerrando juego");
          socket.DisposeGame();
        }
    }

    console.log(`Navegando a ${screen}`);
    renderScreen(screen);
  });

  // Render inicial
  const initialScreen: Screen = window.location.hash.replace("#", "") as Screen ?? "login";
  AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: initialScreen });

  // Escuchar back/forward del navegador
  window.addEventListener("popstate", (event) => {
    // const screen = (event.state?.screen as Screen) || initialScreen;
    AppStore.NavigoStore.GoBack();
    // AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: screen });
  });

  window.addEventListener("hashchange", () => {
    if (AppStore.NavigoStore.GetState() === "login")
      return;

    const newScreen = window.location.hash.replace("#", "") as Screen;
    if (newScreen) {
      AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: newScreen });
    }
  });
}

function renderScreen(screen: Screen) {
  const app = document.getElementById("app")!;
  const header = document.getElementById("header")!;
  const footer = document.getElementById("footer")!;
  const main = document.getElementById("main")!;

  if (!app || !header || !footer || !main) {
    console.error("Missing layout containers!");
    return;
  }

  main.innerHTML = "";
  if (screen !== "login") {
    renderHeader();
    renderFooter();
  } else {
    header.innerHTML = "";
    footer.innerHTML = "";
  }

  switch (screen) {
    case "login":
		renderAuthContainer();
		break;
	case "home":
      renderHome();
      break;
    case "game":
      console.log("Lanzando juego");
      let players: PlayerData[] = [];

      players.push({
        type: "AI",
        username: "David",
        userid: -1
      });

      players.push({
        type: "Local",
        username: "Gabriel",
        leftkey: "a",
        rightkey: "d",
        userid: 5,
      });

      renderGame(players);
      break;
    case "tournament":
      // renderTournament();
      break;
    case "profile":
      renderProfile();
      break;
    case "leaderboard":
      renderLeaderboard();
      break;
    default:
      app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
  }
}
