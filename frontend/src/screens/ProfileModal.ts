import profileModalHtml from "./profile-modal.html?raw";

export function initProfileModal() {
  // Only append once
  if (!document.getElementById("user-profile-modal")) {
    document.body.insertAdjacentHTML("beforeend", profileModalHtml);
  }
}

export function setupProfileLinks() {
  document.querySelectorAll(".open-profile").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const username = link.getAttribute("data-user");
      if (username) openUserProfile(username);
    });
  });
}

async function openUserProfile(username: string | number) {
  const modal = document.getElementById("user-profile-modal");	
  const avatar = document.getElementById("profile-avatar") as HTMLImageElement;
  const profileUsername = document.getElementById("profile-username");
  const profilePoints = document.getElementById("profile-points");
  const statMatches = document.getElementById("stat-matches");
  const statWins = document.getElementById("stat-wins");
  const statLosses = document.getElementById("stat-losses");
  const statWinRate = document.getElementById("stat-winrate");
  const statMaxScore = document.getElementById("stat-maxscore");
  const friendBtn = document.getElementById("friend-action-btn");

  try {
    const res = await fetch(`${API_BASE_URL}/users/username?username=${encodeURIComponent(username)}`, {
      credentials: "include",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });

    if (!res.ok) throw new Error(`Failed to fetch profile for ${username}`);
    const data = await res.json();

    // Fill modal
    avatar.src = data.avatar || "https://via.placeholder.com/100";
    profileUsername.textContent = data.username.toUpperCase();
    profilePoints.textContent = data.points ? `${data.points} pts` : `0 pts`;
    statMatches.textContent = data.matches ?? 0;
    statWins.textContent = data.wins ?? 0;
    statLosses.textContent = data.losses ?? 0;
    statMaxScore.textContent = data.max_score ?? 0;

    const totalGames = data.wins + data.losses;
    const winRate = totalGames > 0 ? (data.wins / totalGames) * 100 : 0;
    statWinRate.textContent = `${winRate.toFixed(2)}%`;

    // Show modal
    modal?.classList.remove("hidden");

    document.getElementById("close-profile-btn")?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

  } catch (err) {
    console.error("Profile modal error:", err);
    alert("Failed to load user profile.");
  }
}
