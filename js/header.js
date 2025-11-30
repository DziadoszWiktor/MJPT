import { getClients } from './state.js';
import { getPaymentInfo, getCheckStatus } from './utils.js';

export function updateHeaderStats() {
    const clients = getClients();

    const elActive = document.getElementById('activeClientsCount');
    const elAnnual = document.getElementById('annualRevenue');
    const elNoti   = document.getElementById('notificationCount');
    const activeClients = clients.filter(c => Number(c.is_active) === 1);

    if (elActive) {
        elActive.innerText = activeClients.length;
    }

    let total = 0;
    activeClients.forEach(c => {
        if (c.service_type === 'TRIMESTRALE') {
            total += Number(c.service_price) * 4;
        } else {
            total += Number(c.service_price) * 12;
        }
    });

    if (elAnnual) {
        elAnnual.innerText = '€' + total;
        if (total > 5000) {
            elAnnual.style.color = 'var(--danger)';
        } else {
            elAnnual.style.color = '';
        }
    }

    if (elNoti) {
        const noti = activeClients.filter(c => {
            const paymentInfo = getPaymentInfo(c);
            const checkInfo   = getCheckStatus(c);

            return (
                paymentInfo.status !== 'ok' ||
                checkInfo.status === 'todo'
            );
        }).length;
        elNoti.innerText = noti;
    }
}
