// Personal Trainer Management System con gestione CSV e PWA
class PTManager {
    constructor() {
        this.clients = [];
        this.payments = [];
        this.programs = [];
        this.checks = [];
        this.csvCache = '';

        this.currentTab = 'dashboard';
        this.editingClient = null;
        this.editingProgram = null;
        this.isInitialized = false;

        this.ready = this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.refreshAll();
        this.isInitialized = true;

        // Auto-save periodico
        setInterval(() => this.saveData(), 30000);
    }

    async loadData() {
        const storedClients = localStorage.getItem('pt_clients');
        const storedPayments = localStorage.getItem('pt_payments');
        const storedPrograms = localStorage.getItem('pt_programs');
        const storedChecks = localStorage.getItem('pt_checks');

        if (storedClients) {
            this.clients = JSON.parse(storedClients);
        } else {
            await this.loadClientsFromCSV();
        }

        this.payments = storedPayments ? JSON.parse(storedPayments) : [];
        this.programs = storedPrograms ? JSON.parse(storedPrograms) : [];
        this.checks = storedChecks ? JSON.parse(storedChecks) : [];

        this.ensurePaymentsForAllClients();
        this.updateCSVCache();
    }

    async loadClientsFromCSV() {
        try {
            const response = await fetch('data/clients.csv');
            if (!response.ok) return;
            const text = await response.text();
            const rows = this.parseCSV(text);

            this.clients = rows
                .filter(row => row.name)
                .map(row => ({
                    id: row.id || this.generateId(),
                    name: row.name,
                    email: row.email || '',
                    phone: row.phone || '',
                    monthlyFee: parseFloat(row.monthlyFee || '0'),
                    startDate: row.startDate || new Date().toISOString().split('T')[0],
                    active: row.active ? row.active.toLowerCase() !== 'false' : true,
                    createdAt: row.createdAt || new Date().toISOString()
                }));

            this.clients.forEach(client => {
                if (!client.id) client.id = this.generateId();
            });
        } catch (error) {
            console.warn('Impossibile caricare il CSV iniziale', error);
            this.clients = [];
        }
    }

