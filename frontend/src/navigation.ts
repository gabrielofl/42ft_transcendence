import { renderFooter } from "./components/Footer.js";
import { renderAuthContainer } from "./screens/AuthContainer.js";
import { renderHome } from "./screens/Home.js";
import { renderTournament } from "./screens/Tournament.js";
import { renderProfile } from "./screens/Profile.js";
import { renderLeaderboard } from "./screens/Leaderboard.js";
import { renderGame } from "./screens/Game/GameScreen.js";
import { renderHeader } from "./components/Header.js";
import { AppStore } from "./redux/AppStore.js";
import { Screen } from "./redux/reducers/navigationReducer.js";

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
    renderScreen(screen);
  });

  // Render inicial
  const initialScreen: Screen = window.location.hash.replace("#", "") as Screen ?? "login";
  AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: initialScreen });

  // Escuchar back/forward del navegador
  window.addEventListener("popstate", (event) => {
    const screen = (event.state?.screen as Screen) || initialScreen;
    AppStore.NavigoStore.Dispatch({ type: "NAVIGATE", payload: screen });
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
      renderGame("Jorge", "Miguel", "local");
      break;
    case "tournament":
      renderTournament();
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
