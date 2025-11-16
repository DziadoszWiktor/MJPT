// =====================================================
//   PT MANAGER - SCRIPT.JS (wersja PHP / MySQL)
//   Zero supabase, zero PTManager, czysty vanilla JS
// =====================================================

let clients = [];
let selectedClientId = null;

// -----------------------------
//  API HELPERS
// -----------------------------
async function apiGet(action) {
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`);
    return await res.json();
}

async function apiPost(action, body = {}) {
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return await res.json();
}

// -----------------------------
//  UTIL
// -----------------------------
function formatService(c) {
    if (c.service_type === "MENSILE") return `Mensile (€${c.service_price})`;
    return `Trimestrale (€${c.service_price})`;
}

function calcWeeksLeft(c) {
    if (!c.program_start_date || !c.program_duration_weeks) return 0;
    const start = new Date(c.program_start_date);
    const now = new Date();
    const diffWeeks = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, c.program_duration_weeks - diffWeeks);
}

function calcPaymentStatus(c) {
    if (!c.next_payment_due_date) return "In regola";
    const now = new Date();
    const due = new Date(c.next_payment_due_date);
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays >= 5) return "In regola";
    if (diffDays >= 0) return "Entro 5 giorni";
    return "Oltre 5 giorni";
}

function parseService(value) {
    switch (value) {
        case "mensile_50": return ["MENSILE", 50];
        case "mensile_70": return ["MENSILE", 70];
        case "trimestrale_150": return ["TRIMESTRALE", 150];
        case "trimestrale_210": return ["TRIMESTRALE", 210];
        default: return ["MENSILE", 0];
    }
}

function convertServiceToSelect(c) {
    if (c.service_type === "MENSILE" && Number(c.service_price) === 50) return "mensile_50";
    if (c.service_type === "MENSILE" && Number(c.service_price) === 70) return "mensile_70";
    if (c.service_type === "TRIMESTRALE" && Number(c.service_price) === 150) return "trimestrale_150";
    if (c.service_type === "TRIMESTRALE" && Number(c.service_price) === 210) return "trimestrale_210";
    return "";
}

// -----------------------------
//  RENDER: DASHBOARD
// -----------------------------
function renderDashboard() {
    const grid = document.getElementById('clientGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid || !emptyState) return;

    const activeClients = clients.slice();

    if (activeClients.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    grid.innerHTML = activeClients.map((client) => {
        const weeksRemaining = calculateWeeksRemaining(client);
        const payment = getPaymentStatus(client);

        let programText = '';
        if (!client.start_date || !client.program_duration) {
            programText = '—';
        } else if (weeksRemaining <= 0) {
            programText = 'PERIODO CONCLUSO';
        } else {
            programText = `${weeksRemaining} settimane rimanenti`;
        }

        let paymentBadgeClass = 'badge-danger';
        if (payment.status === 'ok') paymentBadgeClass = 'badge-success';
        else if (payment.status === 'due_soon') paymentBadgeClass = 'badge-warning';

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
                    </div>

                    <div class="client-badges">
                        <span class="badge ${client.is_active == 1 ? 'badge-success' : 'badge-danger'}">
                            ${client.is_active == 1 ? '✓ ATTIVO' : '✗ NON ATTIVO'}
                        </span>

                        <span class="badge ${paymentBadgeClass}">
                            ${payment.text}
                        </span>

                        <span class="badge ${client.check_required == 1 ? 'badge-warning' : 'badge-success'}">
                            ${client.check_required == 1 ? '○ CHECK DA FARE' : '✓ CHECK FATTO'}
                        </span>
                    </div>

                </div>
            </div>
        `;
    }).join('');

    updateHeaderStats();
}

function calculateWeeksRemaining(client) {
    if (!client.start_date || !client.program_duration) return null;
    const start = new Date(client.start_date);
    const now = new Date();
    const diffWeeks = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7));
    return client.program_duration - diffWeeks;
}

function getPaymentStatus(client) {
    // pole z bazy: next_payment_due_date
    const dueStr = client.next_payment_due_date;

    // brak ustawionej kolejnej płatności → traktujemy jako "w zawieszeniu"
    if (!dueStr) {
        return { text: "In Sospeso", status: "unknown" };
    }

    const now = new Date();
    const due = new Date(dueStr); // "YYYY-MM-DD"
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    // zgodnie z Twoją logiką:
    //  - In Regola  = >= 5 dni do terminu
    //  - In Sospeso = 0–4 dni
    //  - Scaduto    = po terminie
    if (diffDays >= 5) {
        return { text: "In Regola", status: "ok" };
    }
    if (diffDays >= 0) {
        return { text: "In Sospeso", status: "due_soon" };
    }
    return { text: "Scaduto", status: "late" };
}


