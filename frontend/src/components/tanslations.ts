import { Langue } from "../redux/reducers/langueReducer";

// Podría venir de la base de datos.
export const translations: Record<Langue, Record<string, string>> = {
  es: {
    account: "Cuenta",
    history: "Historial de Partidas",
    performance: "Rendimiento",
    friends: "Amigos",
    play: "Jugar",
    profile: "Perfil",
    leaderboard: "Clasificación",
    contact: "Contacto",
    logout: "Cerrar sesión",
  },
  en: {
    account: "Account",
    history: "Match History",
    performance: "Performance",
    friends: "Friends",
    play: "Play",
    profile: "Profile",
    leaderboard: "Leaderboard",
    contact: "Contact",
    logout: "Logout",
  },
  fr: {
    account: "Compte",
    history: "Historique des matchs",
    performance: "Performance",
    friends: "Amis",
    play: "Jouer",
    profile: "Profil",
    leaderboard: "Classement",
    contact: "Contact",
    logout: "Déconnexion",
  }
};
