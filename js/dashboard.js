import { getClients } from './state.js';
import { formatService, getProgramText, getPaymentInfo, getCheckStatus, formatMonthShort, formatNextPayment } from './utils.js';
import { apiPost } from './api.js';

export function renderDashboard() {
    const grid = document.getElementById('clientGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid || !emptyState) return;

    const allClients = getClients();

    if (!allClients.length) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = allClients.map(client => {
        const payment = getPaymentInfo(client);
        const programText = getProgramText(client);
        const checkStatus = getCheckStatus(client);
        const lastCheckMonth = formatMonthShort(client.last_check_date);
        const nextPaymentFormatted = formatNextPayment(client.next_payment_due_date);

        let paymentBadgeClass = 'badge-danger';
        if (payment.status === 'ok') paymentBadgeClass = 'badge-success';
        else if (payment.status === 'due_soon') paymentBadgeClass = 'badge-warning';

        let checkBadgeClass = 'badge-warning';
        if (checkStatus.status === 'done') {
            checkBadgeClass = 'badge-success';
        } else if (checkStatus.status === 'disabled') {
            checkBadgeClass = 'badge-danger';
        }

        return `
            <div class="client-tile" data-id="${client.id}">
                <div class="client-header">
                    <div>
                        <div class="client-name">${client.first_name} ${client.last_name}</div>
                        <div class="client-email">${client.email || ''}</div>
                    </div>
                </div>

                <div class="client-body">
                    <div class="client-info">
                        <div class="info-row">
                            <span class="info-label">Servizio</span>
                            <span class="info-value">${formatService(client)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Programmazione</span>
                            <span class="info-value">${programText}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ultimo check</span>
                            <span class="info-value">${lastCheckMonth}</span>
                        </div>

                        <div class="info-row">
                            <span class="info-label">Prossimo pagamento</span>
                            <span class="info-value">${nextPaymentFormatted}</span>
                        </div>
                    </div>

                    <div class="client-badges">
                        <span class="badge ${Number(client.is_active) === 1 ? 'badge-success' : 'badge-danger'}">
                            ${Number(client.is_active) === 1 ? 'Attivo' : 'Non attivo'}
                        </span>

                        <span class="badge ${paymentBadgeClass}">
                            ${payment.text}
                        </span>

                        <span class="badge ${checkBadgeClass}">
                            ${checkStatus.text}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function setupDashboardQuickActions(onAfterQuickAction) {
    document.body.addEventListener('click', async (e) => {
        const el = e.target;
        if (!el.classList.contains('badge')) return;

        const tile = el.closest('.client-tile');
        if (!tile) return;

        const id = tile.dataset.id;
        let type = null;
        const text = (el.textContent || '').trim().toLowerCase();

        if (text.includes('attivo') || text.includes('non attivo')) {
            type = 'toggle_active';
        }

        if (text.includes('da pagare') || text.includes('scaduto') || text.includes('regola')) {
            type = 'mark_payment_done';
        }

        if (text.includes('check da fare')) {
            type = 'toggle_check_required';
        }

        if (!type) return;

        await apiPost('quick_action', { id, type });

        if (typeof onAfterQuickAction === 'function') {
            onAfterQuickAction();
        }
    });
}