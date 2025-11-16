const STORAGE_KEY = "pt-manager-theme";

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);

    const btn = document.getElementById("themeToggle");
    if (btn) {
        btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    }
}

export function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial = saved || (prefersDark ? "dark" : "light");
    applyTheme(initial);

    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
        btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    });
}