    setupEventListeners() {
        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (!btn.hasAttribute('type')) {
                btn.setAttribute('type', 'button');
            }
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        if (!tabButtons.length) {
            console.warn('Tab buttons non trovati, verifica il markup della navigazione.');
        }

        // Forms
        const clientForm = document.getElementById('clientForm');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveClient();
            });
        } else {
            console.warn('Form clienti non trovato, impossibile registrare il submit.');
        }

        const programForm = document.getElementById('programForm');
        if (programForm) {
            programForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProgram();
            });
        } else {
            console.warn('Form programmi non trovato, impossibile registrare il submit.');
        }

        // Payment filter
        const paymentFilter = document.getElementById('paymentFilter');
        if (paymentFilter) {
            paymentFilter.addEventListener('change', (e) => {
                this.renderPayments(e.target.value);
            });
        }

        // Modal close on outside click
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        if (!modals.length) {
            console.warn('Nessuna modale trovata: controlla che il markup sia stato caricato.');
        }
    }

    refreshAll() {
        this.updateDashboard();
        this.renderClients();
        this.renderPayments();
        this.renderPrograms();
        this.renderReports();
        this.checkNotifications();
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const tabButton = document.querySelector(`[data-tab="${tab}"]`);
        if (tabButton) tabButton.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(tab);
        if (tabContent) tabContent.classList.add('active');

        this.currentTab = tab;

        switch(tab) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'clients':
                this.renderClients();
                break;
            case 'payments':
                this.renderPayments();
                break;
            case 'programs':
                this.renderPrograms();
                break;
            case 'reports':
                this.renderReports();
                break;
        }
    }

    /* Gestione Clienti */
    openClientModal(clientId = null) {
        this.editingClient = clientId;
        const modal = document.getElementById('clientModal');
        const form = document.getElementById('clientForm');

        if (clientId) {
            const client = this.clients.find(c => c.id === clientId);
            if (!client) return;
            document.getElementById('clientModalTitle').textContent = 'Modifica Cliente';
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('monthlyFee').value = client.monthlyFee;
            document.getElementById('startDate').value = client.startDate;
        } else {
            document.getElementById('clientModalTitle').textContent = 'Nuovo Cliente';
            form.reset();
            document.getElementById('startDate').value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('active');
    }

    closeClientModal() {
        document.getElementById('clientModal').classList.remove('active');
        this.editingClient = null;
    }

    saveClient() {
        const name = document.getElementById('clientName').value.trim();
        const email = document.getElementById('clientEmail').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        const monthlyFee = parseFloat(document.getElementById('monthlyFee').value);
        const startDate = document.getElementById('startDate').value;

        if (!name || Number.isNaN(monthlyFee)) {
            this.showNotification('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        const clientData = {
            name,
            email,
            phone,
            monthlyFee,
            startDate,
            active: true,
            createdAt: new Date().toISOString()
        };

        if (this.editingClient) {
            const index = this.clients.findIndex(c => c.id === this.editingClient);
            if (index === -1) return;
            this.clients[index] = { ...this.clients[index], ...clientData };
            this.ensurePaymentsForClient(this.clients[index]);
            this.showNotification('Cliente aggiornato con successo', 'success');
        } else {
            clientData.id = this.generateId();
            this.clients.push(clientData);
            this.ensurePaymentsForClient(clientData);
            this.showNotification('Nuovo cliente aggiunto con successo', 'success');
        }

        this.saveData();
        this.closeClientModal();
        this.renderClients();
        this.updateDashboard();
    }

    deleteClient(clientId) {
        if (!confirm('Sei sicuro di voler eliminare questo cliente? Tutti i dati associati verranno rimossi.')) return;

        this.clients = this.clients.filter(c => c.id !== clientId);
        this.payments = this.payments.filter(p => p.clientId !== clientId);
        this.programs = this.programs.filter(p => p.clientId !== clientId);
        this.checks = this.checks.filter(c => c.clientId !== clientId);

        this.saveData();
        this.renderClients();
        this.updateDashboard();
        this.showNotification('Cliente eliminato', 'success');
    }

    toggleClientStatus(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
        client.active = !client.active;
        this.saveData();
        this.renderClients();
        this.updateDashboard();

        const status = client.active ? 'attivato' : 'disattivato';
        this.showNotification(`Cliente ${status}`, 'success');
    }

    renderClients() {
        const grid = document.getElementById('clientsGrid');

        if (this.clients.length === 0) {
            grid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #cbd2d9; margin-bottom: 20px;"></i>
                    <h3>Nessun cliente presente</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Inizia aggiungendo il tuo primo cliente</p>
                    <button class="btn btn-primary" onclick="openClientModal()">
                        <i class="fas fa-plus"></i> Aggiungi Cliente
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.clients.map(client => {
            const financial = this.getClientFinancialSummary(client.id);
            const activePrograms = this.programs.filter(p => p.clientId === client.id && p.active).length;

            const statusClass = financial.status === 'overdue'
                ? 'text-danger'
                : financial.status === 'due' ? 'text-warning' : '';

            return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-name">${client.name}</div>
                        <div class="client-status ${client.active ? 'status-active' : 'status-inactive'}">
                            ${client.active ? 'Attivo' : 'Inattivo'}
                        </div>
                    </div>
                    <div class="client-info">
                        <div><i class="fas fa-euro-sign"></i> €${client.monthlyFee.toFixed(2)} / mese</div>
                        ${client.email ? `<div><i class="fas fa-envelope"></i> ${client.email}</div>` : ''}
                        ${client.phone ? `<div><i class="fas fa-phone"></i> ${client.phone}</div>` : ''}
                        <div><i class="fas fa-calendar"></i> Dal ${this.formatDate(client.startDate)}</div>
                        <div><i class="fas fa-dumbbell"></i> ${activePrograms} programmi attivi</div>
                        ${financial.nextPayment
                            ? `<div class="${statusClass}"><i class="fas fa-credit-card"></i> ${financial.nextPayment}</div>`
                            : '<div><i class="fas fa-credit-card"></i> Tutti i pagamenti in regola</div>'}
                        ${financial.outstandingBalance > 0
                            ? `<div class="text-danger"><i class="fas fa-exclamation-circle"></i> Scoperto: €${financial.outstandingBalance.toFixed(2)}</div>`
                            : ''}
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-primary btn-small" onclick="openClientModal('${client.id}')">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn ${client.active ? 'btn-secondary' : 'btn-success'} btn-small" onclick="toggleClientStatus('${client.id}')">
                            <i class="fas fa-${client.active ? 'pause' : 'play'}"></i>
                            ${client.active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="recordPayment('${client.id}')">
                            <i class="fas fa-money-bill"></i> Pagamento
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* Gestione Pagamenti */
    ensurePaymentsForAllClients() {
        this.clients.forEach(client => this.ensurePaymentsForClient(client));
    }

    ensurePaymentsForClient(client) {
        if (!client) return;

        const today = new Date();
        const startDate = new Date(client.startDate);
        const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        for (let i = 0; i < 12; i++) {
            const dueDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
            if (dueDate < startDate) continue;

            const month = dueDate.getMonth() + 1;
            const year = dueDate.getFullYear();
            const existing = this.payments.find(p => p.clientId === client.id && p.month === month && p.year === year);
            if (!existing) {
                this.payments.push({
                    id: this.generateId(),
                    clientId: client.id,
                    amount: client.monthlyFee,
                    dueDate: dueDate.toISOString().split('T')[0],
                    paid: false,
                    paidDate: null,
                    month,
                    year
                });
            } else if (!existing.paid) {
                existing.amount = client.monthlyFee;
            }
        }
    }

    recordPayment(clientId, paymentId = null) {
        if (paymentId) {
            const payment = this.payments.find(p => p.id === paymentId);
            if (!payment) return;
            payment.paid = true;
            payment.paidDate = new Date().toISOString().split('T')[0];
        } else {
            const nextPayment = this.payments
                .filter(p => p.clientId === clientId && !p.paid)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

            if (nextPayment) {
                nextPayment.paid = true;
                nextPayment.paidDate = new Date().toISOString().split('T')[0];
            }
        }

        this.saveData();
        this.renderPayments();
        this.renderClients();
        this.updateDashboard();
        this.showNotification('Pagamento registrato', 'success');
    }

    undoPayment(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (!payment) return;
        payment.paid = false;
        payment.paidDate = null;

        this.saveData();
        this.renderPayments();
        this.renderClients();
        this.updateDashboard();
        this.showNotification('Pagamento annullato', 'success');
    }

    renderPayments(filter = 'all') {
        const container = document.getElementById('paymentsTable');
        let filteredPayments = [...this.payments];

        switch(filter) {
            case 'paid':
                filteredPayments = filteredPayments.filter(p => p.paid);
                break;
            case 'pending':
                filteredPayments = filteredPayments.filter(p => !p.paid && new Date(p.dueDate) >= new Date());
                break;
            case 'overdue':
                filteredPayments = filteredPayments.filter(p => !p.paid && new Date(p.dueDate) < new Date());
                break;
        }

        filteredPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        if (filteredPayments.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <i class="fas fa-receipt" style="font-size: 3rem; color: #cbd2d9; margin-bottom: 20px;"></i>
                    <h3>Nessun pagamento trovato</h3>
                    <p style="color: var(--text-secondary);">I pagamenti vengono creati automaticamente quando aggiungi un cliente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Importo</th>
                        <th>Scadenza</th>
                        <th>Stato</th>
                        <th>Data Pagamento</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredPayments.map(payment => {
                        const client = this.clients.find(c => c.id === payment.clientId);
                        const isOverdue = !payment.paid && new Date(payment.dueDate) < new Date();
                        const isDue = !payment.paid && new Date(payment.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        return `
                            <tr class="${isOverdue ? 'table-danger' : isDue ? 'table-warning' : ''}">
                                <td>${client ? client.name : 'Cliente eliminato'}</td>
                                <td>€${payment.amount.toFixed(2)}</td>
                                <td>${this.formatDate(payment.dueDate)}</td>
                                <td>
                                    <span class="badge ${payment.paid ? 'badge-success' : isOverdue ? 'badge-danger' : isDue ? 'badge-warning' : 'badge-secondary'}">
                                        ${payment.paid ? 'Pagato' : isOverdue ? 'In Ritardo' : isDue ? 'In Scadenza' : 'In Sospeso'}
                                    </span>
                                </td>
                                <td>${payment.paidDate ? this.formatDate(payment.paidDate) : '-'}</td>
                                <td>
                                    ${!payment.paid ? `
                                        <button class="btn btn-success btn-small" onclick="recordPayment('${payment.clientId}', '${payment.id}')">
                                            <i class="fas fa-check"></i> Segna Pagato
                                        </button>
                                    ` : `
                                        <button class="btn btn-secondary btn-small" onclick="undoPayment('${payment.id}')">
                                            <i class="fas fa-undo"></i> Annulla
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    getClientFinancialSummary(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return { nextPayment: null, status: 'ok', outstandingBalance: 0 };

        const unpaid = this.payments
            .filter(p => p.clientId === clientId && !p.paid)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        if (unpaid.length === 0) {
            return { nextPayment: null, status: 'ok', outstandingBalance: 0 };
        }

        const next = unpaid[0];
        const dueDate = new Date(next.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let status = 'ok';
        if (diffDays < 0) status = 'overdue';
        else if (diffDays <= 7) status = 'due';

        const outstandingBalance = unpaid.reduce((sum, payment) => sum + payment.amount, 0);

        return {
            nextPayment: `${this.formatDate(next.dueDate)} (${status === 'overdue' ? 'In ritardo' : status === 'due' ? 'In scadenza' : 'Programmato'})`,
            status,
            outstandingBalance
        };
    }

    /* Gestione Programmi */
    openProgramModal(programId = null) {
        this.editingProgram = programId;
        const modal = document.getElementById('programModal');
        const clientSelect = document.getElementById('programClient');

        clientSelect.innerHTML = this.clients
            .filter(c => c.active)
            .map(c => `<option value="${c.id}">${c.name}</option>`)
            .join('');

        if (programId) {
            const program = this.programs.find(p => p.id === programId);
            if (!program) return;
            document.getElementById('programModalTitle').textContent = 'Modifica Programma';
            document.getElementById('programClient').value = program.clientId;
            document.getElementById('programName').value = program.name;
            document.getElementById('programWeeks').value = program.weeks;
            document.getElementById('programStart').value = program.startDate;
        } else {
            document.getElementById('programModalTitle').textContent = 'Nuovo Programma';
            document.getElementById('programForm').reset();
            document.getElementById('programStart').value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('active');
    }

    closeProgramModal() {
        document.getElementById('programModal').classList.remove('active');
        this.editingProgram = null;
    }

    saveProgram() {
        const clientId = document.getElementById('programClient').value;
        const name = document.getElementById('programName').value.trim();
        const weeks = parseInt(document.getElementById('programWeeks').value, 10);
        const startDate = document.getElementById('programStart').value;

        if (!clientId || !name || Number.isNaN(weeks)) {
            this.showNotification('Compila tutti i campi del programma', 'warning');
            return;
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (weeks * 7));

        const programData = {
            clientId,
            name,
            weeks,
            startDate,
            endDate: endDate.toISOString().split('T')[0],
            active: true,
            createdAt: new Date().toISOString()
        };

        if (this.editingProgram) {
            const index = this.programs.findIndex(p => p.id === this.editingProgram);
            if (index === -1) return;
            this.programs[index] = { ...this.programs[index], ...programData };
            this.showNotification('Programma aggiornato con successo', 'success');
        } else {
            programData.id = this.generateId();
            this.programs.push(programData);
            this.showNotification('Nuovo programma creato con successo', 'success');
        }

        this.saveData();
        this.closeProgramModal();
        this.renderPrograms();
        this.updateDashboard();
    }

    deleteProgram(programId) {
        if (!confirm('Sei sicuro di voler eliminare questo programma?')) return;

        this.programs = this.programs.filter(p => p.id !== programId);
        this.checks = this.checks.filter(c => c.programId !== programId);

        this.saveData();
        this.renderPrograms();
        this.updateDashboard();
        this.showNotification('Programma eliminato', 'success');
    }

    renderPrograms() {
        const grid = document.getElementById('programsGrid');

        if (this.programs.length === 0) {
            grid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #cbd2d9; margin-bottom: 20px;"></i>
                    <h3>Nessun programma presente</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Crea il primo programma di allenamento</p>
                    <button class="btn btn-primary" onclick="openProgramModal()">
                        <i class="fas fa-plus"></i> Nuovo Programma
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.programs.map(program => {
            const client = this.clients.find(c => c.id === program.clientId);
            const daysLeft = Math.ceil((new Date(program.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const progress = Math.max(0, Math.min(100,
                ((new Date() - new Date(program.startDate)) /
                (new Date(program.endDate) - new Date(program.startDate))) * 100
            ));

            return `
                <div class="card">
                    <div class="client-header">
                        <div class="client-name">${program.name}</div>
                        <div class="client-status ${program.active ? 'status-active' : 'status-inactive'}">
                            ${program.active ? 'Attivo' : 'Completato'}
                        </div>
                    </div>
                    <div class="client-info">
                        <div><i class="fas fa-user"></i> ${client ? client.name : 'Cliente eliminato'}</div>
                        <div><i class="fas fa-calendar"></i> ${this.formatDate(program.startDate)} - ${this.formatDate(program.endDate)}</div>
                        <div><i class="fas fa-clock"></i> ${program.weeks} settimane</div>
                        <div class="${daysLeft < 0 ? 'text-danger' : daysLeft <= 7 ? 'text-warning' : ''}">
                            <i class="fas fa-hourglass-half"></i>
                            ${daysLeft < 0 ? 'Scaduto' : daysLeft === 0 ? 'Scade oggi' : `${daysLeft} giorni rimanenti`}
                        </div>
                        <div style="margin-top: 12px;">
                            <div style="background: var(--bg-primary); border-radius: 999px; height: 8px; overflow: hidden;">
                                <div style="background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
                            </div>
                            <small style="color: var(--text-secondary); display: block; margin-top: 6px;">${Math.round(progress)}% completato</small>
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-primary btn-small" onclick="openProgramModal('${program.id}')">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="addCheck('${program.id}')">
                            <i class="fas fa-check-square"></i> Controllo
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteProgram('${program.id}')">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    addCheck(programId) {
        const checkType = prompt('Tipo di controllo (es: Peso, Misure, Foto, Feedback):');
        if (!checkType) return;

        const program = this.programs.find(p => p.id === programId);
        if (!program) return;

        this.checks.push({
            id: this.generateId(),
            programId,
            clientId: program.clientId,
            type: checkType,
            dueDate: new Date().toISOString().split('T')[0],
            completed: false,
            notes: '',
            createdAt: new Date().toISOString()
        });

        this.saveData();
        this.updateDashboard();
        this.showNotification('Controllo aggiunto', 'success');
    }

    completeCheck(checkId) {
        const check = this.checks.find(c => c.id === checkId);
        if (!check) return;
        check.completed = true;
        check.completedDate = new Date().toISOString().split('T')[0];

        this.saveData();
        this.updateDashboard();
        this.showNotification('Controllo completato', 'success');
    }

    /* Dashboard */
    updateDashboard() {
        this.updateStats();
        this.updateUpcomingDeadlines();
        this.updatePendingPayments();
        this.updatePendingChecks();
        this.updateMonthlyOverview();
    }

    updateStats() {
        const activeClients = this.clients.filter(c => c.active).length;
        const yearlyIncome = this.calculateYearlyIncome();

        document.getElementById('activeClients').textContent = activeClients;
        document.getElementById('yearlyIncome').textContent = `€${yearlyIncome.toFixed(2)}`;

        const limitWarning = document.getElementById('limitWarning');
        if (yearlyIncome >= 4000) {
            limitWarning.style.display = 'block';
        } else {
            limitWarning.style.display = 'none';
        }
    }

    updateUpcomingDeadlines() {
        const container = document.getElementById('upcomingDeadlines');
        const upcomingPrograms = this.programs
            .filter(p => p.active)
            .map(p => {
                const daysLeft = Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                return { ...p, daysLeft };
            })
            .filter(p => p.daysLeft <= 14)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        if (upcomingPrograms.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Nessuna scadenza imminente</div>';
            return;
        }

        container.innerHTML = upcomingPrograms.map(program => {
            const client = this.clients.find(c => c.id === program.clientId);
            const urgentClass = program.daysLeft < 0 ? 'urgent' : program.daysLeft <= 7 ? 'warning' : '';

            return `
                <div class="list-item ${urgentClass}">
                    <div>
                        <strong>${program.name}</strong><br>
                        <small>${client ? client.name : 'Cliente eliminato'}</small>
                    </div>
                    <div>
                        ${program.daysLeft < 0 ? 'Scaduto' : program.daysLeft === 0 ? 'Oggi' : `${program.daysLeft}g`}
                    </div>
                </div>
            `;
        }).join('');
    }

    updatePendingPayments() {
        const container = document.getElementById('pendingPayments');
        const pendingPayments = this.payments
            .filter(p => !p.paid)
            .map(p => {
                const daysOverdue = Math.ceil((new Date() - new Date(p.dueDate)) / (1000 * 60 * 60 * 24));
                return { ...p, daysOverdue };
            })
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 5);

        if (pendingPayments.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Tutti i pagamenti sono in regola</div>';
            return;
        }

        container.innerHTML = pendingPayments.map(payment => {
            const client = this.clients.find(c => c.id === payment.clientId);
            const urgentClass = payment.daysOverdue > 0 ? 'urgent' : payment.daysOverdue >= -7 ? 'warning' : '';

            return `
                <div class="list-item ${urgentClass}">
                    <div>
                        <strong>€${payment.amount.toFixed(2)}</strong><br>
                        <small>${client ? client.name : 'Cliente eliminato'}</small>
                    </div>
                    <div>
                        ${payment.daysOverdue > 0 ? `${payment.daysOverdue}g ritardo` :
                          payment.daysOverdue === 0 ? 'Scade oggi' :
                          `${Math.abs(payment.daysOverdue)}g rimanenti`}
                    </div>
                </div>
            `;
        }).join('');
    }

    updatePendingChecks() {
        const container = document.getElementById('pendingChecks');
        const pendingChecks = this.checks
            .filter(c => !c.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);

        if (pendingChecks.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Nessun controllo in sospeso</div>';
            return;
        }

        container.innerHTML = pendingChecks.map(check => {
            const client = this.clients.find(c => c.id === check.clientId);
            const daysOverdue = Math.ceil((new Date() - new Date(check.dueDate)) / (1000 * 60 * 60 * 24));
            const urgentClass = daysOverdue > 0 ? 'urgent' : daysOverdue >= -3 ? 'warning' : '';

            return `
                <div class="list-item ${urgentClass}">
                    <div>
                        <strong>${check.type}</strong><br>
                        <small>${client ? client.name : 'Cliente eliminato'}</small>
                    </div>
                    <div>
                        <button class="btn btn-success btn-small" onclick="completeCheck('${check.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateMonthlyOverview() {
        const monthlyIncome = this.calculateMonthlyIncome();
        const newClientsThisMonth = this.clients.filter(c => {
            const clientDate = new Date(c.createdAt);
            const now = new Date();
            return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear();
        }).length;

        document.getElementById('monthlyIncome').textContent = `€${monthlyIncome.toFixed(2)}`;
        document.getElementById('newClientsMonth').textContent = newClientsThisMonth;
    }

    /* Reportistica */
    renderReports() {
        this.renderYearlyReport();
        this.renderMonthlyReport();
    }

    renderYearlyReport() {
        const container = document.getElementById('yearlyReport');
        const currentYear = new Date().getFullYear();

        const yearlyData = {
            totalIncome: this.calculateYearlyIncome(),
            totalClients: this.clients.length,
            activeClients: this.clients.filter(c => c.active).length,
            completedPrograms: this.programs.filter(p => !p.active).length,
            monthlyBreakdown: []
        };

        for (let month = 0; month < 12; month++) {
            const monthlyIncome = this.payments
                .filter(p => p.paid && p.year === currentYear && p.month === month + 1)
                .reduce((sum, p) => sum + p.amount, 0);

            yearlyData.monthlyBreakdown.push({
                month: new Date(currentYear, month).toLocaleDateString('it-IT', { month: 'long' }),
                income: monthlyIncome
            });
        }

        container.innerHTML = `
            <div class="overview-item">
                <span>Incasso Totale ${currentYear}:</span>
                <span>€${yearlyData.totalIncome.toFixed(2)}</span>
            </div>
            <div class="overview-item">
                <span>Clienti Totali:</span>
                <span>${yearlyData.totalClients}</span>
            </div>
            <div class="overview-item">
                <span>Clienti Attivi:</span>
                <span>${yearlyData.activeClients}</span>
            </div>
            <div class="overview-item">
                <span>Programmi Completati:</span>
                <span>${yearlyData.completedPrograms}</span>
            </div>
            <hr style="margin: 18px 0; border: none; border-top: 1px solid var(--border-soft);">
            <h4 style="margin-bottom: 12px;">Breakdown Mensile</h4>
            ${yearlyData.monthlyBreakdown.map(month => `
                <div class="overview-item">
                    <span>${month.month}:</span>
                    <span>€${month.income.toFixed(2)}</span>
                </div>
            `).join('')}
        `;
    }

    renderMonthlyReport() {
        const container = document.getElementById('monthlyReport');
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const monthlyData = {
            income: this.calculateMonthlyIncome(),
            paidPayments: this.payments.filter(p => p.paid && p.month === currentMonth && p.year === currentYear).length,
            pendingPayments: this.payments.filter(p => !p.paid && p.month === currentMonth && p.year === currentYear).length,
            newClients: this.clients.filter(c => {
                const clientDate = new Date(c.createdAt);
                return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear();
            }).length,
            activePrograms: this.programs.filter(p => p.active).length
        };

        container.innerHTML = `
            <div class="overview-item">
                <span>Incasso del Mese:</span>
                <span>€${monthlyData.income.toFixed(2)}</span>
            </div>
            <div class="overview-item">
                <span>Pagamenti Ricevuti:</span>
                <span>${monthlyData.paidPayments}</span>
            </div>
            <div class="overview-item">
                <span>Pagamenti in Sospeso:</span>
                <span>${monthlyData.pendingPayments}</span>
            </div>
            <div class="overview-item">
                <span>Nuovi Clienti:</span>
                <span>${monthlyData.newClients}</span>
            </div>
            <div class="overview-item">
                <span>Programmi Attivi:</span>
                <span>${monthlyData.activePrograms}</span>
            </div>
        `;
    }

    /* Calcoli */
    calculateYearlyIncome() {
        const currentYear = new Date().getFullYear();
        return this.payments
            .filter(p => p.paid && p.year === currentYear)
            .reduce((sum, p) => sum + p.amount, 0);
    }

    calculateMonthlyIncome() {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        return this.payments
            .filter(p => p.paid && p.month === currentMonth && p.year === currentYear)
            .reduce((sum, p) => sum + p.amount, 0);
    }

    /* Notifiche */
    checkNotifications() {
        const notifications = [];

        const expiredPrograms = this.programs.filter(p => {
            const daysLeft = Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            return p.active && daysLeft <= 7;
        });

        if (expiredPrograms.length > 0) {
            notifications.push({
                type: 'warning',
                message: `${expiredPrograms.length} programmi in scadenza entro 7 giorni`
            });
        }

        const overduePayments = this.payments.filter(p => !p.paid && new Date(p.dueDate) < new Date());
        if (overduePayments.length > 0) {
            notifications.push({
                type: 'warning',
                message: `${overduePayments.length} pagamenti in ritardo`
            });
        }

        const yearlyIncome = this.calculateYearlyIncome();
        if (yearlyIncome >= 4500) {
            notifications.push({
                type: 'warning',
                message: `Attenzione: incasso annuale €${yearlyIncome.toFixed(2)} - vicino al limite P.IVA`
            });
        }

        this.displayNotifications(notifications);
    }

    displayNotifications(notifications) {
        const container = document.getElementById('notifications');
        container.innerHTML = notifications.map(notification => `
            <div class="notification ${notification.type}">
                ${notification.message}
            </div>
        `).join('');

        if (notifications.length > 0) {
            setTimeout(() => {
                container.innerHTML = '';
            }, 10000);
        }
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3500);
    }

    /* Gestione dati */
    saveData() {
        localStorage.setItem('pt_clients', JSON.stringify(this.clients));
        localStorage.setItem('pt_payments', JSON.stringify(this.payments));
        localStorage.setItem('pt_programs', JSON.stringify(this.programs));
        localStorage.setItem('pt_checks', JSON.stringify(this.checks));
        this.updateCSVCache();
    }

    updateCSVCache() {
        const headers = ['id', 'name', 'email', 'phone', 'monthlyFee', 'startDate', 'active', 'createdAt', 'nextPaymentDate', 'nextPaymentStatus', 'outstandingBalance'];
        const rows = this.clients.map(client => {
            const summary = this.getClientFinancialSummary(client.id);
            return [
                client.id,
                client.name,
                client.email || '',
                client.phone || '',
                client.monthlyFee.toFixed(2),
                client.startDate,
                client.active,
                client.createdAt,
                summary.nextPayment ? summary.nextPayment.split(' (')[0] : '',
                summary.status,
                summary.outstandingBalance.toFixed(2)
            ];
        });

        this.csvCache = this.buildCSV([headers, ...rows]);
        localStorage.setItem('pt_clients_csv', this.csvCache);
    }

    exportData() {
        const csvData = this.csvCache || localStorage.getItem('pt_clients_csv') || '';
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pt_manager_clienti_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('CSV esportato con successo', 'success');
    }

    importData() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rows = this.parseCSV(e.target.result);
                let added = 0;
                let updated = 0;

                rows.forEach(row => {
                    if (!row.name) return;
                    const existing = this.clients.find(c => c.id === row.id || (row.email && c.email === row.email));
                    const clientPayload = {
                        name: row.name,
                        email: row.email || '',
                        phone: row.phone || '',
                        monthlyFee: parseFloat(row.monthlyFee || '0'),
                        startDate: row.startDate || new Date().toISOString().split('T')[0],
                        active: row.active ? row.active.toLowerCase() !== 'false' : true,
                        createdAt: row.createdAt || new Date().toISOString()
                    };

                    if (existing) {
                        Object.assign(existing, clientPayload);
                        this.ensurePaymentsForClient(existing);
                        updated++;
                    } else {
                        const newClient = { id: row.id || this.generateId(), ...clientPayload };
                        this.clients.push(newClient);
                        this.ensurePaymentsForClient(newClient);
                        added++;
                    }
                });

                this.saveData();
                this.refreshAll();
                this.showNotification(`Importazione completata: ${added} aggiunti, ${updated} aggiornati`, 'success');
            } catch (error) {
                console.error(error);
                this.showNotification('Errore nell\'importazione del CSV', 'warning');
            } finally {
                fileInput.value = '';
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    /* Utility CSV */
    parseCSV(text) {
        const [headerLine, ...lines] = text.trim().split(/\r?\n/);
        if (!headerLine) return [];
        const headers = headerLine.split(',').map(h => h.trim());

        return lines
            .filter(Boolean)
            .map(line => {
                const values = this.splitCSVLine(line);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                return row;
            });
    }

    splitCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    buildCSV(rows) {
        return rows.map(row => row.map(value => {
            if (value === null || value === undefined) return '';
            const needsQuotes = /[",\n]/.test(value);
            const escapedValue = String(value).replace(/"/g, '""');
            return needsQuotes ? `"${escapedValue}"` : escapedValue;
        }).join(',')).join('\n');
    }

    /* Utility varie */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('it-IT');
    }
}

let ptManager;

document.addEventListener('DOMContentLoaded', () => {
    ptManager = new PTManager();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
            console.warn('Service worker non registrato', err);
        });
    }
});

function openClientModal(clientId) {
    ptManager.ready.then(() => ptManager.openClientModal(clientId));
}

function closeClientModal() {
    ptManager.ready.then(() => ptManager.closeClientModal());
}

function openProgramModal(programId) {
    ptManager.ready.then(() => ptManager.openProgramModal(programId));
}

function closeProgramModal() {
    ptManager.ready.then(() => ptManager.closeProgramModal());
}

function recordPayment(clientId, paymentId) {
    ptManager.ready.then(() => ptManager.recordPayment(clientId, paymentId));
}

function undoPayment(paymentId) {
    ptManager.ready.then(() => ptManager.undoPayment(paymentId));
}

function deleteClient(clientId) {
    ptManager.ready.then(() => ptManager.deleteClient(clientId));
}

function toggleClientStatus(clientId) {
    ptManager.ready.then(() => ptManager.toggleClientStatus(clientId));
}

function addCheck(programId) {
    ptManager.ready.then(() => ptManager.addCheck(programId));
}

function completeCheck(checkId) {
    ptManager.ready.then(() => ptManager.completeCheck(checkId));
}

function deleteProgram(programId) {
    ptManager.ready.then(() => ptManager.deleteProgram(programId));
}

function exportData() {
    ptManager.ready.then(() => ptManager.exportData());
}

function importData() {
    ptManager.ready.then(() => ptManager.importData());
}
