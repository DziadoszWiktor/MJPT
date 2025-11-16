import { setClients } from './state.js';

const API_URL = 'api/Api.php';

export async function apiGet(action) {
    const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);

    return await res.json();
}

export async function apiPost(action, body = {}) {
    const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    return await res.json();
}

export async function loadClientsFromApi() {
    try {
        const data = await apiGet('list_clients');
        setClients(data.clients || []);
    } catch (e) {
        console.error('Errore caricando i clienti:', e);
        setClients([]);
    }
}
