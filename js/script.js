import { loadClientsFromApi } from './api.js';
import { renderDashboard, setupDashboardQuickActions } from './dashboard.js';
import { renderClientList, setupClientFormHandlers, setupClientListHandlers } from './clients.js';
import { renderFinance, setupExport } from './finance.js';
import { updateHeaderStats } from './header.js';
import { setupNav, setupSearch, getActiveSectionId } from './navigation.js';
import { initTheme } from './theme.js';

function renderCurrentSection() {
    const section = getActiveSectionId();

    document.body.classList.toggle('finance-active', section === 'finance');
    
    if (section === 'dashboard') renderDashboard();
    if (section === 'clients') renderClientList();
    if (section === 'finance') renderFinance();
}

function showDashboardLoader() {
  const loader = document.getElementById('dashboardLoader');
  if (loader) loader.classList.add('active');
}

function hideDashboardLoader() {
  const loader = document.getElementById('dashboardLoader');
  if (loader) loader.classList.remove('active');
}

async function refreshAll() {
    showDashboardLoader();
    try {
        await loadClientsFromApi();
        updateHeaderStats();
        hideDashboardLoader();
        renderCurrentSection();
    } catch (e) {
        console.error('Errore di caricamento clienti:', e);
        hideDashboardLoader();
    }
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
