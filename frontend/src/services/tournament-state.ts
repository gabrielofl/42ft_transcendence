import { API_BASE_URL } from "../screens/config";

const MATCH_STORAGE_KEY = "tournamentMatchInfo";

export interface TournamentMatchInfo {
  tournamentId: number;
  matchId: number;
  roomId: string;
  userId: number;
  username: string;
  opponent: any;
  player1: any;
  player2: any;
  round: string;
  mapKey: string;
  isTournament: boolean;
}

export interface TournamentStateResponse {
  id: number;
  status: string;
  [key: string]: any;
}

export type TournamentValidationStatus = "active" | "inactive" | "unknown";

export interface TournamentValidationResult {
  status: TournamentValidationStatus;
  matchInfo: TournamentMatchInfo | null;
  tournament?: TournamentStateResponse | null;
}

export function getStoredTournamentMatchInfo(): TournamentMatchInfo | null {
  try {
    const raw = sessionStorage.getItem(MATCH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TournamentMatchInfo;
  } catch (error) {
    console.error("Failed to parse stored tournament match info:", error);
    clearTournamentMatchInfo();
    return null;
  }
}

export function setTournamentMatchInfo(info: TournamentMatchInfo): void {
  try {
    sessionStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(info));
  } catch (error) {
    console.error("Failed to persist tournament match info:", error);
  }
}

export function clearTournamentMatchInfo(): void {
  sessionStorage.removeItem(MATCH_STORAGE_KEY);
}

export async function fetchTournamentState(tournamentId: number): Promise<TournamentStateResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`, {
      credentials: "include",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch tournament ${tournamentId}: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TournamentStateResponse;
  } catch (error) {
    console.error("Error fetching tournament state:", error);
    throw error;
  }
}

export async function validateStoredTournamentMatch(): Promise<TournamentValidationResult> {
  const matchInfo = getStoredTournamentMatchInfo();
  if (!matchInfo) {
    return { status: "inactive", matchInfo: null, tournament: null };
  }

  try {
    const tournament = await fetchTournamentState(matchInfo.tournamentId);

    if (!tournament) {
      clearTournamentMatchInfo();
      return { status: "inactive", matchInfo: null, tournament: null };
    }

    const isActive = tournament.status === "in_progress";
    if (!isActive) {
      clearTournamentMatchInfo();
      return { status: "inactive", matchInfo: null, tournament };
    }

    return { status: "active", matchInfo, tournament };
  } catch (_error) {
    // Mantener la información almacenada pero indicar que el estado es desconocido
    return { status: "unknown", matchInfo, tournament: null };
  }
}

export async function isTournamentActive(tournamentId: number): Promise<boolean | null> {
  try {
    const tournament = await fetchTournamentState(tournamentId);
    if (!tournament) return false;
    return tournament.status === "in_progress";
  } catch (_error) {
    return null;
  }
}


