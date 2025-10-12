// Personal Trainer Management System
class PTManager {
    constructor() {
        this.clients = JSON.parse(localStorage.getItem('pt_clients') || '[]');
        this.payments = JSON.parse(localStorage.getItem('pt_payments') || '[]');
        this.programs = JSON.parse(localStorage.getItem('pt_programs') || '[]');
        this.checks = JSON.parse(localStorage.getItem('pt_checks') || '[]');
        
        this.currentTab = 'dashboard';
        this.editingClient = null;
        this.editingProgram = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateDashboard();
        this.renderClients();
        this.renderPayments();
        this.renderPrograms();
        this.renderReports();
        this.checkNotifications();
        
        // Auto-save ogni 30 secondi
        setInterval(() => this.saveData(), 30000);
    }
    
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Forms
        document.getElementById('clientForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClient();
        });
        
        document.getElementById('programForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProgram();
        });
        
        // Payment filter
        document.getElementById('paymentFilter').addEventListener('change', (e) => {
            this.renderPayments(e.target.value);
        });
        
        // Modal close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    switchTab(tab) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab).classList.add('active');
        
        this.currentTab = tab;
        
        // Refresh content based on tab
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
    
    // Client Management
    openClientModal(clientId = null) {
        this.editingClient = clientId;
        const modal = document.getElementById('clientModal');
        const form = document.getElementById('clientForm');
        
        if (clientId) {
            const client = this.clients.find(c => c.id === clientId);
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
        const name = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        const phone = document.getElementById('clientPhone').value;
        const monthlyFee = parseFloat(document.getElementById('monthlyFee').value);
        const startDate = document.getElementById('startDate').value;
        
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
            this.clients[index] = { ...this.clients[index], ...clientData };
            this.showNotification('Cliente aggiornato con successo', 'success');
        } else {
            clientData.id = this.generateId();
            this.clients.push(clientData);
            this.showNotification('Nuovo cliente aggiunto con successo', 'success');
            
            // Crea automaticamente i pagamenti mensili per l'anno corrente
            this.createMonthlyPayments(clientData);
        }
        
        this.saveData();
        this.closeClientModal();
        this.renderClients();
        this.updateDashboard();
    }
    
    deleteClient(clientId) {
        if (confirm('Sei sicuro di voler eliminare questo cliente? Tutti i dati associati verranno rimossi.')) {
            this.clients = this.clients.filter(c => c.id !== clientId);
            this.payments = this.payments.filter(p => p.clientId !== clientId);
            this.programs = this.programs.filter(p => p.clientId !== clientId);
            this.checks = this.checks.filter(c => c.clientId !== clientId);
            
            this.saveData();
            this.renderClients();
            this.updateDashboard();
            this.showNotification('Cliente eliminato', 'success');
        }
    }
    
    toggleClientStatus(clientId) {
        const client = this.clients.find(c => c.id === clientId);
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
                    <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Nessun cliente presente</h3>
                    <p style="color: #666; margin-bottom: 20px;">Inizia aggiungendo il tuo primo cliente</p>
                    <button class="btn btn-primary" onclick="ptManager.openClientModal()">
                        <i class="fas fa-plus"></i> Aggiungi Cliente
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.clients.map(client => {
            const nextPayment = this.getNextPaymentDue(client.id);
            const activePrograms = this.programs.filter(p => p.clientId === client.id && p.active).length;
            
            return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-name">${client.name}</div>
                        <div class="client-status ${client.active ? 'status-active' : 'status-inactive'}">
                            ${client.active ? 'Attivo' : 'Inattivo'}
                        </div>
                    </div>
                    <div class="client-info">
                        <div><i class="fas fa-euro-sign"></i> €${client.monthlyFee}/mese</div>
                        ${client.email ? `<div><i class="fas fa-envelope"></i> ${client.email}</div>` : ''}
                        ${client.phone ? `<div><i class="fas fa-phone"></i> ${client.phone}</div>` : ''}
                        <div><i class="fas fa-calendar"></i> Dal ${this.formatDate(client.startDate)}</div>
                        <div><i class="fas fa-dumbbell"></i> ${activePrograms} programmi attivi</div>
                        ${nextPayment ? `<div class="${nextPayment.overdue ? 'text-danger' : nextPayment.due ? 'text-warning' : ''}">
                            <i class="fas fa-credit-card"></i> Prossimo pagamento: ${this.formatDate(nextPayment.dueDate)}
                        </div>` : ''}
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-primary btn-small" onclick="ptManager.openClientModal('${client.id}')">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn ${client.active ? 'btn-secondary' : 'btn-success'} btn-small" 
                                onclick="ptManager.toggleClientStatus('${client.id}')">
                            <i class="fas fa-${client.active ? 'pause' : 'play'}"></i> 
                            ${client.active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="ptManager.recordPayment('${client.id}')">
                            <i class="fas fa-money-bill"></i> Pagamento
                        </button>
                        <button class="btn btn-danger btn-small" onclick="ptManager.deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Payment Management
    createMonthlyPayments(client) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(client.startDate);
        
        for (let month = startDate.getMonth(); month < 12; month++) {
            const dueDate = new Date(currentYear, month + 1, 1); // Primo del mese successivo
            
            if (dueDate > new Date()) { // Solo pagamenti futuri
                this.payments.push({
                    id: this.generateId(),
                    clientId: client.id,
                    amount: client.monthlyFee,
                    dueDate: dueDate.toISOString().split('T')[0],
                    paid: false,
                    paidDate: null,
                    month: month + 1,
                    year: currentYear
                });
            }
        }
    }
    
    recordPayment(clientId, paymentId = null) {
        if (paymentId) {
            const payment = this.payments.find(p => p.id === paymentId);
            payment.paid = true;
            payment.paidDate = new Date().toISOString().split('T')[0];
        } else {
            // Trova il prossimo pagamento non pagato
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
    
    getNextPaymentDue(clientId) {
        const unpaidPayments = this.payments
            .filter(p => p.clientId === clientId && !p.paid)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (unpaidPayments.length === 0) return null;
        
        const nextPayment = unpaidPayments[0];
        const dueDate = new Date(nextPayment.dueDate);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        return {
            ...nextPayment,
            dueDate: nextPayment.dueDate,
            overdue: diffDays < 0,
            due: diffDays <= 7 && diffDays >= 0
        };
    }
    
    renderPayments(filter = 'all') {
        const container = document.getElementById('paymentsTable');
        let filteredPayments = this.payments;
        
        // Apply filter
        switch(filter) {
            case 'paid':
                filteredPayments = this.payments.filter(p => p.paid);
                break;
            case 'pending':
                filteredPayments = this.payments.filter(p => !p.paid && new Date(p.dueDate) >= new Date());
                break;
            case 'overdue':
                filteredPayments = this.payments.filter(p => !p.paid && new Date(p.dueDate) < new Date());
                break;
        }
        
        // Sort by due date
        filteredPayments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        
        if (filteredPayments.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <i class="fas fa-receipt" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Nessun pagamento trovato</h3>
                    <p style="color: #666;">I pagamenti verranno creati automaticamente quando aggiungi un cliente</p>
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
                                <td>€${payment.amount}</td>
                                <td>${this.formatDate(payment.dueDate)}</td>
                                <td>
                                    <span class="badge ${payment.paid ? 'badge-success' : isOverdue ? 'badge-danger' : isDue ? 'badge-warning' : 'badge-secondary'}">
                                        ${payment.paid ? 'Pagato' : isOverdue ? 'In Ritardo' : isDue ? 'In Scadenza' : 'In Sospeso'}
                                    </span>
                                </td>
                                <td>${payment.paidDate ? this.formatDate(payment.paidDate) : '-'}</td>
                                <td>
                                    ${!payment.paid ? `
                                        <button class="btn btn-success btn-small" onclick="ptManager.recordPayment('${payment.clientId}', '${payment.id}')">
                                            <i class="fas fa-check"></i> Segna Pagato
                                        </button>
                                    ` : `
                                        <button class="btn btn-secondary btn-small" onclick="ptManager.undoPayment('${payment.id}')">
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
    
    undoPayment(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        payment.paid = false;
        payment.paidDate = null;
        
        this.saveData();
        this.renderPayments();
        this.renderClients();
        this.updateDashboard();
        this.showNotification('Pagamento annullato', 'success');
    }
    
    // Program Management
    openProgramModal(programId = null) {
        this.editingProgram = programId;
        const modal = document.getElementById('programModal');
        const clientSelect = document.getElementById('programClient');
        
        // Populate client select
        clientSelect.innerHTML = this.clients
            .filter(c => c.active)
            .map(c => `<option value="${c.id}">${c.name}</option>`)
            .join('');
        
        if (programId) {
            const program = this.programs.find(p => p.id === programId);
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
        const name = document.getElementById('programName').value;
        const weeks = parseInt(document.getElementById('programWeeks').value);
        const startDate = document.getElementById('programStart').value;
        
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
        if (confirm('Sei sicuro di voler eliminare questo programma?')) {
            this.programs = this.programs.filter(p => p.id !== programId);
            this.checks = this.checks.filter(c => c.programId !== programId);
            
            this.saveData();
            this.renderPrograms();
            this.updateDashboard();
            this.showNotification('Programma eliminato', 'success');
        }
    }
    
    renderPrograms() {
        const grid = document.getElementById('programsGrid');
        
        if (this.programs.length === 0) {
            grid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Nessun programma presente</h3>
                    <p style="color: #666; margin-bottom: 20px;">Crea il primo programma di allenamento</p>
                    <button class="btn btn-primary" onclick="ptManager.openProgramModal()">
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
                ((new Date() - new Date(program.startDate)) / (new Date(program.endDate) - new Date(program.startDate))) * 100
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
                        <div style="margin-top: 10px;">
                            <div style="background: #eee; border-radius: 10px; height: 8px; overflow: hidden;">
                                <div style="background: linear-gradient(135deg, #667eea, #764ba2); height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
                            </div>
                            <small style="color: #666;">${Math.round(progress)}% completato</small>
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-primary btn-small" onclick="ptManager.openProgramModal('${program.id}')">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="ptManager.addCheck('${program.id}')">
                            <i class="fas fa-check-square"></i> Controllo
                        </button>
                        <button class="btn btn-danger btn-small" onclick="ptManager.deleteProgram('${program.id}')">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Check Management
    addCheck(programId) {
        const checkType = prompt('Tipo di controllo (es: Peso, Misure, Foto, Feedback):');
        if (!checkType) return;
        
        const program = this.programs.find(p => p.id === programId);
        
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
    
    // Dashboard
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
        
        // Warning per limite P.IVA
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
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Nessuna scadenza imminente</div>';
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
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Tutti i pagamenti sono in regola</div>';
            return;
        }
        
        container.innerHTML = pendingPayments.map(payment => {
            const client = this.clients.find(c => c.id === payment.clientId);
            const urgentClass = payment.daysOverdue > 0 ? 'urgent' : payment.daysOverdue >= -7 ? 'warning' : '';
            
            return `
                <div class="list-item ${urgentClass}">
                    <div>
                        <strong>€${payment.amount}</strong><br>
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
            container.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Nessun controllo in sospeso</div>';
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
                        <button class="btn btn-success btn-small" onclick="ptManager.completeCheck('${check.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    completeCheck(checkId) {
        const check = this.checks.find(c => c.id === checkId);
        check.completed = true;
        check.completedDate = new Date().toISOString().split('T')[0];
        
        this.saveData();
        this.updateDashboard();
        this.showNotification('Controllo completato', 'success');
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
    
    // Reports
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
        
        // Breakdown mensile
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
            <hr style="margin: 15px 0;">
            <h4>Breakdown Mensile</h4>
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
    
    // Calculations
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
    
    // Notifications
    checkNotifications() {
        const notifications = [];
        
        // Controllo scadenze programmi
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
        
        // Controllo pagamenti in ritardo
        const overduePayments = this.payments.filter(p => {
            return !p.paid && new Date(p.dueDate) < new Date();
        });
        
        if (overduePayments.length > 0) {
            notifications.push({
                type: 'warning',
                message: `${overduePayments.length} pagamenti in ritardo`
            });
        }
        
        // Controllo limite P.IVA
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
        
        // Auto-hide dopo 10 secondi
        setTimeout(() => {
            container.innerHTML = '';
        }, 10000);
    }
    
    showNotification(message, type = 'success') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Data Management
    saveData() {
        localStorage.setItem('pt_clients', JSON.stringify(this.clients));
        localStorage.setItem('pt_payments', JSON.stringify(this.payments));
        localStorage.setItem('pt_programs', JSON.stringify(this.programs));
        localStorage.setItem('pt_checks', JSON.stringify(this.checks));
    }
    
    exportData() {
        const data = {
            clients: this.clients,
            payments: this.payments,
            programs: this.programs,
            checks: this.checks,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pt_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Dati esportati con successo', 'success');
    }
    
    importData() {
        const file = document.getElementById('importFile').files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('Importare i dati? Questo sostituirà tutti i dati esistenti.')) {
                    this.clients = data.clients || [];
                    this.payments = data.payments || [];
                    this.programs = data.programs || [];
                    this.checks = data.checks || [];
                    
                    this.saveData();
                    this.init();
                    this.showNotification('Dati importati con successo', 'success');
                }
            } catch (error) {
                this.showNotification('Errore nell\'importazione dei dati', 'warning');
            }
        };
        reader.readAsText(file);
    }
    
    // Utilities
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT');
    }
}

// Initialize the application
let ptManager;

document.addEventListener('DOMContentLoaded', () => {
    ptManager = new PTManager();
});

// Global functions for onclick handlers
function openClientModal(clientId) {
    ptManager.openClientModal(clientId);
}

function closeClientModal() {
    ptManager.closeClientModal();
}

function openProgramModal(programId) {
    ptManager.openProgramModal(programId);
}

function closeProgramModal() {
    ptManager.closeProgramModal();
}

function exportData() {
    ptManager.exportData();
}

function importData() {
    ptManager.importData();
}