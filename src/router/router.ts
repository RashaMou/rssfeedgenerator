const router = {
  onRouteChangeCallback: null as (() => void) | null,

  // Set the callback for view changes
  onRouteChange(callback: () => void) {
    this.onRouteChangeCallback = callback;
  },

  // Route handler
  router() {
    if (this.onRouteChangeCallback) {
      this.onRouteChangeCallback();
    }
  },

  // Navigate programmatically
  navigateTo(path: string) {
    window.history.pushState({}, "", path);
    this.router();
  },

  // Initialize the router to handle navigation events
  initializeRouter() {
    window.addEventListener("popstate", () => this.router());
    window.addEventListener("load", () => this.router());
  },
};

export default router;
