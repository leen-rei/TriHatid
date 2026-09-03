// supabase.js
if (!window._supabase) {
  const SUPABASE_URL = 'https://ynwsauldwhfmlbnrhfhl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_JHg6iSCw9h9DlRzp463zxg__3tEzREv';

  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Global reference safely assigned without redeclaring keywords
var _supabase = window._supabase;

// Handle Android Hardware Back Button natively across all pages
document.addEventListener('DOMContentLoaded', () => {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => {
      const currentPage = window.location.pathname.split('/').pop() || 'home.html';

      // 1. If on home/dashboard, handle tab history stack first (e.g., Profile -> Home)
      if (currentPage === 'home.html' || currentPage === 'driver-dashboard.html' || currentPage === '') {
        if (typeof viewHistoryStack !== 'undefined' && viewHistoryStack.length > 1) {
          viewHistoryStack.pop();
          const previousView = viewHistoryStack[viewHistoryStack.length - 1];
          switchView(previousView, false);
          return;
        }

        // Prompt to exit only when at the absolute root view with no local history
        if (window.confirm("Do you want to exit TriHatid?")) {
          window.Capacitor.Plugins.App.exitApp();
        }
      } 
      // 2. For multi-page file navigation (e.g. searching.html -> home.html)
      else if (window.history.length > 1) {
        window.history.back();
      } 
      // 3. Fallback redirect
      else {
        window.location.href = 'home.html';
      }
    });
  }
});