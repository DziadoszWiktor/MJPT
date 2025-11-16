export function setupNav(onTabChange) {
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.section;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            sections.forEach(sec => {
                sec.classList.toggle('active', sec.id === target);
            });

            if (typeof onTabChange === 'function') {
                onTabChange(target);
            }
        });
    });
}

export function getActiveSectionId() {
    const activeTab = document.querySelector('.nav-tab.active');
    return activeTab ? activeTab.dataset.section : null;
}

export function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();

        document.querySelectorAll('#clientGrid .client-tile').forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(q) ? 'block' : 'none';
        });

        document.querySelectorAll('#clientList .client-list-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
        });
    });
}
