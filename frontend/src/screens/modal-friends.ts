const API_BASE_URL = 'https://localhost:443/api';

async function openUserProfile(username) {
  const modal = document.getElementById('user-profile-modal');
  const avatar = document.getElementById('profile-avatar');
  const profileUsername = document.getElementById('profile-username');
  const profilePoints = document.getElementById('profile-points');
  const statMatches = document.getElementById('stat-matches');
  const statWins = document.getElementById('stat-wins');
  const statLosses = document.getElementById('stat-losses');
  const statWinRate = document.getElementById('stat-winrate');
  const statMaxScore = document.getElementById('stat-maxscore');
  const friendBtn = document.getElementById('friend-action-btn');

  try {
    const res = await fetch(`${API_BASE_URL}/users/${username}`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!res.ok) throw new Error(`Failed to fetch profile for ${username}`);

    const data = await res.json();

    // Fill modal with data
    avatar.src = data.avatar || 'https://via.placeholder.com/100';
    profileUsername.textContent = data.username;
    profilePoints.textContent = `${data.points} pts`;
    statMatches.textContent = data.matches ?? 0;
    statWins.textContent = data.wins ?? 0;
    statLosses.textContent = data.losses ?? 0;
    statWinRate.textContent = data.win_rate ? `${data.win_rate}%` : '0%';
    statMaxScore.textContent = data.max_score ?? 0;

    // Friendship check
    if (data.isFriend) {
      friendBtn.textContent = "Remove Friend";
      friendBtn.classList.remove("bg-pink-500");
      friendBtn.classList.add("bg-red-500");
    } else {
      friendBtn.textContent = "Add Friend";
      friendBtn.classList.remove("bg-red-500");
      friendBtn.classList.add("bg-pink-500");
    }

    // Show modal
    modal.classList.remove('hidden');

    // Friend action handler
    friendBtn.onclick = async () => {
      try {
        const action = data.isFriend ? "remove" : "add";
        const res = await fetch(`${API_BASE_URL}/friends/${action}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ username })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to update friendship");

        alert(result.message || `Friendship ${action}ed!`);
        data.isFriend = !data.isFriend; // toggle
        openUserProfile(username); // reload modal with updated state
      } catch (err) {
        console.error("Friendship error:", err);
        alert("Could not update friendship. Please try again.");
      }
    };

  } catch (err) {
    console.error("Profile modal error:", err);
    alert("Failed to load user profile.");
  }
}

// Close button
document.getElementById('close-profile-btn')?.addEventListener('click', () => {
  document.getElementById('user-profile-modal')?.classList.add('hidden');
});

// Example: attach event listener to username elements
document.querySelectorAll('.username-link').forEach(el => {
  el.addEventListener('click', () => {
    const username = el.dataset.username;
    if (username) openUserProfile(username);
  });
});