function getClientStatus(client) {
    return client.active ? "ATTIVO" : "NON ATTIVO";
}

// -----------------------------
//  RENDER: LISTA CLIENTI
// -----------------------------
function renderClientList() {
    const list = document.getElementById("clientList");
    if (!list) return;

    list.innerHTML = "";

    clients.forEach(c => {
        const div = document.createElement("div");
        div.className = "client-list-item";

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

// -----------------------------
//  RENDER: FINANZE
// -----------------------------
function renderFinance() {
    const tbody = document.getElementById("financeTableBody");
    const annual = document.getElementById("totalAnnualRevenue");
    const active = document.getElementById("financeActiveClients");
    const monthly = document.getElementById("monthlyAverage");
    const progress = document.getElementById("revenueProgress");
    const percentLabel = document.getElementById("revenuePercentage");

    if (!tbody) return;

    tbody.innerHTML = "";

    let totalYear = 0;
    let totalMonthly = 0;

    clients.forEach(c => {
        const annualIncome = (c.service_type === "TRIMESTRALE")
            ? Number(c.service_price) * 4
            : Number(c.service_price) * 12;

        totalYear += annualIncome;
        totalMonthly += Number(c.service_price);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.first_name} ${c.last_name}</td>
            <td>${formatService(c)}</td>
            <td>€${c.service_price}</td>
            <td>€${annualIncome}</td>
        `;
        tbody.appendChild(tr);
    });

    if (annual) annual.innerText = "€" + totalYear;
    if (active) active.innerText = clients.length;
    if (monthly) monthly.innerText = "€" + totalMonthly;

    if (progress && percentLabel) {
        let percent = Math.min(100, (totalYear / 5000) * 100);
        percentLabel.innerText = percent.toFixed(1) + "%";
        progress.style.width = percent + "%";
    }
}

// -----------------------------
//  HEADER TOP STATS
// -----------------------------
function updateHeaderStats() {
    const elActive = document.getElementById("activeClientsCount");
    const elAnnual = document.getElementById("annualRevenue");
    const elNoti = document.getElementById("notificationCount");

    if (elActive) {
        elActive.innerText = clients.filter(c => Number(c.is_active) === 1).length;
    }

    let total = 0;
    clients.forEach(c => {
        if (c.service_type === "TRIMESTRALE") total += Number(c.service_price) * 4;
        else total += Number(c.service_price) * 12;
    });

    if (elAnnual) elAnnual.innerText = "€" + total;

    const noti = clients.filter(c => calcPaymentStatus(c) !== "In regola").length;
    if (elNoti) elNoti.innerText = noti;
}

// -----------------------------
// 🔥 POPRAWIONE — ŁADUJE DANE TYLKO RENDER SEKCJI AKTYWNEJ
// -----------------------------
async function loadClients() {
    try {
        const data = await apiGet("list_clients");
        clients = data.clients || [];
    } catch (e) {
        console.error("Errore caricando i clienti:", e);
        clients = [];
    }

    updateHeaderStats();
    renderCurrentSection(); // zamiast renderować WSZYSTKO
}

// 🔥 decyduje co renderować
function renderCurrentSection() {
    const activeTab = document.querySelector(".nav-tab.active");
    if (!activeTab) return;

    const section = activeTab.dataset.section;

    if (section === "dashboard") renderDashboard();
    if (section === "clients") renderClientList();
    if (section === "finance") renderFinance();
}

// =====================================================
//  NAVIGAZIONE / SEARCH / THEME / EXPORT
// =====================================================
function setupNav() {
    const tabs = document.querySelectorAll(".nav-tab");
    const sections = document.querySelectorAll(".content-section");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.section;

            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            sections.forEach(sec => {
                sec.classList.toggle("active", sec.id === target);
            });

            renderCurrentSection(); // 🔥 render po zmianie zakładki
        });
    });
}

function setupSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener("input", () => {
        const q = input.value.toLowerCase();

        document.querySelectorAll("#clientGrid .client-tile").forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(q) ? "block" : "none";
        });

        document.querySelectorAll("#clientList .client-list-item").forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(q) ? "flex" : "none";
        });
    });
}

function setupThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });
}

function setupExport() {
    const btn = document.getElementById("exportDataBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        if (!clients.length) {
            alert("Nessun dato da esportare.");
            return;
        }

        const rows = [];
        rows.push([
            "ID", "Nome", "Cognome", "Email",
            "Tipo Servizio", "Prezzo", "Data Inizio", "Durata (settimane)", "Note"
        ]);

        clients.forEach(c => {
            rows.push([
                c.id,
                c.first_name,
                c.last_name,
                c.email || "",
                c.service_type,
                c.service_price,
                c.program_start_date || "",
                c.program_duration_weeks || "",
                (c.notes || "").replace(/\r?\n/g, " ")
            ]);
        });

        const csv = rows.map(r =>
            r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")
        ).join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pt-manager-clients.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function setupGlobalClickHandlers() {
    document.body.addEventListener("click", async (e) => {
        const t = e.target;

        if (t.classList.contains("edit-btn")) {
            const id = t.dataset.id;
            const client = clients.find(c => String(c.id) === String(id));
            if (client) openClientModal(client);
        }

        if (t.classList.contains("delete-btn")) {
            const id = t.dataset.id;
            if (!confirm("Sei sicuro di voler eliminare questo cliente?")) return;
            await apiPost("delete_client", { id });
            loadClients();
        }
    });

    window.addEventListener("click", (e) => {
        if (e.target && e.target.id === "quickActionModal") {
            closeQuickModal();
        }
    });
}

// =====================================================
//  MODAL CLIENTE (Aggiungi / Modifica)
// =====================================================
function openClientModal(client = null) {
    const modal = document.getElementById("clientModal");
    if (!modal) return;
    modal.style.display = "flex";

    const title = document.getElementById("modalTitle");
    const idInput = document.getElementById("clientId");
    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const email = document.getElementById("email");
    const service = document.getElementById("service");
    const startDate = document.getElementById("startDate");
    const programDuration = document.getElementById("programDuration");
    const notes = document.getElementById("notes");

    if (client) {
        if (title) title.innerText = "Modifica Cliente";
        if (idInput) idInput.value = client.id;
        if (firstName) firstName.value = client.first_name || "";
        if (lastName) lastName.value = client.last_name || "";
        if (email) email.value = client.email || "";
        if (service) service.value = convertServiceToSelect(client);
        if (startDate) startDate.value = client.program_start_date || "";
        if (programDuration) programDuration.value = client.program_duration_weeks || "";
        if (notes) notes.value = client.notes || "";
    } else {
        if (title) title.innerText = "Aggiungi Cliente";
        const form = document.getElementById("clientForm");
        if (form) form.reset();
        if (idInput) idInput.value = "";
    }
}

function closeClientModal() {
    const modal = document.getElementById("clientModal");
    if (modal) modal.style.display = "none";
}

function setupModalHandlers() {
    const btnAdd1 = document.getElementById("addClientBtn");
    const btnAdd2 = document.getElementById("addClientBtn2");
    const closeBtn = document.getElementById("closeModal");
    const cancelBtn = document.getElementById("cancelBtn");
    const form = document.getElementById("clientForm");

    if (btnAdd1) btnAdd1.addEventListener("click", () => openClientModal());
    if (btnAdd2) btnAdd2.addEventListener("click", () => openClientModal());
    if (closeBtn) closeBtn.addEventListener("click", closeClientModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeClientModal);

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const idInput = document.getElementById("clientId");
            const firstName = document.getElementById("firstName");
            const lastName = document.getElementById("lastName");
            const email = document.getElementById("email");
            const service = document.getElementById("service");
            const startDate = document.getElementById("startDate");
            const programDuration = document.getElementById("programDuration");
            const notes = document.getElementById("notes");

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

            await apiPost("save_client", payload);
            closeClientModal();
            loadClients();
        });
    }
}

// 🔥 obsługa kliknięcia badge w dashboardzie
document.body.addEventListener("click", async (e) => {
    const el = e.target;
    if (!el.classList.contains("badge")) return;

    const tile = el.closest(".client-tile");
    if (!tile) return;

    const id = tile.dataset.id;

    // aktywność
    if (el.textContent.includes("ATTIVO") || el.textContent.includes("NON ATTIVO")) {
        await apiPost("quick_action", { id, type: "toggle_active" });
        loadClients();
        return;
    }

    // płatność
    if (
        el.textContent.includes("Regola") ||
        el.textContent.includes("Sospeso") ||
        el.textContent.includes("Scaduto")
    ) {
        await apiPost("quick_action", { id, type: "mark_payment_done" });
        loadClients();
        return;
    }

    // check
    if (el.textContent.includes("CHECK")) {
        await apiPost("quick_action", { id, type: "toggle_check_required" });
        loadClients();
        return;
    }
});



// =====================================================
//  INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    setupNav();
    setupSearch();
    setupThemeToggle();
    setupModalHandlers();
    setupExport();
    setupGlobalClickHandlers();
    loadClients();
});
