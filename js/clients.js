import { getClients } from './state.js';
import { formatService, parseService, convertServiceToSelect } from './utils.js';
import { apiPost } from './api.js';

export function renderClientList() {
    const list = document.getElementById('clientList');
    if (!list) return;

    const clients = getClients();
    list.innerHTML = '';

    clients.forEach(c => {
        const div = document.createElement('div');
        div.className = 'client-list-item';

        div.innerHTML = `
            <div class="client-list-text">
                <strong>${c.first_name} ${c.last_name}</strong><br>
                ${formatService(c)}
            </div>
            <div class="client-list-actions">
                <button class="btn-small edit-btn" data-id="${c.id}">Modifica</button>
                <button class="btn-small delete-btn" data-id="${c.id}">Elimina</button>
            </div>
        `;

        list.appendChild(div);
    });
}

function openClientModal(client = null) {
    const modal = document.getElementById('clientModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const title = document.getElementById('modalTitle');
    const idInput = document.getElementById('clientId');
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const email = document.getElementById('email');
    const service = document.getElementById('service');
    const startDate = document.getElementById('startDate');
    const programDuration = document.getElementById('programDuration');
    const notes = document.getElementById('notes');

    if (client) {
        if (title) title.innerText = 'Modifica Cliente';
        if (idInput) idInput.value = client.id;
        if (firstName) firstName.value = client.first_name || '';
        if (lastName) lastName.value = client.last_name || '';
        if (email) email.value = client.email || '';
        if (service) service.value = convertServiceToSelect(client);
        if (startDate) startDate.value = client.program_start_date || '';
        if (programDuration) programDuration.value = client.program_duration_weeks || '';
        if (notes) notes.value = client.notes || '';
    } else {
        if (title) title.innerText = 'Aggiungi Cliente';
        const form = document.getElementById('clientForm');
        if (form) form.reset();
        if (idInput) idInput.value = '';
    }
}

function closeClientModal() {
    const modal = document.getElementById('clientModal');
    if (modal) modal.style.display = 'none';
}

// Handlery do formularza (add / edit)
export function setupClientFormHandlers(onAfterSave) {
    const btnAdd1 = document.getElementById('addClientBtn');
    const btnAdd2 = document.getElementById('addClientBtn2');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('clientForm');

    if (btnAdd1) btnAdd1.addEventListener('click', () => openClientModal());
    if (btnAdd2) btnAdd2.addEventListener('click', () => openClientModal());
    if (closeBtn) closeBtn.addEventListener('click', closeClientModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeClientModal);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idInput = document.getElementById('clientId');
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            const email = document.getElementById('email');
            const service = document.getElementById('service');
            const startDate = document.getElementById('startDate');
            const programDuration = document.getElementById('programDuration');
            const notes = document.getElementById('notes');

            const [tipo, prezzo] = parseService(service.value);

            const payload = {
                id: idInput && idInput.value ? idInput.value : null,
                first_name: firstName.value.trim(),
                last_name: lastName.value.trim(),
                email: email.value.trim(),
                service_type: tipo,
                service_price: prezzo,
                program_start_date: startDate.value,
                program_duration_weeks: parseInt(programDuration.value, 10),
                notes: notes.value.trim(),
                is_active: 1
            };

            await apiPost('save_client', payload);
            closeClientModal();

            if (typeof onAfterSave === 'function') {
                onAfterSave();
            }
        });
    }
}

export function setupClientListHandlers(onAfterChange) {
    document.body.addEventListener('click', async (e) => {
        const t = e.target;

        if (t.classList.contains('edit-btn')) {
            const id = t.dataset.id;
            const clients = getClients();
            const client = clients.find(c => String(c.id) === String(id));
            if (client) openClientModal(client);
        }

        if (t.classList.contains('delete-btn')) {
            const id = t.dataset.id;
            if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;
            await apiPost('delete_client', { id });

            if (typeof onAfterChange === 'function') {
                onAfterChange();
            }
        }
    });
}
