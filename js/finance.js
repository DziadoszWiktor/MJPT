import { getClients } from './state.js';
import { formatService } from './utils.js';

export function renderFinance() {
    const tbody = document.getElementById('financeTableBody');
    const annual = document.getElementById('totalAnnualRevenue');
    const active = document.getElementById('financeActiveClients');
    const monthly = document.getElementById('monthlyAverage');
    const progress = document.getElementById('revenueProgress');
    const percentLabel = document.getElementById('revenuePercentage');

    if (!tbody) return;

    const clients = getClients();
    tbody.innerHTML = '';

    let totalYear = 0;
    let totalMonthly = 0;

    clients.forEach(c => {
        const annualIncome = (c.service_type === 'TRIMESTRALE')
            ? Number(c.service_price) * 4
            : Number(c.service_price) * 12;

        totalYear += annualIncome;
        totalMonthly += Number(c.service_price);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.first_name} ${c.last_name}</td>
            <td>${formatService(c)}</td>
            <td>€${c.service_price}</td>
            <td>€${annualIncome}</td>
        `;
        tbody.appendChild(tr);
    });

    if (annual) annual.innerText = '€' + totalYear;
    if (active) active.innerText = clients.length;
    if (monthly) monthly.innerText = '€' + totalMonthly;

    if (progress && percentLabel) {
        const percent = Math.min(100, (totalYear / 5000) * 100);
        percentLabel.innerText = percent.toFixed(1) + '%';
        progress.style.width = percent + '%';
    }
}

export function setupExport() {
    const btn = document.getElementById('exportDataBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const clients = getClients();

        if (!clients.length) {
            alert('Nessun dato da esportare.');
            return;
        }

        const rows = [];
        rows.push([
            'ID', 'Nome', 'Cognome', 'Email',
            'Tipo Servizio', 'Prezzo', 'Data Inizio', 'Durata (settimane)', 'Note'
        ]);

        clients.forEach(c => {
            rows.push([
                c.id,
                c.first_name,
                c.last_name,
                c.email || '',
                c.service_type,
                c.service_price,
                c.program_start_date || '',
                c.program_duration_weeks || '',
                (c.notes || '').replace(/\r?\n/g, ' ')
            ]);
        });

        const csv = rows.map(r =>
            r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pt-manager-clients.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
