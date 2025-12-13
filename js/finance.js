import { getClients } from './state.js';
import { formatService, formatServiceFinances } from './utils.js';

export function renderFinance() {
    const tbody = document.getElementById('financeTableBody');
    const annual = document.getElementById('totalAnnualRevenue');
    const active = document.getElementById('financeActiveClients');
    const totalClientsEl = document.getElementById('financeTotalClients');
    const monthly = document.getElementById('monthlyAverage');
    const progress = document.getElementById('revenueProgress');
    const percentLabel = document.getElementById('revenuePercentage');

    if (!tbody) return;

    const clients = getClients();
    const activeClients = clients.filter(c => Number(c.is_active) === 1);

    tbody.innerHTML = '';

    let totalYear = 0;
    let totalMonthly = 0;

    activeClients.forEach(c => {
        const annualIncome = (c.service_type === 'TRIMESTRALE')
            ? Number(c.service_price) * 4
            : Number(c.service_price) * 12;

        totalYear += annualIncome;
        totalMonthly += Number(c.service_price);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.first_name} ${c.last_name}</td>
            <td>${formatServiceFinances(c)}</td>
            <td>€${c.service_price}</td>
            <td>€${annualIncome}</td>
        `;
        tbody.appendChild(tr);
    });

    const activeCount = activeClients.length;
    const totalCount = clients.length;

    if (annual) {
        annual.innerText = '€' + totalYear;
        if (totalYear > 5000) {
            annual.style.color = 'var(--danger)';
        } else {
            annual.style.color = '';
        }
    }

    if (active) active.innerText = activeCount;
    if (totalClientsEl) totalClientsEl.innerText = totalCount;

    if (monthly) {
        monthly.innerText = '€' + totalMonthly;
    }

    if (progress && percentLabel) {
        const percent = Math.min(100, (totalYear / 5000) * 100);
        percentLabel.innerText = percent.toFixed(1) + '%';
        progress.style.width = percent + '%';

        if (totalYear > 5000) {
            progress.style.backgroundColor = 'var(--danger)';
        } else {
            progress.style.backgroundColor = '';
        }
    }
}

export function setupExport() {
    const btn = document.getElementById('exportDataBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        try {
            const res = await fetch('api/Api.php?action=export_data');
            if (!res.ok) {
                alert('Errore durante il caricamento dei dati.');
                return;
            }

            const json = await res.json();
            const data = json.data || json;

            const clients = data.clients || [];
            const checksByClient = data.checks_by_client || {};
            const paymentsByClient = data.payments_by_client || {};

            if (!clients.length) {
                alert('Nessun dato da esportare.');
                return;
            }

            if (typeof XLSX === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = () => generateExcel(clients, checksByClient, paymentsByClient);
                document.head.appendChild(script);
            } else {
                generateExcel(clients, checksByClient, paymentsByClient);
            }
        } catch (e) {
            console.error(e);
            alert('Errore durante l\'esportazione dei dati.');
        }
    });
}

function generateExcel(clients, checksByClient, paymentsByClient) {
    const wb = XLSX.utils.book_new();
    const clientsData = [
        [
            'ID', 'Nome', 'Cognome', 'Email', 'Telefono',
            'Tipo Servizio', 'Prezzo', 'Data Inizio', 'Durata (settimane)',
            'Attivo', 'Ultima Paga', 'Prossima Paga', 'Ultimo Check',
            'Note', 'Data Creazione'
        ]
    ];

    clients.forEach(c => {
        clientsData.push([
            c.id,
            c.first_name,
            c.last_name,
            c.email || '',
            c.phone || '',
            c.service_type,
            parseFloat(c.service_price),
            c.program_start_date || '',
            c.program_duration_weeks || '',
            c.is_active == 1 ? 'Sì' : 'No',
            c.last_payment_date || '',
            c.next_payment_due_date || '',
            c.last_check_date || '',
            (c.notes || '').replace(/\r?\n/g, ' '),
            c.created_at || ''
        ]);
    });

    const wsClients = XLSX.utils.aoa_to_sheet(clientsData);

    wsClients['!cols'] = [
        { wch: 5 },  
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 25 }, 
        { wch: 15 }, 
        { wch: 12 }, 
        { wch: 10 }, 
        { wch: 12 }, 
        { wch: 10 }, 
        { wch: 8 },
        { wch: 12 },
        { wch: 12 }, 
        { wch: 12 }, 
        { wch: 30 }, 
        { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, wsClients, 'Clienti');

    const paymentsData = [
        ['Cliente ID', 'Nome', 'Cognome', 'Data Pagamento', 'Importo', 'Registrato il']
    ];

    clients.forEach(c => {
        const payments = paymentsByClient[c.id] || [];
        if (payments.length === 0) {
            paymentsData.push([
                c.id,
                c.first_name,
                c.last_name,
                'Nessun pagamento',
                '',
                ''
            ]);
        } else {
            payments.forEach(p => {
                paymentsData.push([
                    c.id,
                    c.first_name,
                    c.last_name,
                    p.payment_date || '',
                    parseFloat(p.amount),
                    p.created_at || ''
                ]);
            });
        }
    });

    const wsPayments = XLSX.utils.aoa_to_sheet(paymentsData);
    wsPayments['!cols'] = [
        { wch: 10 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 10 },
        { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, wsPayments, 'Storico Pagamenti');

    const checksData = [
        ['Cliente ID', 'Nome', 'Cognome', 'Data Check', 'Registrato il']
    ];

    clients.forEach(c => {
        const checks = checksByClient[c.id] || [];
        if (checks.length === 0) {
            checksData.push([
                c.id,
                c.first_name,
                c.last_name,
                'Nessun check',
                ''
            ]);
        } else {
            checks.forEach(ch => {
                checksData.push([
                    c.id,
                    c.first_name,
                    c.last_name,
                    ch.check_date || '',
                    ch.created_at || ''
                ]);
            });
        }
    });

    const wsChecks = XLSX.utils.aoa_to_sheet(checksData);
    wsChecks['!cols'] = [
        { wch: 10 }, 
        { wch: 15 }, 
        { wch: 15 },
        { wch: 15 }, 
        { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, wsChecks, 'Storico Check');

    const activeClients = clients.filter(c => c.is_active == 1);
    let totalYear = 0;
    let totalMonthly = 0;

    activeClients.forEach(c => {
        const annual = (c.service_type === 'TRIMESTRALE')
            ? parseFloat(c.service_price) * 4
            : parseFloat(c.service_price) * 12;
        totalYear += annual;
        totalMonthly += parseFloat(c.service_price);
    });

    const statsData = [
        ['Statistica', 'Valore'],
        ['Clienti Totali', clients.length],
        ['Clienti Attivi', activeClients.length],
        ['Clienti Non Attivi', clients.length - activeClients.length],
        ['Guadagno Annuale Totale', `€${totalYear.toFixed(2)}`],
        ['Entrate Mensili Medie', `€${totalMonthly.toFixed(2)}`],
        ['Limite Legale', '€5000.00'],
        ['% del Limite', `${((totalYear / 5000) * 100).toFixed(1)}%`]
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    wsStats['!cols'] = [
        { wch: 30 }, 
        { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiche');

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `PT-Manager-Export-${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
}