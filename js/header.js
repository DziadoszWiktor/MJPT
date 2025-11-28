import { getClients } from './state.js';
import { getPaymentInfo, getCheckStatus } from './utils.js';

export function updateHeaderStats() {
    const clients = getClients();

    const elActive = document.getElementById('activeClientsCount');
    const elAnnual = document.getElementById('annualRevenue');
    const elNoti   = document.getElementById('notificationCount');

    if (elActive) {
        elActive.innerText = clients.filter(c => Number(c.is_active) === 1).length;
    }

    let total = 0;
    clients.forEach(c => {
        if (c.service_type === 'TRIMESTRALE') {
            total += Number(c.service_price) * 4;
        } else {
            total += Number(c.service_price) * 12;
        }
    });

    if (elAnnual) {
        elAnnual.innerText = '€' + total;
    }

    if (elNoti) {
        const noti = clients.filter(c => {
            const paymentInfo = getPaymentInfo(c);
            const checkInfo   = getCheckStatus(c);
            return paymentInfo.status !== 'ok' || checkInfo.status === 'todo';
        }).length;
        elNoti.innerText = noti;
    }
}
