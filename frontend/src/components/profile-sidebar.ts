import { renderAccountTab, renderFriendsTab, renderPerformanceTab, setupFriendsTab, setupHistoryTab, setupPerformanceTab } from "../screens/Profile";

export function setupProfileSidebar() {
  const sidebar = document.getElementById("profile-sidebar");
  if (!sidebar)
    return;

  // Configurar eventos de tabs
  sidebar.querySelectorAll(".sidebar-tab").forEach(btn => {
    btn.addEventListener("click", async e => {
      const tab = (e.currentTarget as HTMLElement).dataset.tab;
      const container = document.getElementById("profile-content");
      if (!container)
        return;

      // Reset de clases activas
      sidebar.querySelectorAll(".sidebar-tab").forEach(b =>
        b.classList.remove("active")
      );
      (e.currentTarget as HTMLElement).classList.add("active");

      switch (tab) {
        case "friends":
          container.innerHTML = renderFriendsTab();
          await setupFriendsTab();
          break;
        case "performance":
          container.innerHTML = renderPerformanceTab();
          await setupPerformanceTab();
          break;
        case "history":
          await setupHistoryTab();
          break;
        default:
          renderAccountTab();
          break;
      }
    });
  });
}
