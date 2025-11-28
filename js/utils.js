export function formatService(c) {
    if (c.service_type === 'MENSILE') {
        return `Mensile (€${c.service_price})`;
    }
    return `Trimestrale (€${c.service_price})`;
}

export function formatServiceFinances(c) {
    if (c.service_type === 'MENSILE') {
        return `Mensile`;
    }
    return `Trimestrale`;
}

export function calculateWeeksRemaining(client) {
    if (!client.program_start_date || !client.program_duration_weeks) return null;

    const start = new Date(client.program_start_date);
    const now = new Date();
    const diffWeeks = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7));

    return client.program_duration_weeks - diffWeeks;
}

export function getProgramText(client) {
    if (!client.program_start_date || !client.program_duration_weeks) {
        return '—';
    }

    const weeksRemaining = calculateWeeksRemaining(client);
    if (weeksRemaining === null || weeksRemaining <= 0) {
        return 'PERIODO CONCLUSO';
    }

    return `${weeksRemaining} settimane rimanenti`;
}

export function getPaymentInfo(client) {
    const dueStr = client.next_payment_due_date;

    if (!dueStr) {
        return { text: 'In Sospeso', status: 'unknown' };
    }

    const now = new Date();
    const due = new Date(dueStr);
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays >= 5) {
        return { text: 'In Regola', status: 'ok' };
    }
    if (diffDays >= 0) {
        return { text: 'In Sospeso', status: 'due_soon' };
    }
    return { text: 'Scaduto', status: 'late' };
}

export function parseService(value) {
    switch (value) {
        case 'mensile_50': return ['MENSILE', 50];
        case 'mensile_70': return ['MENSILE', 70];
        case 'trimestrale_150': return ['TRIMESTRALE', 150];
        case 'trimestrale_210': return ['TRIMESTRALE', 210];
        default: return ['MENSILE', 0];
    }
}

export function convertServiceToSelect(c) {
    const price = Number(c.service_price);

    if (c.service_type === 'MENSILE' && price === 50) return 'mensile_50';
    if (c.service_type === 'MENSILE' && price === 70) return 'mensile_70';
    if (c.service_type === 'TRIMESTRALE' && price === 150) return 'trimestrale_150';
    if (c.service_type === 'TRIMESTRALE' && price === 210) return 'trimestrale_210';

    return '';
}

export function isSameMonthAndYear(dateStr, refDate = new Date()) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;

    return (
        d.getFullYear() === refDate.getFullYear() &&
        d.getMonth() === refDate.getMonth()
    );
}

export function formatMonthShort(dateStr) {
    if (!dateStr) return 'Nessun check registrato';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Nessun check registrato';

    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const day = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${monthName} ${year}`;
}

export function getCheckStatus(client) {
    const last = client.last_check_date;
    const flag = Number(client.check_required || 0);

    if (last && isSameMonthAndYear(last) && flag === 1) {
        return { text: 'Check fatto', status: 'done' };
    }

    return { text: 'Check da fare', status: 'todo' };
}
