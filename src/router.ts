let onRouteChangeCallback: (() => void) | null = null;

// Set the callback for view changes, called by RSSApp
export function onRouteChange(callback: () => void) {
  onRouteChangeCallback = callback;
}

// Routing logic to determine which view to load based on the path
export function router() {
  if (onRouteChangeCallback) {
    onRouteChangeCallback(); // Trigger RSSApp's view change handler
  }
}

// Programmatic navigation
export function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  router(); // Call router to trigger the view change
}

// Initialize router to handle initial load and back/forward navigation
export function initializeRouter() {
  window.addEventListener("popstate", router); // Handle back/forward
  window.addEventListener("load", router); // Load initial route on page load
}
