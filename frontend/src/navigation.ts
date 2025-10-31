import { renderFooter } from "./components/Footer.js";
import { renderAuthContainer } from "./screens/AuthContainer.js";
import { renderHome } from "./screens/Home.js";
import { initAlertModal, setupAlert } from "./screens/AlertModal.js";
// import { renderTournament } from "./screens/Tournament.js";
import { renderProfile } from "./screens/Profile.js";
import { renderLeaderboard } from "./screens/Leaderboard.js";
import { renderGame } from "./screens/Game/GameScreen.js";
import { renderHeader } from "./components/Header.js";
import { AppStore } from "./redux/AppStore.js";
import { Screen } from "./redux/reducers/navigationReducer.js";
import { ClientGameSocket } from "./screens/Game/ClientGameSocket.js";
import { renderMapSelection } from "./screens/Game/map-selection.js";
import { renderWaitingRoom } from "./screens/waiting_room.js";
import { renderJoinGame } from "./screens/join-game.js";

export function navigateTo(screen: Screen): void {
	// Cambiar estado en Store
	AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: screen });

	// Actualizar la URL del navegador (sin recargar)
  window.history.pushState({ screen }, "", `#${screen}`);
}

function onScreenEnter(screen: Screen, callback: () => void) {
  return AppStore.NavigoStore.Subscribe((prev, next) => {
    if (next === screen && prev !== screen) callback();
  });
}

export function onScreenLeave(screen: Screen, callback: () => void) {
  return AppStore.NavigoStore.Subscribe((prev, next) => {
    if (prev === screen && next !== screen) callback();
  });
}

export function initNavigation() {
  // Renderizar en base al estado del store
  AppStore.NavigoStore.Subscribe((prev, next) => {
    if (prev != next)
    {
      console.log(`Navegando a ${next}`);
      renderScreen(next);
    }
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

async function renderScreen(screen: Screen) {
  const app = document.getElementById("app")!;
  const header = document.getElementById("header")!;
  const footer = document.getElementById("footer")!;
  const main = document.getElementById("main")!;
  initAlertModal();
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
      renderGame().then(() => ClientGameSocket.GetInstance().StartGame());
      break;
    case "create":
      renderMapSelection();
      break;
    case "waiting":
    renderWaitingRoom();
	  break;
	case "join":
      renderJoinGame();
      break;
    case "tournament":
      // renderTournament();
      break;
    case "profile":
      renderProfile();
      break;
    case "leaderboard":
      await renderLeaderboard();
      break;
    default:
      app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
  }
}
