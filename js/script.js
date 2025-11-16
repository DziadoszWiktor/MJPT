import { loadClientsFromApi } from './api.js';
import { renderDashboard, setupDashboardQuickActions } from './dashboard.js';
import { renderClientList, setupClientFormHandlers, setupClientListHandlers } from './clients.js';
import { renderFinance, setupExport } from './finance.js';
import { updateHeaderStats } from './header.js';
import { setupNav, setupSearch, getActiveSectionId } from './navigation.js';
import { initTheme } from './theme.js';

function renderCurrentSection() {
    const section = getActiveSectionId();

    if (section === 'dashboard') renderDashboard();
    if (section === 'clients') renderClientList();
    if (section === 'finance') renderFinance();
}

async function refreshAll() {
    await loadClientsFromApi();
    updateHeaderStats();
    renderCurrentSection();
}

document.addEventListener('DOMContentLoaded', () => {
    setupNav(() => {
        renderCurrentSection();
    });
    setupSearch();
    setupClientFormHandlers(refreshAll);
    setupClientListHandlers(refreshAll);
    setupDashboardQuickActions(refreshAll);
    setupExport();
    refreshAll();
    initTheme();
});
