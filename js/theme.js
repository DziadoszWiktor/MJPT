export function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });
}
