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
        const rawNote = (c.notes || '').trim();
        const notePreview = rawNote
            ? (rawNote.length > 30 ? rawNote.slice(0, 9) + '…' : rawNote)
            : 'Nessuna nota';

        div.innerHTML = `
            <div class="client-list-main">
                <div class="client-list-text">
                    <strong class="client-list-name">
                        ${c.first_name} ${c.last_name}
                    </strong>
                    <div class="client-list-service">
                        ${formatService(c)}
                    </div>
                </div>
                <div class="client-list-spacer"></div>

                <div class="client-list-note">
                    <div class="client-note-label">Note:</div>
                    <div class="client-note-value">${notePreview}</div>
                </div>
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

async function loadClientChecks(clientId) {
    const container = document.getElementById('clientChecksContainer');
    if (!container) return;

    container.innerHTML = '<p class="client-checks-loading">Caricamento storico check...</p>';

    try {
        const res = await fetch(
            `api/Api.php?action=client_checks&client_id=${encodeURIComponent(clientId)}`
        );

        if (!res.ok) {
            container.innerHTML = '<p class="client-checks-error">Errore nel caricamento dei check.</p>';
            return;
        }

        const json = await res.json();
        const payload = json.data || json;
        const checks = payload.checks || [];

        if (!checks.length) {
            container.innerHTML = `
                <div class="client-checks-block">
                    <h4>Storico check mensili</h4>
                    <p class="client-checks-empty">Nessun check registrato</p>
                </div>
            `;
            return;
        }

        const formatCheckText = (ch) => {
            const src = ch.created_at || ch.check_date;
            if (!src) return 'Check fatto';

            const d = new Date(String(src).replace(' ', 'T'));
            if (Number.isNaN(d.getTime())) {
                return `${src}`;
            }

            d.setHours(d.getHours() + 1);

            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');

            return `${day}.${month}.${year} ${hours}:${minutes}`;
        };

        const rowsHtml = checks.map(ch => `
            <tr>
                <td>${formatCheckText(ch)}</td>
                <td class="client-checks-actions">
                    <button type="button" class="btn-icon-small delete-check-btn"
                            data-check-id="${ch.id}"
                            aria-label="Elimina check">
                        <svg xmlns="http://www.w3.org/2000/svg"
                            width="20" height="20" viewBox="0 0 24 24">
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
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="client-checks-block">
                <h4>Storico check mensili</h4>
                <table class="client-checks-table">
                    <thead>
                        <tr>
                            <th>Check fatto in data</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        const table = container.querySelector('.client-checks-table');
        if (table) {
            table.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('.delete-check-btn');
                if (!btn) return;
                ev.preventDefault();
                ev.stopPropagation();

                const checkId = btn.dataset.checkId;
                if (!checkId) return;

                try {
                    const resp = await fetch('api/Api.php?action=delete_client_check', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: checkId })
                    });

                    if (!resp.ok) {
                        alert('Errore durante l\'eliminazione del check.');
                        return;
                    }

                    await loadClientChecks(clientId);
                } catch (e) {
                    console.error(e);
                    alert('Errore durante l\'eliminazione del check.');
                }
            }, { once: true });
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="client-checks-error">Errore nel caricamento dei check.</p>';
    }
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
    const checksContainer = document.getElementById('clientChecksContainer');

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

        if (checksContainer) {
            loadClientChecks(client.id);
        }
    } else {
        if (title) title.innerText = 'Aggiungi Cliente';
        const form = document.getElementById('clientForm');
        if (form) form.reset();
        if (idInput) idInput.value = '';

        if (checksContainer) {
            checksContainer.innerHTML = '';
        }
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

    modal.display = 'flex';
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