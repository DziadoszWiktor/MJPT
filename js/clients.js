import { getClients } from './state.js';
import { formatService, parseService, convertServiceToSelect } from './utils.js';
import { apiPost } from './api.js';

let deleteCandidateId = null;

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
                <button class="btn-primary btn-edit edit-btn" data-id="${c.id}">
                    Modifica
                </button>
                <button class="btn-icon delete-btn" data-id="${c.id}" aria-label="Elimina cliente">
                    <svg xmlns="http://www.w3.org/2000/svg"
                        width="26" height="26" viewBox="0 0 24 24">
                        <g fill="none" stroke="#ffffff" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 7h16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M6 7l1 11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-11" />
                            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </g>
                    </svg>
                </button>
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

function openDeleteModal(client) {
    const modal = document.getElementById('deleteConfirmModal');
    const nameEl = document.getElementById('deleteClientName');
    if (!modal) return;

    deleteCandidateId = client.id;
    if (nameEl) {
        nameEl.textContent = `${client.first_name} ${client.last_name}`;
    }

    modal.style.display = 'flex';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
    deleteCandidateId = null;
}

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
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        // EDIT
        if (editBtn) {
            const id = editBtn.dataset.id;
            const clients = getClients();
            const client = clients.find(c => String(c.id) === String(id));
            if (client) openClientModal(client);
            return;
        }

        // DELETE
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const clients = getClients();
            const client = clients.find(c => String(c.id) === String(id));
            if (client) openDeleteModal(client);
            return;
        }
    });

    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const closeBtn = document.getElementById('closeDeleteModal');
    const modal = document.getElementById('deleteConfirmModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (cancelBtn) cancelBtn.addEventListener('click', closeDeleteModal);
    if (closeBtn) closeBtn.addEventListener('click', closeDeleteModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDeleteModal();
            }
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!deleteCandidateId) {
                closeDeleteModal();
                return;
            }

            await apiPost('delete_client', { id: deleteCandidateId });
            closeDeleteModal();

            if (typeof onAfterChange === 'function') {
                onAfterChange();
            }
        });
    }
}