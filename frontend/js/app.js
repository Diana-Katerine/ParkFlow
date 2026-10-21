        // =========================================================================
    // Sistema de Autenticación y Control de Sesión
    // =========================================================================
    const REGISTERED_ACCOUNTS = [
        {
            email: 'admin@parkpulse.co',
            password: 'admin',
            nombre: 'Alejandro Vargas',
            rol: 'Administrador',
            placa: null
        },
        {
            email: 'operador@parkpulse.co',
            password: 'oper',
            nombre: 'Camila Mendoza',
            rol: 'Operador',
            placa: null
        },
        {
            email: 'cliente@parkpulse.co',
            password: 'cliente',
            nombre: 'Diana K. Pérez',
            rol: 'Cliente',
            placa: 'KLM-456'
        }
    ];

    let currentAuthSession = null;

    function checkAuthSession() {
        try {
            const saved = localStorage.getItem('parkflow_auth_session');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.email && parsed.rol) {
                    currentAuthSession = parsed;
                    saasState.currentRole = parsed.rol;
                    hideAuthScreen();
                    applyRbacToUI();
                    const config = RBAC_RULES[parsed.rol] || RBAC_RULES['Administrador'];
                    switchSaasView(config.defaultView);
                    return true;
                }
            }
        } catch (e) {
            console.error('Error reading auth session:', e);
        }

        // Si no hay sesión válida: BLOQUEAR ACCESO Y MOSTRAR LOGIN
        showAuthScreen();
        return false;
    }

    function showAuthScreen() {
        const overlay = document.getElementById('saasAuthScreen');
        if (overlay) overlay.style.display = 'flex';
        const err = document.getElementById('authErrorMsg');
        if (err) err.style.display = 'none';
    }

    function hideAuthScreen() {
        const overlay = document.getElementById('saasAuthScreen');
        if (overlay) overlay.style.display = 'none';
    }

    function handleAuthSubmit(event) {
        if (event) event.preventDefault();
        const emailInput = document.getElementById('authInputEmail');
        const passInput = document.getElementById('authInputPassword');
        const roleSelect = document.getElementById('authInputRole');

        const email = emailInput ? emailInput.value.trim() : 'usuario@parkflow.com';
        const pass = passInput ? passInput.value.trim() : '123';
        const chosenRole = roleSelect ? roleSelect.value : 'Administrador';

        // 1. Si coincide con una cuenta demo predefinida:
        const match = REGISTERED_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
        if (match) {
            loginUserSuccess(match);
            return;
        }

        // 2. Si es CUALQUIER otro correo o contraseña (no necesitan ser reales):
        // Obtenemos un nombre amigable a partir del correo
        const namePart = email.includes('@') ? email.split('@')[0] : email;
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        const customUser = {
            email: email || 'usuario@parkflow.com',
            password: pass || '123456',
            nombre: formattedName,
            rol: chosenRole,
            placa: (chosenRole === 'Cliente') ? 'KLM-456' : null
        };

        loginUserSuccess(customUser);
    }

    function quickLogin(roleOrEmail) {
        let account = null;
        if (roleOrEmail === 'Administrador' || roleOrEmail.includes('admin')) {
            account = {
                email: 'admin@parkpulse.co',
                password: 'admin',
                nombre: 'Alejandro Vargas (Admin)',
                rol: 'Administrador',
                placa: null
            };
        } else if (roleOrEmail === 'Operador' || roleOrEmail.includes('operador')) {
            account = {
                email: 'operador@parkpulse.co',
                password: 'oper',
                nombre: 'Camila Mendoza (Operador)',
                rol: 'Operador',
                placa: null
            };
        } else if (roleOrEmail === 'Cliente' || roleOrEmail.includes('cliente')) {
            account = {
                email: 'cliente@parkpulse.co',
                password: 'cliente',
                nombre: 'Diana K. Pérez (Cliente)',
                rol: 'Cliente',
                placa: 'KLM-456'
            };
        } else {
            account = {
                email: roleOrEmail || 'usuario@parkflow.com',
                password: '123',
                nombre: 'Usuario ParkFlow',
                rol: 'Administrador'
            };
        }
        loginUserSuccess(account);
    }

    function loginUserSuccess(account) {
        currentAuthSession = account;
        saasState.currentRole = account.rol;
        try {
            localStorage.setItem('parkflow_auth_session', JSON.stringify(account));
        } catch (e) {}

        hideAuthScreen();
        applyRbacToUI();

        // Si es cliente, pre-cargar placa en el portal
        if (account.rol === 'Cliente') {
            const plateInput = document.getElementById('saasClientPlateSearch');
            if (plateInput) plateInput.value = account.placa || 'KLM-456';
        }

        const config = RBAC_RULES[account.rol] || RBAC_RULES['Administrador'];
        switchSaasView(config.defaultView);

        // Actualizar selector de rol del sidebar
        const selector = document.getElementById('saasRoleSelector');
        if (selector) selector.value = account.rol;

        showRbacToast(`¡Bienvenido/a <strong>${account.nombre}</strong>! Has ingresado con rol <strong>${account.rol}</strong>.`, false);
    }

    function handleLogout() {
        if (!confirm('¿Estás seguro/a de que deseas cerrar sesión?')) return;
        currentAuthSession = null;
        try {
            localStorage.removeItem('parkflow_auth_session');
        } catch (e) {}

        const emailInput = document.getElementById('authInputEmail');
        const passInput = document.getElementById('authInputPassword');
        if (emailInput) emailInput.value = '';
        if (passInput) passInput.value = '';

        showAuthScreen();
        showRbacToast('Sesión cerrada. Acceso al sistema bloqueado.', true);
    }

    // Exponer funciones globales al objeto window para llamadas inline
    window.quickLogin = quickLogin;
    window.handleAuthSubmit = handleAuthSubmit;
    window.handleLogout = handleLogout;
    window.loginUserSuccess = loginUserSuccess;
    window.checkAuthSession = checkAuthSession;
    window.hideAuthScreen = hideAuthScreen;
    window.showAuthScreen = showAuthScreen;

    const API_BASE = (window.location.protocol === 'file:')
        ? 'http://localhost/parkflow/api'
        : (window.location.pathname.includes('/parkflow/') ? '/parkflow/api' : 'api');
    let saasState = {
        spots: [],
        tickets: [],
        rates: [],
        users: [],
        audit: [],
        currentRole: 'Administrador',
        pendingCheckOutTicket: null,
        adminPeriodFilter: 'today',
        adminMovementFilter: 'ALL',
        currentStateSpot: 'LIBRE'
    };

    // Matriz de Permisos RBAC (Role-Based Access Control)
    const RBAC_RULES = {
        'Administrador': {
            name: 'Diana Katerine (Admin)',
            avatar: 'A',
            badge: 'Super Administrador',
            badgeClass: 'pill-emerald',
            defaultView: 'view-overview',
            allowedViews: [
                'view-overview',
                'view-operations',
                'view-matrix',
                'view-rates',
                'view-users',
                'view-audit',
                'view-client-portal',
                'view-patterns'
            ],
            canCheckIn: true,
            canCheckOut: true,
            canEditRates: true,
            canManageUsers: true,
            canViewAudit: true,
            canResetDb: true
        },
        'Operador': {
            name: 'Carlos Mendoza (Operador)',
            avatar: 'O',
            badge: 'Operador de Patio',
            badgeClass: 'pill-primary',
            defaultView: 'view-operations',
            allowedViews: [
                'view-overview',
                'view-operations',
                'view-matrix',
                'view-client-portal',
                'view-patterns'
            ],
            canCheckIn: true,
            canCheckOut: true,
            canEditRates: false,
            canManageUsers: false,
            canViewAudit: false,
            canResetDb: false
        },
        'Cliente': {
            name: 'Conductor Ciudadano',
            avatar: 'C',
            badge: 'Cliente / Autoservicio',
            badgeClass: 'pill-primary',
            defaultView: 'view-client-portal',
            allowedViews: [
                'view-client-portal',
                'view-matrix',
                'view-patterns'
            ],
            canCheckIn: true,
            canCheckOut: false,
            canEditRates: false,
            canManageUsers: false,
            canViewAudit: false,
            canResetDb: false
        }
    };

    const MODULE_NAMES = {
        'view-overview': { name: 'Dashboard General', minRole: 'Operador' },
        'view-operations': { name: 'Flujo & Estancias', minRole: 'Operador' },
        'view-matrix': { name: 'Telemetría de Bahías', minRole: 'Operador' },
        'view-rates': { name: 'Matriz Tarifaria', minRole: 'Administrador' },
        'view-users': { name: 'Cuentas & RBAC', minRole: 'Administrador' },
        'view-audit': { name: 'Seguridad & Logs', minRole: 'Administrador' },
        'view-client-portal': { name: 'Portal Ciudadano', minRole: 'Cliente' },
        'view-patterns': { name: 'Patrones & Dominios DDD', minRole: 'Cliente' }
    };

    function showRbacToast(msg, isBlocked = true) {
        const existing = document.getElementById('activeRbacToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'activeRbacToast';
        toast.className = 'rbac-toast';
        toast.innerHTML = `
            <span style="font-size:1.4rem;">${isBlocked ? '⛔' : '🛡️'}</span>
            <div style="flex:1;">
                <div style="font-weight:700; color:${isBlocked ? 'var(--rose)' : 'var(--emerald)'}; font-size:0.85rem;">
                    ${isBlocked ? 'Acceso Restringido por Permiso RBAC' : 'Privilegios Actualizados'}
                </div>
                <div style="font-size:0.78rem; color:var(--text-body); margin-top:2px;">
                    ${msg}
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem;">✕</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
    }

    function returnToAuthorizedView() {
        const roleConfig = RBAC_RULES[saasState.currentRole] || RBAC_RULES['Administrador'];
        switchSaasView(roleConfig.defaultView);
    }

    function applyRbacToUI() {
        const role = saasState.currentRole || 'Administrador';
        const config = RBAC_RULES[role] || RBAC_RULES['Administrador'];

        // 1. Sidebar profile
        const avatar = document.getElementById('sidebarAvatar');
        const userName = document.getElementById('sidebarUserName');
        if (avatar) avatar.textContent = config.avatar;
        if (userName) userName.textContent = config.name;

        // 2. Navigation items
        document.querySelectorAll('.nav-item-btn').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            let targetView = null;
            for (const viewId of Object.keys(MODULE_NAMES)) {
                if (onclickAttr.includes(viewId)) {
                    targetView = viewId;
                    break;
                }
            }

            if (!targetView) return;

            const isAllowed = config.allowedViews.includes(targetView);
            const lockBadge = btn.querySelector('.pill-locked');
            const normalBadge = btn.querySelector('.nav-pill-badge:not(.pill-locked)');

            if (isAllowed) {
                btn.classList.remove('restricted');
                btn.removeAttribute('title');
                if (lockBadge) lockBadge.remove();
                if (normalBadge) normalBadge.style.display = 'inline-block';
            } else {
                btn.classList.add('restricted');
                btn.setAttribute('title', `Acceso restringido para rol ${role}. Requiere: ${MODULE_NAMES[targetView].minRole}`);
                if (normalBadge) normalBadge.style.display = 'none';
                if (!lockBadge) {
                    const badge = document.createElement('span');
                    badge.className = 'nav-pill-badge pill-locked';
                    badge.textContent = '🔒 Bloqueado';
                    btn.appendChild(badge);
                }
            }
        });

        // 3. Topbar "Registrar Entrada" button
        const topbarCheckInBtn = document.querySelector('.saas-topbar .btn-primary');
        if (topbarCheckInBtn) {
            topbarCheckInBtn.style.display = config.canCheckIn ? 'inline-flex' : 'none';
            topbarCheckInBtn.innerHTML = (role === 'Cliente') 
                ? '<span>🚗</span> Registrar mi Vehículo' 
                : '<span>+</span> Registrar Entrada';
        }

        // Si es cliente, filtrar bahías para su formulario de registro
        if (role === 'Cliente') {
            filterAvailableBaysForClientSelf();
        }

        // 4. Rate creation button
        const addRateBtn = document.querySelector('#view-rates .btn-primary');
        if (addRateBtn) {
            addRateBtn.style.display = config.canEditRates ? 'inline-flex' : 'none';
        }

        // 5. Global Search in Topbar
        const globalSearch = document.getElementById('globalSearchInput');
        if (globalSearch) {
            globalSearch.disabled = (role === 'Cliente');
            globalSearch.placeholder = (role === 'Cliente') 
                ? 'Búsqueda disponible en Portal Cliente...' 
                : 'Buscar placa, ticket o bahía...';
        }
    }

    // Control de Vistas / Pestañas SaaS
    function switchSaasView(viewId, btnElement) {
        const role = saasState.currentRole || 'Administrador';
        const config = RBAC_RULES[role] || RBAC_RULES['Administrador'];

        // Enforce RBAC
        if (!config.allowedViews.includes(viewId)) {
            const modInfo = MODULE_NAMES[viewId] || { name: 'Módulo Administrativo', minRole: 'Administrador' };
            showRbacToast(`El rol <strong>${role}</strong> no tiene autorización para acceder a <strong>${modInfo.name}</strong>. Se requiere rol <strong>${modInfo.minRole}</strong>.`);
            
            // Show Forbidden Panel
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item-btn').forEach(b => b.classList.remove('active'));

            const forbidden = document.getElementById('view-forbidden');
            if (forbidden) {
                forbidden.classList.add('active');
                const reason = document.getElementById('forbiddenReasonText');
                if (reason) {
                    reason.innerHTML = `Tu perfil actual está configurado como <strong>${role}</strong>. El módulo <strong>${modInfo.name}</strong> contiene funciones y datos protegidos restringidos exclusivamente para <strong>${modInfo.minRole}</strong>.`;
                }
            }
            document.getElementById('currentViewBreadcrumb').textContent = 'Acceso Denegado ⛔';
            return;
        }

        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item-btn').forEach(b => b.classList.remove('active'));

        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        if (btnElement) {
            btnElement.classList.add('active');
        } else {
            document.querySelectorAll('.nav-item-btn').forEach(b => {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(viewId)) {
                    b.classList.add('active');
                }
            });
        }

        // Update breadcrumb
        const breadcrumbNames = {
            'view-overview': 'Dashboard General',
            'view-operations': 'Flujo & Estancias',
            'view-matrix': 'Telemetría de Bahías',
            'view-rates': 'Matriz Tarifaria',
            'view-users': 'Cuentas & RBAC',
            'view-audit': 'Seguridad & Logs',
            'view-client-portal': 'Portal Ciudadano',
            'view-patterns': 'Patrones & Dominios DDD'
        };
        document.getElementById('currentViewBreadcrumb').textContent = breadcrumbNames[viewId] || 'Dashboard';
    }

    function toggleMobileSidebar() {
        document.getElementById('saasSidebar').classList.toggle('mobile-open');
    }

    // Modales
    function openSaasModal(id) {
        document.getElementById(id).classList.add('open');
        if (id === 'modalCheckIn') filterAvailableBaysForCheckIn();
    }
    function closeSaasModal(id) {
        document.getElementById(id).classList.remove('open');
    }

    // Cambio de Rol RBAC
    function handleRoleChange(role) {
        saasState.currentRole = role;
        applyRbacToUI();

        const config = RBAC_RULES[role] || RBAC_RULES['Administrador'];
        switchSaasView(config.defaultView);
        showRbacToast(`Sesión cambiada a: <strong>${role}</strong> (${config.badge}). Permisos ajustados.`, false);
    }

    // 1. Sincronización completa con MySQL vía API PHP
    async function syncAllFromDatabase() {
        try {
            // Healthcheck
            const statusRes = await fetch(`${API_BASE}/status.php`);
            const statusJson = await statusRes.json();
            const badge = document.getElementById('saasDbBadge');
            const badgeText = document.getElementById('saasDbStatusText');

            if (statusJson.success && statusJson.data.connected) {
                badge.className = 'heartbeat-badge hb-connected';
                badgeText.textContent = `XAMPP MySQL: ${statusJson.data.port || 3306}`;
            } else {
                badge.className = 'heartbeat-badge hb-disconnected';
                badgeText.textContent = 'MySQL Desconectado';
            }

            // Datos de entidades en paralelo
            const [spotsRes, ratesRes, ticketsRes, usersRes, auditRes] = await Promise.all([
                fetch(`${API_BASE}/spots.php`).then(r => r.json()),
                fetch(`${API_BASE}/rates.php`).then(r => r.json()),
                fetch(`${API_BASE}/tickets.php`).then(r => r.json()),
                fetch(`${API_BASE}/users.php`).then(r => r.json()),
                fetch(`${API_BASE}/audit.php`).then(r => r.json())
            ]);

            if (spotsRes.success) saasState.spots = spotsRes.data;
            if (ratesRes.success) saasState.rates = ratesRes.data;
            if (ticketsRes.success) saasState.tickets = ticketsRes.data;
            if (usersRes.success) saasState.users = usersRes.data;
            if (auditRes.success) saasState.audit = auditRes.data;

            renderSaasInterface();
        } catch (err) {
            console.error('Error sincronizando con API de PHP:', err);
        }
    }

    function renderSaasInterface() {
        renderKpis();
        renderOverviewTable();
        renderAdminMovements();
        renderOperationsTable();
        renderBayMatrix();
        renderClientCategorizedMap();
        renderClientReservations();
        filterAvailableBaysForReservation();
        renderRatesTable();
        renderUsersTable();
        renderAuditTable();
        renderCompletedTable();
        updateDddCapacityMetrics();
    }

    // Helper seguro para interpretar fechas en formato SQL (YYYY-MM-DD HH:mm:ss) o ISO
    function parseDateToTimestamp(dateVal) {
        if (!dateVal) return 0;
        if (dateVal instanceof Date) return dateVal.getTime();
        const str = String(dateVal).trim();
        const isoStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
        const ts = new Date(isoStr).getTime();
        return isNaN(ts) ? new Date(str).getTime() : ts;
    }

    // Filtro de Período para el Administrador
    function setAdminPeriodFilter(period) {
        saasState.adminPeriodFilter = period;
        ['btnAdminPeriodToday', 'btnAdminPeriodWeek', 'btnAdminPeriodMonth', 'btnAdminPeriodAll'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = 'btn btn-secondary btn-sm';
        });

        const activeId = {
            'today': 'btnAdminPeriodToday',
            'week': 'btnAdminPeriodWeek',
            'month': 'btnAdminPeriodMonth',
            'all': 'btnAdminPeriodAll'
        }[period] || 'btnAdminPeriodToday';

        const activeBtn = document.getElementById(activeId);
        if (activeBtn) activeBtn.className = 'btn btn-primary btn-sm';

        renderKpis();
        renderAdminMovements();
    }

    // Renderizar KPIs Financieros y Operativos del Administrador
    function renderKpis() {
        const total = saasState.spots.length;
        const occupied = saasState.spots.filter(s => s.estado === 'OCUPADO').length;
        const free = Math.max(0, total - occupied);
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

        // Filtrado por Período
        const period = saasState.adminPeriodFilter || 'today';
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);

        const allCompleted = saasState.tickets.filter(t => t.estado === 'FINALIZADO');
        let periodTickets = allCompleted.filter(t => {
            if (period === 'all') return true;
            const exitTime = parseDateToTimestamp(t.fechaSalida || t.fechaIngreso);
            if (period === 'today') return exitTime >= startOfToday;
            if (period === 'week') return exitTime >= sevenDaysAgo;
            if (period === 'month') return exitTime >= thirtyDaysAgo;
            return true;
        });

        const periodLabelMap = {
            'today': `Ingresos de hoy (${periodTickets.length} cobros)`,
            'week': `Últimos 7 días (${periodTickets.length} cobros)`,
            'month': `Últimos 30 días (${periodTickets.length} cobros)`,
            'all': `Todo el historial (${periodTickets.length} cobros)`
        };
        const periodLabelEl = document.getElementById('kpiPeriodLabel');
        if (periodLabelEl) periodLabelEl.textContent = periodLabelMap[period] || 'Ingresos del período';

        // Recaudación y Ticket Promedio
        const revenue = periodTickets.reduce((sum, t) => sum + (parseFloat(t.valorPagado) || 0), 0);
        const avgTicket = periodTickets.length > 0 ? Math.round(revenue / periodTickets.length) : 0;

        const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
        if (kpiTotalRevenue) kpiTotalRevenue.textContent = `$${revenue.toLocaleString('es-CO')} COP`;

        const kpiAvgTicket = document.getElementById('kpiAvgTicket');
        if (kpiAvgTicket) kpiAvgTicket.textContent = `$${avgTicket.toLocaleString('es-CO')} COP`;

        // Métricas de Ocupación
        const kpiOccupancyPct = document.getElementById('kpiOccupancyPct');
        if (kpiOccupancyPct) kpiOccupancyPct.textContent = `${pct}%`;

        const kpiOccupiedSpotsText = document.getElementById('kpiOccupiedSpotsText');
        if (kpiOccupiedSpotsText) kpiOccupiedSpotsText.textContent = `${occupied} ocupados`;

        const kpiFreeSpotsText = document.getElementById('kpiFreeSpotsText');
        if (kpiFreeSpotsText) kpiFreeSpotsText.textContent = `${free} disponibles`;

        const kpiOccupancyBar = document.getElementById('kpiOccupancyBar');
        if (kpiOccupancyBar) kpiOccupancyBar.style.width = `${pct}%`;

        // Estancias Activas y Nocturnos
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO');
        const midnightCount = active.filter(t => t.cruzoMedianoche).length;

        const kpiActiveVehicles = document.getElementById('kpiActiveVehicles');
        if (kpiActiveVehicles) kpiActiveVehicles.textContent = active.length;

        const kpiMidnightCount = document.getElementById('kpiMidnightCount');
        if (kpiMidnightCount) kpiMidnightCount.textContent = `${midnightCount} nocturnos`;

        const sidebarActiveBadge = document.getElementById('sidebarActiveStaysBadge');
        if (sidebarActiveBadge) sidebarActiveBadge.textContent = active.length;

        // Desglose de Dinero por Método de Pago
        let cashTotal = 0, cashCount = 0;
        let cardTotal = 0, cardCount = 0;
        let qrTotal = 0, qrCount = 0;

        periodTickets.forEach(t => {
            const val = parseFloat(t.valorPagado) || 0;
            const method = (t.metodoPago || '').toUpperCase();
            if (method.includes('TARJETA') || method.includes('CARD') || method.includes('DATAFONO')) {
                cardTotal += val;
                cardCount++;
            } else if (method.includes('QR') || method.includes('NEQUI') || method.includes('DAVIPLATA') || method.includes('TRANSFERENCIA')) {
                qrTotal += val;
                qrCount++;
            } else {
                cashTotal += val;
                cashCount++;
            }
        });

        const paySum = revenue || (cashTotal + cardTotal + qrTotal) || 1;
        const cashPct = Math.round((cashTotal / paySum) * 100);
        const cardPct = Math.round((cardTotal / paySum) * 100);
        const qrPct = Math.max(0, 100 - cashPct - cardPct);

        const paymentSummaryTotal = document.getElementById('paymentSummaryTotal');
        if (paymentSummaryTotal) paymentSummaryTotal.textContent = `$${revenue.toLocaleString('es-CO')} COP`;

        const elPayCashTotal = document.getElementById('payCashTotal');
        if (elPayCashTotal) elPayCashTotal.textContent = `$${cashTotal.toLocaleString('es-CO')}`;
        const elPayCashCount = document.getElementById('payCashCount');
        if (elPayCashCount) elPayCashCount.textContent = `${cashCount} transacciones`;
        const elPayCashPct = document.getElementById('payCashPct');
        if (elPayCashPct) elPayCashPct.textContent = `${cashPct}%`;

        const elPayCardTotal = document.getElementById('payCardTotal');
        if (elPayCardTotal) elPayCardTotal.textContent = `$${cardTotal.toLocaleString('es-CO')}`;
        const elPayCardCount = document.getElementById('payCardCount');
        if (elPayCardCount) elPayCardCount.textContent = `${cardCount} transacciones`;
        const elPayCardPct = document.getElementById('payCardPct');
        if (elPayCardPct) elPayCardPct.textContent = `${cardPct}%`;

        const elPayQrTotal = document.getElementById('payQrTotal');
        if (elPayQrTotal) elPayQrTotal.textContent = `$${qrTotal.toLocaleString('es-CO')}`;
        const elPayQrCount = document.getElementById('payQrCount');
        if (elPayQrCount) elPayQrCount.textContent = `${qrCount} transacciones`;
        const elPayQrPct = document.getElementById('payQrPct');
        if (elPayQrPct) elPayQrPct.textContent = `${qrPct}%`;

        // Invocar renderizado de gráficas y movimientos en tiempo real
        renderAdminCharts(periodTickets);
        renderAdminMovements();
    }

    // Renderizar Gráficas Dinámicas de Flujo e Ingresos
    function renderAdminCharts(periodTickets) {
        // 1. Gráfica de Donut: Distribución de Flota y Recaudo por Categoría
        const allTickets = saasState.tickets || [];
        const allSpots = saasState.spots || [];

        let countAuto = 0, countMoto = 0, countBici = 0, countSuv = 0, countEv = 0;

        allTickets.forEach(t => {
            const cat = (t.tipoVehiculo || '').toLowerCase();
            if (cat.includes('auto')) countAuto++;
            else if (cat.includes('moto')) countMoto++;
            else if (cat.includes('bici')) countBici++;
            else if (cat.includes('camioneta') || cat.includes('suv')) countSuv++;
            else if (cat.includes('eléctrico') || cat.includes('ev')) countEv++;
            else countAuto++;
        });

        if (countAuto + countMoto + countBici + countSuv + countEv === 0) {
            allSpots.forEach(s => {
                const tipo = (s.tipoPermitido || '').toLowerCase();
                if (tipo.includes('auto')) countAuto++;
                else if (tipo.includes('moto')) countMoto++;
                else if (tipo.includes('bici')) countBici++;
                else if (tipo.includes('camioneta') || tipo.includes('suv')) countSuv++;
                else if (tipo.includes('eléctrico') || tipo.includes('ev')) countEv++;
            });
        }

        const totalFlota = Math.max(1, countAuto + countMoto + countBici + countSuv + countEv);
        const pAuto = Math.round((countAuto / totalFlota) * 100);
        const pMoto = Math.round((countMoto / totalFlota) * 100);
        const pBici = Math.round((countBici / totalFlota) * 100);
        const pSuv = Math.round((countSuv / totalFlota) * 100);
        const pEv = Math.max(0, 100 - (pAuto + pMoto + pBici + pSuv));

        const distAuto = document.getElementById('distAutoCount');
        if (distAuto) distAuto.textContent = `${pAuto}% (${countAuto})`;
        const distMoto = document.getElementById('distMotoCount');
        if (distMoto) distMoto.textContent = `${pMoto}% (${countMoto})`;
        const distBici = document.getElementById('distBiciCount');
        if (distBici) distBici.textContent = `${pBici}% (${countBici})`;
        const distSuv = document.getElementById('distSuvCount');
        if (distSuv) distSuv.textContent = `${pSuv}% (${countSuv})`;
        const distEv = document.getElementById('distEvCount');
        if (distEv) distEv.textContent = `${pEv}% (${countEv})`;

        // Ajustar arcos SVG del donut (Circunferencia: 2 * PI * 38 ≈ 238.76)
        const C = 238.76;
        const lenAuto = (pAuto / 100) * C;
        const lenMoto = (pMoto / 100) * C;
        const lenBici = (pBici / 100) * C;
        const lenSuv = (pSuv / 100) * C;
        const lenEv = (pEv / 100) * C;

        const donutSvg = document.getElementById('adminFleetDonutSvg');
        if (donutSvg) {
            const circles = donutSvg.querySelectorAll('circle');
            if (circles.length >= 6) {
                circles[1].setAttribute('stroke-dasharray', `${lenAuto} ${C}`);
                circles[1].setAttribute('stroke-dashoffset', '0');
                circles[2].setAttribute('stroke-dasharray', `${lenMoto} ${C}`);
                circles[2].setAttribute('stroke-dashoffset', `-${lenAuto}`);
                circles[3].setAttribute('stroke-dasharray', `${lenBici} ${C}`);
                circles[3].setAttribute('stroke-dashoffset', `-${lenAuto + lenMoto}`);
                circles[4].setAttribute('stroke-dasharray', `${lenSuv} ${C}`);
                circles[4].setAttribute('stroke-dashoffset', `-${lenAuto + lenMoto + lenBici}`);
                circles[5].setAttribute('stroke-dasharray', `${lenEv} ${C}`);
                circles[5].setAttribute('stroke-dashoffset', `-${lenAuto + lenMoto + lenBici + lenSuv}`);
            }
        }

        // 2. Curva SVG Dinámica de Recaudación y Flujo por Horas
        const dynamicArea = document.getElementById('svgDynamicArea');
        const dynamicLine = document.getElementById('svgDynamicLine');
        if (dynamicArea && dynamicLine) {
            const actCount = (saasState.tickets.filter(t => t.estado === 'ACTIVO') || []).length;
            const revFactor = Math.min(60, periodTickets.length * 5 + actCount * 3);
            const y1 = Math.max(30, 160 - revFactor - 20);
            const y2 = Math.max(25, 90 - revFactor);
            const y3 = Math.max(35, 60 - Math.round(revFactor * 0.5));
            const y4 = Math.max(40, 110 - revFactor);
            const y5 = Math.max(20, 40 - Math.round(revFactor * 0.7));

            const linePath = `M 0,160 Q 70,${y1} 140,${y2} T 280,${y3} T 420,${y4} T 560,${y5} T 700,80`;
            const areaPath = `M 0,160 Q 70,${y1} 140,${y2} T 280,${y3} T 420,${y4} T 560,${y5} T 700,80 L 700,170 L 0,170 Z`;

            dynamicLine.setAttribute('d', linePath);
            dynamicArea.setAttribute('d', areaPath);
        }
    }

    // Filtrar y Renderizar Movimientos del Parqueadero en Tiempo Real
    function filterAdminMovements(filterVal) {
        saasState.adminMovementFilter = filterVal || 'ALL';
        renderAdminMovements();
    }

    function renderAdminMovements() {
        const tbody = document.getElementById('adminMovementsTableBody');
        if (!tbody) return;

        const filter = saasState.adminMovementFilter || 'ALL';
        const period = saasState.adminPeriodFilter || 'today';
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);

        const periodNames = {
            'today': 'Hoy',
            'week': 'Esta Semana (Últimos 7 Días)',
            'month': 'Este Mes (Últimos 30 Días)',
            'all': 'Todo el Historial'
        };

        const periodBadge = document.getElementById('adminMovementsPeriodBadge');
        if (periodBadge) {
            periodBadge.textContent = `· Período: ${periodNames[period] || 'Hoy'}`;
        }

        // 1. Filtrar los tickets que corresponden al período seleccionado
        const periodTickets = (saasState.tickets || []).filter(t => {
            if (period === 'all') return true;
            const relevantTime = parseDateToTimestamp(t.estado === 'FINALIZADO' ? (t.fechaSalida || t.fechaIngreso) : t.fechaIngreso);
            if (period === 'today') return relevantTime >= startOfToday;
            if (period === 'week') return relevantTime >= sevenDaysAgo;
            if (period === 'month') return relevantTime >= thirtyDaysAgo;
            return true;
        });

        const movements = [];

        // 2. Construir objetos de movimiento
        periodTickets.forEach(t => {
            if (t.estado === 'ACTIVO') {
                const ts = parseDateToTimestamp(t.fechaIngreso);
                movements.push({
                    id: t.id,
                    fecha: new Date(ts),
                    ticketCodigo: t.ticketCodigo,
                    placa: t.placa,
                    categoria: t.tipoVehiculo,
                    bahia: t.spotCodigo,
                    tipo: t.cruzoMedianoche ? 'NOCTURNO' : 'INGRESO',
                    tipoLabel: t.cruzoMedianoche ? '🌙 Cruce Nocturno' : '🎟️ Ingreso Vehicular',
                    tipoClass: t.cruzoMedianoche ? 'pill-amber' : 'pill-primary',
                    operador: t.operadorEntrada || 'Operador de Patio',
                    monto: '<span style="color:var(--text-muted); font-size:0.75rem;">En curso...</span>',
                    estadoBadge: '<span class="status-badge badge-active-live">Activo</span>'
                });
            } else if (t.estado === 'FINALIZADO') {
                const ts = parseDateToTimestamp(t.fechaSalida || t.fechaIngreso);
                movements.push({
                    id: t.id,
                    fecha: new Date(ts),
                    ticketCodigo: t.ticketCodigo,
                    placa: t.placa,
                    categoria: t.tipoVehiculo,
                    bahia: t.spotCodigo,
                    tipo: 'SALIDA',
                    tipoLabel: `💳 Cobro & Salida (${t.metodoPago || 'Efectivo'})`,
                    tipoClass: 'pill-emerald',
                    operador: t.operadorSalida || 'Administrador / Caja',
                    monto: `<strong style="color:var(--emerald); font-family:'JetBrains Mono';">$${(parseFloat(t.valorPagado) || 0).toLocaleString('es-CO')} COP</strong>`,
                    estadoBadge: '<span class="status-badge badge-completed">Liquidado</span>'
                });
            }
        });

        // 3. Ordenar cronológicamente (más recientes primero)
        movements.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        // 4. Aplicar filtro de tipo (ALL, INGRESO, SALIDA, NOCTURNO)
        const filtered = movements.filter(m => {
            if (filter === 'ALL') return true;
            if (filter === 'INGRESO') return m.tipo === 'INGRESO';
            if (filter === 'SALIDA') return m.tipo === 'SALIDA';
            if (filter === 'NOCTURNO') return m.tipo === 'NOCTURNO';
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:2rem;">
                No se encontraron movimientos registrados en <strong>${periodNames[period] || 'este período'}</strong> con el filtro seleccionado.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(m => `
            <tr>
                <td style="font-family:'JetBrains Mono'; font-size:0.75rem; white-space:nowrap; color:var(--text-muted);">
                    ${m.fecha.toLocaleDateString('es-CO', {day:'2-digit', month:'short'})} ${m.fecha.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                </td>
                <td><strong style="color:var(--primary); font-family:'JetBrains Mono';">${m.ticketCodigo}</strong></td>
                <td><span class="plate-pill">${m.placa}</span></td>
                <td>${m.categoria}</td>
                <td><strong style="color:var(--emerald);">${m.bahia}</strong></td>
                <td><span class="role-badge-tag ${m.tipoClass}">${m.tipoLabel}</span></td>
                <td style="font-size:0.75rem; color:var(--text-body);">${m.operador}</td>
                <td style="text-align:right;">${m.monto}</td>
                <td>${m.estadoBadge}</td>
            </tr>
        `).join('');
    }

    // Exportar Reporte Financiero a Formato CSV
    function exportFinancialReportCsv() {
        const tickets = saasState.tickets || [];
        if (tickets.length === 0) {
            alert('No hay tickets registrados en el sistema para exportar.');
            return;
        }

        const headers = ['ID', 'Codigo_Ticket', 'Placa', 'Categoria_Vehiculo', 'Bahia', 'Fecha_Ingreso', 'Fecha_Salida', 'Minutos', 'Monto_COP', 'Metodo_Pago', 'Cruzo_Medianoche', 'Estado'];
        const rows = tickets.map(t => [
            t.id,
            t.ticketCodigo,
            t.placa,
            `"${t.tipoVehiculo}"`,
            t.spotCodigo,
            `"${t.fechaIngreso}"`,
            `"${t.fechaSalida || ''}"`,
            t.minutosTranscurridos || 0,
            t.valorPagado || 0,
            `"${t.metodoPago || ''}"`,
            t.cruzoMedianoche ? 'SI' : 'NO',
            t.estado
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `ParkFlow_Reporte_Financiero_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showRbacToast('Reporte financiero exportado en archivo CSV correctamente.', false);
    }

    // Modal de Arqueo y Cierre de Caja Oficial (Z-Report)
    function openCashClosingModal() {
        const completed = (saasState.tickets || []).filter(t => t.estado === 'FINALIZADO');
        let cashTotal = 0, cardTotal = 0, qrTotal = 0;

        completed.forEach(t => {
            const val = parseFloat(t.valorPagado) || 0;
            const m = (t.metodoPago || '').toUpperCase();
            if (m.includes('TARJETA') || m.includes('CARD') || m.includes('DATAFONO')) cardTotal += val;
            else if (m.includes('QR') || m.includes('NEQUI') || m.includes('DAVIPLATA') || m.includes('TRANSFERENCIA')) qrTotal += val;
            else cashTotal += val;
        });

        const totalRevenue = cashTotal + cardTotal + qrTotal;
        const initialDrawerBase = 150000;
        const totalCashInDrawer = initialDrawerBase + cashTotal;
        const now = new Date();
        const zNumber = `Z-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(100 + Math.random()*900)}`;
        const user = currentAuthSession ? `${currentAuthSession.nombre} (${currentAuthSession.rol})` : 'Diana Katerine (Admin)';

        const container = document.getElementById('cashClosingContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; margin-bottom:1rem; border-bottom:1px dashed var(--border); padding-bottom:0.75rem;">
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-heading); letter-spacing:1px;">PARKFLOW SMART SAAS</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">SISTEMA DE CONTROL DE ACCESO & LIQUIDACIÓN</div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-top:0.35rem; font-family:'JetBrains Mono';">COMPROBANTE OFICIAL DE CIERRE Z</div>
                    <div style="font-size:0.75rem; font-family:'JetBrains Mono'; color:var(--text-muted);">${zNumber}</div>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.45rem; font-size:0.8rem; margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">Fecha y Hora Cierre:</span>
                        <strong style="font-family:'JetBrains Mono';">${now.toLocaleString('es-CO')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">Responsable / Cajero:</span>
                        <strong>${user}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted);">Estancias Liquidadas:</span>
                        <strong style="color:var(--primary);">${completed.length} tickets</strong>
                    </div>
                </div>

                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem; margin-bottom:1rem;">
                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem; border-bottom:1px solid var(--border); padding-bottom:0.25rem;">
                        Desglose de Ingresos por Medio de Pago
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.8rem;">
                        <span>💵 Efectivo Recaudado:</span>
                        <strong style="font-family:'JetBrains Mono';">$${cashTotal.toLocaleString('es-CO')} COP</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.8rem;">
                        <span>💳 Tarjetas Débito / Crédito:</span>
                        <strong style="font-family:'JetBrains Mono';">$${cardTotal.toLocaleString('es-CO')} COP</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.8rem;">
                        <span>📱 Transferencias QR Digital:</span>
                        <strong style="font-family:'JetBrains Mono';">$${qrTotal.toLocaleString('es-CO')} COP</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border); padding-top:0.4rem; font-size:0.95rem; font-weight:800;">
                        <span>Total Facturado Período:</span>
                        <span style="color:var(--emerald); font-family:'JetBrains Mono';">$${totalRevenue.toLocaleString('es-CO')} COP</span>
                    </div>
                </div>

                <div style="background:var(--bg-surface-elevated); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-sm); padding:0.85rem; margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                        <span style="color:var(--text-muted);">Base Inicial en Gaveta:</span>
                        <span style="font-family:'JetBrains Mono';">$${initialDrawerBase.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.5rem;">
                        <span style="color:var(--text-muted);">+ Efectivo Recaudado:</span>
                        <span style="font-family:'JetBrains Mono';">$${cashTotal.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(16,185,129,0.3); padding-top:0.35rem; font-size:1.05rem; font-weight:800;">
                        <span style="color:var(--emerald);">Efectivo Físico Total en Caja:</span>
                        <span style="color:var(--emerald); font-family:'JetBrains Mono';">$${totalCashInDrawer.toLocaleString('es-CO')} COP</span>
                    </div>
                </div>

                <div style="font-size:0.7rem; color:var(--text-muted); text-align:center;">
                    Firma de Conformidad Cajero: __________________________
                </div>
            `;
        }

        openSaasModal('modalCashClosing');
    }

    // Laboratorios Interactivos de Patrones de Diseño (GoF) y Dominios DDD
    function executeStrategyDemo() {
        const select = document.getElementById('strategySelect');
        const inputMin = document.getElementById('strategyMinutes');
        if (!select || !inputMin) return;

        const strat = select.value;
        const mins = Math.max(1, parseInt(inputMin.value, 10) || 1);

        let activeName = '';
        let formula = '';
        let total = 0;

        if (strat === 'Automóvil') {
            activeName = 'AutomovilBillingStrategy (GoF Behavioral)';
            const ratePerMin = 110;
            const graceMins = 5;
            const billable = Math.max(0, mins - graceMins);
            total = billable * ratePerMin;
            formula = `${mins} min - ${graceMins}m gracia = ${billable}m x $${ratePerMin}/min`;
        } else if (strat === 'Motocicleta') {
            activeName = 'MotocicletaBillingStrategy (GoF Behavioral)';
            const ratePerMin = 65;
            const graceMins = 5;
            const billable = Math.max(0, mins - graceMins);
            total = billable * ratePerMin;
            formula = `${mins} min - ${graceMins}m gracia = ${billable}m x $${ratePerMin}/min`;
        } else if (strat === 'Bicicleta') {
            activeName = 'BicicletaBillingStrategy (GoF Behavioral)';
            const ratePerMin = 25;
            const graceMins = 15;
            const billable = Math.max(0, mins - graceMins);
            total = billable * ratePerMin;
            formula = `${mins} min - ${graceMins}m cortesía = ${billable}m x $${ratePerMin}/min`;
        } else if (strat === 'Nocturna') {
            activeName = 'TarifaNocturnaBillingStrategy (Tope de Noche)';
            total = 15000;
            formula = `Permanencia ${mins} min cruzando medianoche = Tarifa Plana Nocturna`;
        }

        const elName = document.getElementById('strategyActiveName');
        if (elName) elName.textContent = activeName;
        const elFormula = document.getElementById('strategyFormula');
        if (elFormula) elFormula.textContent = formula;
        const elTotal = document.getElementById('strategyTotal');
        if (elTotal) elTotal.textContent = `$${total.toLocaleString('es-CO')} COP`;
    }

    function executeObserverDemo() {
        const consoleLog = document.getElementById('observerConsoleLog');
        const mapItem = document.getElementById('obsItemMap');
        const kpiItem = document.getElementById('obsItemKpi');
        const auditItem = document.getElementById('obsItemAudit');

        const spotCode = 'B-02';
        const randomState = (Math.random() > 0.5) ? 'OCUPADO' : 'DISPONIBLE';

        if (mapItem) mapItem.style.boxShadow = '0 0 12px var(--emerald)';
        if (kpiItem) kpiItem.style.boxShadow = '0 0 12px var(--primary)';
        if (auditItem) auditItem.style.boxShadow = '0 0 12px var(--amber)';

        if (consoleLog) {
            consoleLog.innerHTML = `
                <div style="color:var(--emerald);">[Sensor IoT Telemetría]: Evento detectado en sensor ultrasónico bahía ${spotCode} -> ${randomState}.</div>
                <div style="color:var(--primary); margin-top:2px;">[SpotMapObserver]: Notificado -> Re-renderizando nodos SVG y clases CSS de bahía ${spotCode}.</div>
                <div style="color:var(--indigo); margin-top:2px;">[DashboardMetricsObserver]: Notificado -> Recalculando contadores libres/ocupados y aforo.</div>
                <div style="color:var(--amber); margin-top:2px;">[AuditLoggerObserver]: Notificado -> Inyectando registro inmutable en MySQL audit_log.</div>
            `;
        }

        setTimeout(() => {
            if (mapItem) mapItem.style.boxShadow = 'none';
            if (kpiItem) kpiItem.style.boxShadow = 'none';
            if (auditItem) auditItem.style.boxShadow = 'none';
        }, 1200);
    }

    function executeStateAction(action) {
        const current = saasState.currentStateSpot || 'LIBRE';
        const badge = document.getElementById('stateBadgeActive');
        const feedback = document.getElementById('stateTransitionFeedback');

        let nextState = current;
        let msg = '';
        let isError = false;

        if (action === 'occupy') {
            if (current === 'LIBRE') {
                nextState = 'OCUPADO';
                msg = 'Transición VÁLIDA: LibreState -> occupy() -> OcupadoState (Vehículo ingresó).';
            } else if (current === 'OCUPADO') {
                isError = true;
                msg = 'Transición INVÁLIDA (State Exception): La bahía ya se encuentra OCUPADA.';
            } else if (current === 'MANTENIMIENTO') {
                isError = true;
                msg = 'Transición BLOQUEADA: No se puede ocupar una bahía en MANTENIMIENTO.';
            }
        } else if (action === 'vacate') {
            if (current === 'OCUPADO') {
                nextState = 'LIBRE';
                msg = 'Transición VÁLIDA: OcupadoState -> vacate() -> LibreState (Vehículo liberó el cupo).';
            } else {
                isError = true;
                msg = `Transición INVÁLIDA: La bahía no está ocupada (Estado actual: ${current}).`;
            }
        } else if (action === 'maintain') {
            if (current === 'LIBRE') {
                nextState = 'MANTENIMIENTO';
                msg = 'Transición VÁLIDA: LibreState -> lock() -> MantenimientoState (Bahía bloqueada por mantenimiento).';
            } else if (current === 'OCUPADO') {
                isError = true;
                msg = 'Transición BLOQUEADA: No se puede poner en mantenimiento una bahía con vehículo activo.';
            } else {
                msg = 'La bahía ya se encuentra en MANTENIMIENTO.';
            }
        } else if (action === 'release') {
            if (current === 'MANTENIMIENTO') {
                nextState = 'LIBRE';
                msg = 'Transición VÁLIDA: MantenimientoState -> release() -> LibreState (Bahía reabierta al público).';
            } else {
                isError = true;
                msg = `Transición INVÁLIDA: La bahía no está en mantenimiento (Estado actual: ${current}).`;
            }
        }

        saasState.currentStateSpot = nextState;

        if (badge) {
            if (nextState === 'LIBRE') {
                badge.className = 'status-badge badge-available';
                badge.textContent = '● LIBRE (Verde)';
            } else if (nextState === 'OCUPADO') {
                badge.className = 'status-badge badge-occupied';
                badge.textContent = '● OCUPADO (Rojo)';
            } else if (nextState === 'MANTENIMIENTO') {
                badge.className = 'status-badge badge-maintenance';
                badge.textContent = '● MANTENIMIENTO (Gris)';
            }
        }

        if (feedback) {
            feedback.style.color = isError ? 'var(--rose)' : 'var(--emerald)';
            feedback.style.borderColor = isError ? 'rgba(244,63,94,0.4)' : 'rgba(16,185,129,0.3)';
            feedback.innerHTML = isError ? `⚠️ ${msg}` : `✅ ${msg}`;
        }
    }

    function renderDtoDemo() {
        const select = document.getElementById('dtoTypeSelect');
        const rawPre = document.getElementById('dtoRawJson');
        const sanPre = document.getElementById('dtoSanitizedJson');
        if (!select || !rawPre || !sanPre) return;

        const val = select.value;
        if (val === 'TicketDTO') {
            rawPre.textContent = JSON.stringify({
                id: 104,
                usuario_id: 2,
                spot_id: 12,
                raw_secret_hash: "e3b0c44298fc1c149afbf4c8996fb924",
                internal_db_lock: false,
                ticketCodigo: "TCK-2026-8840",
                placa: "SUV-779",
                minutosTranscurridos: 260,
                valorPagado: "25000.00"
            }, null, 2);

            sanPre.textContent = JSON.stringify({
                ticketCodigo: "TCK-2026-8840",
                placa: "SUV-779",
                minutos: 260,
                totalPagar: 25000,
                moneda: "COP",
                estado: "LIQUIDADO"
            }, null, 2);
        } else if (val === 'SpotDTO') {
            rawPre.textContent = JSON.stringify({
                id: 18,
                sensor_hardware_id: "HW-IOT-ESP32-990",
                raw_firmware_flag: 4,
                codigo: "C-02",
                tipoPermitido: "Motocicleta",
                estado: "DISPONIBLE"
            }, null, 2);

            sanPre.textContent = JSON.stringify({
                codigo: "C-02",
                categoria: "Motocicleta",
                disponible: true,
                estadoColor: "emerald"
            }, null, 2);
        } else if (val === 'RateDTO') {
            rawPre.textContent = JSON.stringify({
                id: 5,
                schema_version: "2026.1",
                tipoVehiculo: "Bicicleta",
                tarifaPorMinuto: "25.00",
                tarifaPorHora: "1200.00",
                minutosGracia: 15
            }, null, 2);

            sanPre.textContent = JSON.stringify({
                tipoVehiculo: "Bicicleta",
                precioMinutoCOP: 25,
                precioHoraCOP: 1200,
                minutosCortesía: 15
            }, null, 2);
        }
    }

    function updateDddCapacityMetrics() {
        const spots = saasState.spots || [];
        const countAuto = spots.filter(s => s.tipoPermitido === 'Automóvil').length;
        const countMoto = spots.filter(s => s.tipoPermitido === 'Motocicleta').length;
        const countBici = spots.filter(s => s.tipoPermitido === 'Bicicleta').length;
        const countOther = spots.filter(s => s.tipoPermitido !== 'Automóvil' && s.tipoPermitido !== 'Motocicleta' && s.tipoPermitido !== 'Bicicleta').length;

        const elAuto = document.getElementById('capAutoDisplay');
        if (elAuto) elAuto.textContent = `${countAuto || 6} Bahías Instaladas`;

        const elMoto = document.getElementById('capMotoDisplay');
        if (elMoto) elMoto.textContent = `${countMoto || 6} Bahías Instaladas`;

        const elBici = document.getElementById('capBiciDisplay');
        if (elBici) elBici.textContent = `${countBici || 4} Cupos Ecológicos`;

        const elSuv = document.getElementById('capSuvEvDisplay');
        if (elSuv) elSuv.textContent = `${countOther || 12} Bahías con Sensor`;

        const elAudit = document.getElementById('auditCountDddDisplay');
        if (elAudit) elAudit.textContent = `${(saasState.audit || []).length} Registros Inmutables`;
    }

    // Renderizar tabla en Overview (Compatibilidad)
    function renderOverviewTable() {
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO').slice(0, 5);
        const tbody = document.getElementById('overviewActiveTableBody');
        if (!tbody) return;

        if (active.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">No hay estancias activas actualmente.</td></tr>';
            return;
        }

        tbody.innerHTML = active.map(t => `
            <tr>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--primary);">${t.ticketCodigo}</span></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.tipoVehiculo}</td>
                <td><span style="font-weight:700; color:var(--emerald);">${t.spotCodigo}</span></td>
                <td>${new Date(t.fechaIngreso).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
                <td><span class="status-badge badge-active-live">Activo</span></td>
                <td>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openCheckOutModal('${t.id}')">Cobrar</button>
                </td>
            </tr>
        `).join('');
    }

    // Renderizar tabla completa de Operaciones
    function renderOperationsTable() {
        filterOperationsTable(document.getElementById('operationsFilterInput')?.value || '');
    }

    function filterOperationsTable(query) {
        const term = query.trim().toUpperCase();
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO');
        const filtered = term ? active.filter(t => t.placa.includes(term) || t.spotCodigo.includes(term) || t.ticketCodigo.includes(term)) : active;

        const tbody = document.getElementById('operationsFullTableBody');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No se encontraron vehículos activos con ese criterio.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(t => `
            <tr>
                <td><strong style="color:var(--primary); font-family:'JetBrains Mono';">${t.ticketCodigo}</strong></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.tipoVehiculo}</td>
                <td><strong style="color:var(--emerald);">${t.spotCodigo}</strong></td>
                <td>${new Date(t.fechaIngreso).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
                <td>${t.cruzoMedianoche ? '<span style="color:var(--amber); font-weight:700;">🌙 Cruce Nocturno</span>' : '<span style="color:var(--text-muted);">Diurno</span>'}</td>
                <td><span class="status-badge badge-active-live">Activo</span></td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" title="Simular cruce de medianoche (-16h)" onclick="simulateMidnightCrossing('${t.id}')">🌙 -16h</button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openCheckOutModal('${t.id}')">Liquidación</button>
                </td>
            </tr>
        `).join('');
    }

    // Filtrar bahías en modal de CheckIn
    function filterAvailableBaysForCheckIn() {
        const type = document.getElementById('checkInType').value;
        const select = document.getElementById('checkInBay');
        select.innerHTML = '';

        const freeBays = saasState.spots.filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === type);
        if (freeBays.length === 0) {
            select.innerHTML = `<option value="">No hay bahías disponibles para ${type}</option>`;
            return;
        }

        freeBays.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = `${b.codigo} (${b.zona} · ${b.nivel})`;
            select.appendChild(opt);
        });
    }

        // =========================================================================
    // Registro de Vehículos por el Cliente (Autoservicio)
    // =========================================================================
    function filterAvailableBaysForClientSelf() {
        const typeSelect = document.getElementById('clientSelfType');
        const baySelect = document.getElementById('clientSelfBay');
        if (!typeSelect || !baySelect) return;

        const selectedType = typeSelect.value;
        const available = saasState.spots.filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === selectedType);

        baySelect.innerHTML = '';
        if (available.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = `No hay bahías libres para ${selectedType}`;
            baySelect.appendChild(opt);
            return;
        }

        available.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = `${b.codigo} (${b.zona} · ${b.nivel})`;
            baySelect.appendChild(opt);
        });
    }

    async function handleClientSelfEntrySubmit(e) {
        if (e) e.preventDefault();
        const plateInput = document.getElementById('clientSelfPlate');
        const typeSelect = document.getElementById('clientSelfType');
        const baySelect = document.getElementById('clientSelfBay');
        const btn = document.getElementById('btnSubmitClientSelf');

        const plate = plateInput ? plateInput.value.trim().toUpperCase() : '';
        const type = typeSelect ? typeSelect.value : 'Automóvil';
        const bay = baySelect ? baySelect.value : '';
        const owner = currentAuthSession?.nombre || 'Cliente Autoservicio';

        if (!plate) {
            alert('Por favor ingresa la placa de tu vehículo.');
            return;
        }

        if (!bay) {
            alert('Por favor selecciona una bahía de parqueo disponible.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> Registrando...';
        }

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placa: plate,
                    tipoVehiculo: type,
                    spotCodigo: bay,
                    propietarioNombre: owner,
                    operadorEntrada: 'Autoservicio Cliente (' + owner + ')'
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'No fue posible registrar el vehículo.');
                return;
            }

            // Limpiar campo de placa
            if (plateInput) plateInput.value = '';

            // Mostrar ticket generado
            showCheckInReceipt(data.data);

            // Sincronizar datos
            await syncAllFromDatabase();

            // Consultar inmediatamente para mostrar la estancia en curso en el portal
            const clientSearchInput = document.getElementById('saasClientPlateSearch');
            if (clientSearchInput) {
                clientSearchInput.value = plate;
                handleSaasClientSearch();
            }

            showRbacToast(`✅ ¡Tu vehículo <strong>${plate}</strong> fue registrado con éxito en la bahía <strong>${bay}</strong>!`, false);

        } catch (err) {
            alert('Error al registrar vehículo: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>🚀</span> Registrar Entrada';
            }
        }
    }

    window.filterAvailableBaysForClientSelf = filterAvailableBaysForClientSelf;
    window.handleClientSelfEntrySubmit = handleClientSelfEntrySubmit;

    // Registrar Entrada (Check-In)
    async function handleSaasEntrySubmit(e) {
        e.preventDefault();
        const plate = document.getElementById('checkInPlate').value.trim().toUpperCase();
        const type = document.getElementById('checkInType').value;
        const bay = document.getElementById('checkInBay').value;
        const owner = document.getElementById('checkInOwner').value.trim() || 'Cliente Visitante';

        if (!bay) {
            alert('Seleccione una bahía disponible.');
            return;
        }

        const btn = document.getElementById('btnSubmitCheckIn');
        btn.disabled = true;
        btn.textContent = 'Guardando en MySQL...';

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placa: plate,
                    tipoVehiculo: type,
                    spotCodigo: bay,
                    propietarioNombre: owner,
                    operadorEntrada: saasState.currentRole
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error registrando entrada.');
                return;
            }

            closeSaasModal('modalCheckIn');
            document.getElementById('checkInPlate').value = '';
            document.getElementById('checkInOwner').value = '';

            // Mostrar ticket generado
            showCheckInReceipt(data.data);

            await syncAllFromDatabase();
        } catch (err) {
            alert('Error de conexión: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Registrar en MySQL';
        }
    }

    function showCheckInReceipt(ticket) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Ticket de Ingreso Oficial';
        const html = `
            <div class="saas-receipt">
                <div class="receipt-brand">PARKFLOW CLOUD</div>
                <div class="receipt-sub">TICKET DIGITAL · CONTROL DE ACCESO</div>
                <div class="receipt-line"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.1rem;">${ticket.placa}</strong></div>
                <div class="receipt-line"><span>TIPO:</span><span>${ticket.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA:</span><strong style="color:#10b981;">${ticket.spotCodigo}</strong></div>
                <div class="receipt-line"><span>FECHA ENTRADA:</span><span>${new Date(ticket.fechaIngreso).toLocaleString('es-CO')}</span></div>
                <div class="receipt-line"><span>OPERADOR:</span><span>${ticket.operadorEntrada}</span></div>
                <div style="text-align:center; margin-top:1.25rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem;">
                    <span style="font-size:0.68rem; color:#64748b;">Conserve este ticket para la salida y facturación.</span>
                    <div style="font-family:'JetBrains Mono'; letter-spacing:0.3em; margin-top:0.35rem; font-size:0.85rem;">||| | |||| | ||||| |||| |</div>
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceiptSaas');
    }

    // =========================================================================
    // CÁLCULO DE COBRO POR MINUTOS DE ESTADÍA & LIQUIDACIÓN
    // =========================================================================
    let checkOutCalculationMode = 'MINUTE'; // 'MINUTE' o 'MIXED'
    let checkOutBaseMinutes = 1;

    function calculateStayFee(tipoVehiculo, minutes, mode = 'MINUTE') {
        const rate = (saasState.rates && saasState.rates.find(r => r.tipoVehiculo === tipoVehiculo)) || {
            tarifaPorMinuto: 110,
            tarifaPorHora: 5800,
            tarifaPlenaDia: 42000,
            fraccionGraciaMin: 5
        };

        const mins = Math.max(1, parseInt(minutes) || 1);
        const grace = rate.fraccionGraciaMin !== undefined ? rate.fraccionGraciaMin : 5;

        // Regla 1: Dentro del período de gracia (cortesía gratuita)
        if (mins <= grace) {
            return {
                minutes: mins,
                graceMin: grace,
                billableMinutes: 0,
                ratePerMinute: rate.tarifaPorMinuto,
                ratePerHour: rate.tarifaPorHora,
                ratePerDay: rate.tarifaPlenaDia,
                mode: mode,
                subtotal: 0,
                total: 0,
                formula: `Estadía (${mins}m) ≤ Gracia (${grace}m) → Cortesía gratuita ($0 COP)`,
                isGrace: true,
                isMaxDay: false
            };
        }

        // Regla 2: Estadía de 12 horas o más (720 min) -> Aplica tarifa plena de día
        if (mins >= 720) {
            return {
                minutes: mins,
                graceMin: grace,
                billableMinutes: mins,
                ratePerMinute: rate.tarifaPorMinuto,
                ratePerHour: rate.tarifaPorHora,
                ratePerDay: rate.tarifaPlenaDia,
                mode: mode,
                subtotal: rate.tarifaPlenaDia,
                total: Math.round(rate.tarifaPlenaDia),
                formula: `Estadía prolongada (${mins}m ≥ 12h) → Tarifa Plena Día`,
                isGrace: false,
                isMaxDay: true
            };
        }

        let total = 0;
        let formula = '';

        if (mode === 'MINUTE') {
            // Cobro exacto por minuto
            total = mins * rate.tarifaPorMinuto;
            if (total > rate.tarifaPlenaDia) {
                total = rate.tarifaPlenaDia;
                formula = `${mins}m × $${rate.tarifaPorMinuto.toLocaleString('es-CO')}/min (Tope Día Pleno)`;
            } else {
                formula = `${mins} min × $${rate.tarifaPorMinuto.toLocaleString('es-CO')}/min = $${Math.round(total).toLocaleString('es-CO')} COP`;
            }
        } else {
            // Cobro Mixto (horas completas + minutos restantes)
            const h = Math.floor(mins / 60);
            const rem = mins % 60;
            total = (h * rate.tarifaPorHora) + (rem * rate.tarifaPorMinuto);
            if (total > rate.tarifaPlenaDia) {
                total = rate.tarifaPlenaDia;
                formula = `${h}h + ${rem}m (Tope Día Pleno)`;
            } else {
                formula = `${h}h ($${rate.tarifaPorHora.toLocaleString('es-CO')}) + ${rem}m ($${(rem * rate.tarifaPorMinuto).toLocaleString('es-CO')})`;
            }
        }

        return {
            minutes: mins,
            graceMin: grace,
            billableMinutes: mins,
            ratePerMinute: rate.tarifaPorMinuto,
            ratePerHour: rate.tarifaPorHora,
            ratePerDay: rate.tarifaPlenaDia,
            mode: mode,
            subtotal: total,
            total: Math.round(total),
            formula: formula,
            isGrace: false,
            isMaxDay: total >= rate.tarifaPlenaDia
        };
    }

    // Modal de Cobro / Salida
    function openCheckOutModal(ticketId) {
        const ticket = saasState.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        saasState.pendingCheckOutTicket = ticket;
        checkOutCalculationMode = 'MINUTE';

        const entryTime = new Date(ticket.fechaIngreso).getTime();
        const mins = Math.max(1, Math.round((Date.now() - entryTime) / 60000));
        checkOutBaseMinutes = mins;

        document.getElementById('coPlateDisplay').textContent = ticket.placa;
        document.getElementById('coBayDisplay').textContent = ticket.spotCodigo;
        
        const typeDisplay = document.getElementById('coVehicleTypeDisplay');
        if (typeDisplay) typeDisplay.textContent = ticket.tipoVehiculo;

        const realDisplay = document.getElementById('coRealDurationDisplay');
        if (realDisplay) realDisplay.textContent = `${mins}m`;

        const minsInput = document.getElementById('coMinutesInput');
        if (minsInput) minsInput.value = mins;

        const btnMin = document.getElementById('btnRateModeMinute');
        const btnMix = document.getElementById('btnRateModeMixed');
        if (btnMin && btnMix) {
            btnMin.className = 'btn btn-primary btn-sm';
            btnMix.className = 'btn btn-secondary btn-sm';
        }

        recalculateCheckOutAmount(mins);
        openSaasModal('modalCheckOut');
    }

    function setCheckOutCalculationMode(mode) {
        checkOutCalculationMode = mode;
        const btnMin = document.getElementById('btnRateModeMinute');
        const btnMix = document.getElementById('btnRateModeMixed');
        if (btnMin && btnMix) {
            if (mode === 'MINUTE') {
                btnMin.className = 'btn btn-primary btn-sm';
                btnMix.className = 'btn btn-secondary btn-sm';
            } else {
                btnMin.className = 'btn btn-secondary btn-sm';
                btnMix.className = 'btn btn-primary btn-sm';
            }
        }
        recalculateCheckOutAmount();
    }

    function onCheckOutMinutesInputChange(val) {
        const m = Math.max(1, parseInt(val) || 1);
        recalculateCheckOutAmount(m);
    }

    function adjustCheckOutMinutes(delta) {
        const minsInput = document.getElementById('coMinutesInput');
        if (!minsInput) return;
        const current = parseInt(minsInput.value) || checkOutBaseMinutes;
        const next = Math.max(1, current + delta);
        minsInput.value = next;
        recalculateCheckOutAmount(next);
    }

    function resetCheckOutToRealTime() {
        const minsInput = document.getElementById('coMinutesInput');
        if (minsInput) minsInput.value = checkOutBaseMinutes;
        recalculateCheckOutAmount(checkOutBaseMinutes);
    }

    function recalculateCheckOutAmount(customMins) {
        const t = saasState.pendingCheckOutTicket;
        if (!t) return;

        const minsInput = document.getElementById('coMinutesInput');
        const mins = customMins !== undefined ? customMins : (minsInput ? (parseInt(minsInput.value) || checkOutBaseMinutes) : checkOutBaseMinutes);

        const calc = calculateStayFee(t.tipoVehiculo, mins, checkOutCalculationMode);

        t.calculatedMinutes = calc.minutes;
        t.calculatedAmount = calc.total;
        t.calculationMode = checkOutCalculationMode;

        const rateMinEl = document.getElementById('coRatePerMinuteDisplay');
        if (rateMinEl) rateMinEl.textContent = `$${calc.ratePerMinute.toLocaleString('es-CO')} / min`;

        const graceEl = document.getElementById('coGraceDisplay');
        if (graceEl) graceEl.textContent = `${calc.graceMin} min de cortesía`;

        const billableEl = document.getElementById('coBillableMinsDisplay');
        if (billableEl) billableEl.textContent = `${calc.billableMinutes} min`;

        const formulaEl = document.getElementById('coFormulaDisplay');
        if (formulaEl) formulaEl.textContent = calc.formula;

        const totalEl = document.getElementById('coTotalAmountDisplay');
        if (totalEl) totalEl.textContent = `$${calc.total.toLocaleString('es-CO')} COP`;

        const durationDisplay = document.getElementById('coDurationDisplay');
        if (durationDisplay) durationDisplay.textContent = `${calc.minutes} minutos (${(calc.minutes/60).toFixed(1)} hrs)`;
    }

    async function confirmCheckOutPayment() {
        const t = saasState.pendingCheckOutTicket;
        if (!t) return;

        const method = document.getElementById('coPaymentMethod').value;

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logId: t.id,
                    valorPagado: t.calculatedAmount,
                    minutosTranscurridos: t.calculatedMinutes,
                    metodoPago: method,
                    operadorSalida: saasState.currentRole
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error al liquidar salida.');
                return;
            }

            closeSaasModal('modalCheckOut');
            showCheckOutReceipt(data.data, t);
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error al liquidar cobro en MySQL: ' + e.message);
        }
    }

    function showCheckOutReceipt(ticket, pendingInfo) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Factura Electrónica Equivalente';
        const rate = (saasState.rates && saasState.rates.find(r => r.tipoVehiculo === ticket.tipoVehiculo)) || { tarifaPorMinuto: 110 };
        const html = `
            <div class="saas-receipt">
                <div class="receipt-brand">PARKFLOW CLOUD</div>
                <div class="receipt-sub">FACTURA Y RECIBO DE PAGO · MYSQL AUDITED</div>
                <div class="receipt-line"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.15rem;">${ticket.placa}</strong></div>
                <div class="receipt-line"><span>TIPO VEHÍCULO:</span><span>${ticket.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA LIBERADA:</span><strong>${ticket.spotCodigo}</strong></div>
                <div class="receipt-line"><span>DURACIÓN ESTADÍA:</span><strong>${ticket.minutosTranscurridos} minutos</strong></div>
                <div class="receipt-line"><span>TARIFA / MINUTO:</span><span>$${rate.tarifaPorMinuto.toLocaleString('es-CO')}/min</span></div>
                <div class="receipt-line"><span>MÉTODO PAGO:</span><span>${ticket.metodoPago}</span></div>
                <div class="receipt-line"><span>FECHA SALIDA:</span><span>${new Date(ticket.fechaSalida).toLocaleString('es-CO')}</span></div>
                <div class="receipt-total-bar">
                    <span>TOTAL LIQUIDADO:</span>
                    <span style="color:#10b981;">$${(ticket.valorPagado || 0).toLocaleString('es-CO')} COP</span>
                </div>
                <div style="text-align:center; margin-top:1rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem; font-size:0.72rem; color:#64748b;">
                    Cobro liquidado por minutos de estadía en ParkFlow. Bahía liberada en MySQL.
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceiptSaas');
    }

    // =========================================================================
    // CALCULADORA GENERAL & PORTAL DE ESTADÍA POR MINUTOS
    // =========================================================================
    function openMinuteCalculatorModal(tipoVehiculo, mins) {
        if (tipoVehiculo) {
            const vSelect = document.getElementById('modalCalcVehicleType');
            if (vSelect) vSelect.value = tipoVehiculo;
        }
        if (mins) {
            setModalCalcMinutes(mins);
        } else {
            updateModalMinuteCalculation();
        }
        openSaasModal('modalMinuteCalculator');
    }

    function updateModalMinuteCalculation() {
        const vType = document.getElementById('modalCalcVehicleType')?.value || 'Automóvil';
        const mode = document.getElementById('modalCalcMode')?.value || 'MINUTE';
        const mins = parseInt(document.getElementById('modalCalcMinutesInput')?.value) || 45;

        const calc = calculateStayFee(vType, mins, mode);

        const hoursEl = document.getElementById('modalCalcHoursEquiv');
        if (hoursEl) hoursEl.textContent = `≈ ${(mins/60).toFixed(1)}h`;

        const rateMinEl = document.getElementById('modalCalcRateMinDisplay');
        if (rateMinEl) rateMinEl.textContent = `$${calc.ratePerMinute.toLocaleString('es-CO')} / min`;

        const graceEl = document.getElementById('modalCalcGraceDisplay');
        if (graceEl) graceEl.textContent = `${calc.graceMin} min gratis`;

        const billableEl = document.getElementById('modalCalcBillableDisplay');
        if (billableEl) billableEl.textContent = `${calc.billableMinutes} mins`;

        const formulaEl = document.getElementById('modalCalcFormulaDisplay');
        if (formulaEl) formulaEl.textContent = calc.formula;

        const totalEl = document.getElementById('modalCalcTotalDisplay');
        if (totalEl) totalEl.textContent = `$${calc.total.toLocaleString('es-CO')} COP`;
    }

    function onModalCalcMinutesInputChange(val) {
        const m = Math.max(1, parseInt(val) || 1);
        const range = document.getElementById('modalCalcMinutesRange');
        if (range && m <= 480) range.value = m;
        updateModalMinuteCalculation();
    }

    function onModalCalcMinutesRangeChange(val) {
        const input = document.getElementById('modalCalcMinutesInput');
        if (input) input.value = val;
        updateModalMinuteCalculation();
    }

    function setModalCalcMinutes(mins) {
        const input = document.getElementById('modalCalcMinutesInput');
        const range = document.getElementById('modalCalcMinutesRange');
        if (input) input.value = mins;
        if (range && mins <= 480) range.value = mins;
        updateModalMinuteCalculation();
    }

    // Portal del Cliente - Calculadora de Minutos
    function updatePortalMinuteCalculation() {
        const vType = document.getElementById('calcPortalVehicleType')?.value || 'Automóvil';
        const mode = document.getElementById('calcPortalMode')?.value || 'MINUTE';
        const mins = parseInt(document.getElementById('calcPortalMinutesInput')?.value) || 45;

        const calc = calculateStayFee(vType, mins, mode);

        const hoursEl = document.getElementById('calcPortalHoursEquiv');
        if (hoursEl) hoursEl.textContent = `≈ ${(mins/60).toFixed(1)} hrs`;

        const minsDisplay = document.getElementById('calcPortalMinutesDisplay');
        if (minsDisplay) minsDisplay.textContent = `${mins} minutos`;

        const rateMinEl = document.getElementById('calcPortalRateMinDisplay');
        if (rateMinEl) rateMinEl.textContent = `$${calc.ratePerMinute.toLocaleString('es-CO')} / min`;

        const graceEl = document.getElementById('calcPortalGraceDisplay');
        if (graceEl) graceEl.textContent = `${calc.graceMin} min gratis`;

        const billableEl = document.getElementById('calcPortalBillableDisplay');
        if (billableEl) billableEl.textContent = `${calc.billableMinutes} min`;

        const formulaEl = document.getElementById('calcPortalFormulaDisplay');
        if (formulaEl) formulaEl.textContent = calc.formula;

        const totalEl = document.getElementById('calcPortalTotalDisplay');
        if (totalEl) totalEl.textContent = `$${calc.total.toLocaleString('es-CO')} COP`;
    }

    function onPortalMinutesInputChange(val) {
        const m = Math.max(1, parseInt(val) || 1);
        const range = document.getElementById('calcPortalMinutesRange');
        if (range && m <= 480) range.value = m;
        updatePortalMinuteCalculation();
    }

    function onPortalMinutesRangeChange(val) {
        const input = document.getElementById('calcPortalMinutesInput');
        if (input) input.value = val;
        updatePortalMinuteCalculation();
    }

    function setPortalMinutes(mins) {
        const input = document.getElementById('calcPortalMinutesInput');
        const range = document.getElementById('calcPortalMinutesRange');
        if (input) input.value = mins;
        if (range && mins <= 480) range.value = mins;
        updatePortalMinuteCalculation();
    }

    // Simular cruce de medianoche
    async function simulateMidnightCrossing(logId) {
        try {
            await fetch(`${API_BASE}/tickets.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'shift_midnight', logId, hoursBack: 16 })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error al simular medianoche: ' + e.message);
        }
    }

        // =========================================================================
    // MAPA CATEGORIZADO POR TIPO DE VEHÍCULO Y RESERVAS ANTICIPADAS (CLIENTE)
    // =========================================================================
    let currentClientCategoryFilter = 'ALL';
    let selectedClientBayCode = null;

    function switchClientActionTab(tab) {
        const btnEntry = document.getElementById('tabModeEntry');
        const btnReserve = document.getElementById('tabModeReserve');
        const panelEntry = document.getElementById('clientActionPanelEntry');
        const panelReserve = document.getElementById('clientActionPanelReserve');

        if (tab === 'entry') {
            if (btnEntry) btnEntry.classList.add('active');
            if (btnReserve) btnReserve.classList.remove('active');
            if (panelEntry) panelEntry.style.display = 'block';
            if (panelReserve) panelReserve.style.display = 'none';
        } else {
            if (btnEntry) btnEntry.classList.remove('active');
            if (btnReserve) btnReserve.classList.add('active');
            if (panelEntry) panelEntry.style.display = 'none';
            if (panelReserve) panelReserve.style.display = 'block';
            calculateReservationCost();
        }
    }

    function onClientVehicleTypeChange(type) {
        const selfType = document.getElementById('clientSelfType');
        const resType = document.getElementById('reserveType');
        if (selfType) selfType.value = type;
        if (resType) resType.value = type;

        filterClientBaysByCategory(type);
        filterAvailableBaysForClientSelf();
        filterAvailableBaysForReservation();
        calculateReservationCost();
    }

    function filterClientBaysByCategory(category) {
        currentClientCategoryFilter = category;

        const btns = {
            'ALL': 'catBtnAll',
            'Automóvil': 'catBtnAuto',
            'Eléctrico EV': 'catBtnEV',
            'Motocicleta': 'catBtnMoto',
            'Camioneta': 'catBtnSUV'
        };

        Object.entries(btns).forEach(([cat, btnId]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (cat === category) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });

        renderClientCategorizedMap();
    }

    function renderClientCategorizedMap() {
        const container = document.getElementById('clientCategorizedBaysContainer');
        if (!container) return;

        let spotsList = saasState.spots || [];
        if (currentClientCategoryFilter !== 'ALL') {
            spotsList = spotsList.filter(s => s.tipoPermitido === currentClientCategoryFilter);
        }

        const countAll = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE').length;
        const countAuto = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === 'Automóvil').length;
        const countEV = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === 'Eléctrico EV').length;
        const countMoto = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === 'Motocicleta').length;
        const countSUV = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === 'Camioneta').length;

        const elAll = document.getElementById('catCountAll'); if (elAll) elAll.textContent = countAll;
        const elAuto = document.getElementById('catCountAuto'); if (elAuto) elAuto.textContent = countAuto;
        const elEV = document.getElementById('catCountEV'); if (elEV) elEV.textContent = countEV;
        const elMoto = document.getElementById('catCountMoto'); if (elMoto) elMoto.textContent = countMoto;
        const elSUV = document.getElementById('catCountSUV'); if (elSUV) elSUV.textContent = countSUV;

        if (spotsList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:2rem; color:var(--text-muted);">No hay bahías registradas para esta categoría.</div>`;
            return;
        }

        container.innerHTML = spotsList.map(s => {
            const isAvailable = (s.estado === 'DISPONIBLE');
            const isReserved = (s.estado === 'RESERVADO');
            const isOccupied = (s.estado === 'OCUPADO');

            const stateClass = isAvailable ? 'bay-disponible' : isReserved ? 'bay-reservado' : 'bay-ocupado';
            const isSelected = (selectedClientBayCode === s.codigo);

            const icon = s.tipoPermitido === 'Automóvil' ? '🚗' : s.tipoPermitido === 'Eléctrico EV' ? '⚡' : s.tipoPermitido === 'Motocicleta' ? '🏍️' : '🚙';
            const stateLabel = isAvailable ? 'Libre' : isReserved ? 'Reservado' : 'Ocupado';

            return `
                <div class="bay-cell ${stateClass} ${isSelected ? 'bay-selected-target' : ''}" 
                     onclick="selectBayForClient('${s.codigo}', '${s.tipoPermitido}', '${s.estado}')"
                     style="cursor:pointer;"
                     title="${s.codigo} · ${s.zona} (${s.estado})">
                    <div style="font-size:0.9rem; margin-bottom:0.2rem;">${icon}</div>
                    <div class="bay-code">${s.codigo}</div>
                    <div class="bay-plate-text">${s.placaActual || (isReserved ? 'RESERVA' : s.tipoPermitido)}</div>
                    <span class="bay-state-tag">${stateLabel}</span>
                </div>
            `;
        }).join('');
    }

    function selectBayForClient(codigo, tipo, estado) {
        if (estado === 'OCUPADO') {
            alert(`La bahía ${codigo} está actualmente ocupada por otro vehículo. Por favor selecciona una bahía libre (verde).`);
            return;
        }

        if (estado === 'BLOQUEADO') {
            alert(`La bahía ${codigo} se encuentra en mantenimiento.`);
            return;
        }

        selectedClientBayCode = codigo;

        // Auto-seleccionar en formulario de entrada
        const selfBay = document.getElementById('clientSelfBay');
        const selfType = document.getElementById('clientSelfType');
        if (selfType) selfType.value = tipo;
        filterAvailableBaysForClientSelf();
        if (selfBay) {
            let exists = Array.from(selfBay.options).some(o => o.value === codigo);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = codigo;
                opt.textContent = `${codigo} (${tipo})`;
                selfBay.appendChild(opt);
            }
            selfBay.value = codigo;
        }

        // Auto-seleccionar en formulario de reserva
        const resBay = document.getElementById('reserveBay');
        const resType = document.getElementById('reserveType');
        if (resType) resType.value = tipo;
        filterAvailableBaysForReservation();
        if (resBay) {
            let exists = Array.from(resBay.options).some(o => o.value === codigo);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = codigo;
                opt.textContent = `${codigo} (${tipo})`;
                resBay.appendChild(opt);
            }
            resBay.value = codigo;
        }

        renderClientCategorizedMap();
        calculateReservationCost();

        showRbacToast(`📍 Bahía <strong>${codigo}</strong> (${tipo}) seleccionada en tu formulario.`, false);
    }

    function filterAvailableBaysForReservation() {
        const typeSelect = document.getElementById('reserveType');
        const baySelect = document.getElementById('reserveBay');
        if (!typeSelect || !baySelect) return;

        const selectedType = typeSelect.value;
        const available = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === selectedType);

        baySelect.innerHTML = '';
        if (available.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = `No hay bahías libres para ${selectedType}`;
            baySelect.appendChild(opt);
            return;
        }

        available.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = `${b.codigo} (${b.zona} · ${b.nivel})`;
            baySelect.appendChild(opt);
        });

        if (selectedClientBayCode) {
            baySelect.value = selectedClientBayCode;
        }
    }

    function onReservationModalityChange() {
        const modality = document.getElementById('reserveModality')?.value || 'HORAS';
        const wrap = document.getElementById('reserveDurationWrap');
        const label = document.getElementById('reserveDurationLabel');
        const select = document.getElementById('reserveDurationUnits');

        if (!wrap || !select) return;

        if (modality === 'HORAS') {
            wrap.style.display = 'block';
            label.textContent = 'Cantidad de Horas';
            select.innerHTML = `
                <option value="1">1 Hora</option>
                <option value="2" selected>2 Horas</option>
                <option value="3">3 Horas</option>
                <option value="4">4 Horas</option>
                <option value="6">6 Horas</option>
                <option value="8">8 Horas</option>
                <option value="12">12 Horas</option>
            `;
        } else if (modality === 'NOCHE') {
            wrap.style.display = 'block';
            label.textContent = 'Horario Nocturno';
            select.innerHTML = `
                <option value="1" selected>1 Noche (7:00 PM a 7:00 AM)</option>
                <option value="2">2 Noches Consecutivas</option>
                <option value="3">3 Noches Consecutivas</option>
            `;
        } else if (modality === 'DIA') {
            wrap.style.display = 'none';
        } else if (modality === 'DIAS') {
            wrap.style.display = 'block';
            label.textContent = 'Cantidad de Días';
            select.innerHTML = `
                <option value="2" selected>2 Días Continuos</option>
                <option value="3">3 Días Continuos</option>
                <option value="4">4 Días Continuos</option>
                <option value="5">5 Días Continuos</option>
                <option value="7">1 Semana Completa (7 Días)</option>
            `;
        }

        calculateReservationCost();
    }

    function calculateReservationCost() {
        const type = document.getElementById('reserveType')?.value || 'Automóvil';
        const modality = document.getElementById('reserveModality')?.value || 'HORAS';
        const units = parseInt(document.getElementById('reserveDurationUnits')?.value || '1', 10);
        const costEl = document.getElementById('reserveCostEstimate');

        if (!costEl) return;

        const hourlyRates = { 'Automóvil': 5800, 'Eléctrico EV': 5000, 'Motocicleta': 3400, 'Camioneta': 7200 };
        const dailyRates = { 'Automóvil': 42000, 'Eléctrico EV': 38000, 'Motocicleta': 24000, 'Camioneta': 52000 };
        const nightRates = { 'Automóvil': 28000, 'Eléctrico EV': 25000, 'Motocicleta': 16000, 'Camioneta': 34000 };

        let total = 0;
        if (modality === 'HORAS') {
            total = (hourlyRates[type] || 5800) * units;
        } else if (modality === 'NOCHE') {
            total = (nightRates[type] || 28000) * units;
        } else if (modality === 'DIA') {
            total = (dailyRates[type] || 42000);
        } else if (modality === 'DIAS') {
            total = (dailyRates[type] || 42000) * units;
        }

        costEl.textContent = `$${total.toLocaleString('es-CO')} COP`;
    }

    function handleClientReservationSubmit(e) {
        if (e) e.preventDefault();
        const plateInput = document.getElementById('reservePlate');
        const typeSelect = document.getElementById('reserveType');
        const baySelect = document.getElementById('reserveBay');
        const modalitySelect = document.getElementById('reserveModality');
        const startInput = document.getElementById('reserveStartTime');
        const costText = document.getElementById('reserveCostEstimate')?.textContent || '$0 COP';
        const owner = currentAuthSession?.nombre || 'Cliente Registrado';

        const plate = plateInput ? plateInput.value.trim().toUpperCase() : '';
        const type = typeSelect ? typeSelect.value : 'Automóvil';
        const bay = baySelect ? baySelect.value : '';
        const modality = modalitySelect ? modalitySelect.value : 'HORAS';
        const startTime = startInput && startInput.value ? startInput.value : new Date().toISOString();

        if (!plate) { alert('Por favor ingresa la placa del vehículo.'); return; }
        if (!bay) { alert('Por favor selecciona una bahía de parqueo disponible.'); return; }

        const spot = (saasState.spots || []).find(s => s.codigo === bay);
        if (!spot || spot.estado !== 'DISPONIBLE') {
            alert(`La bahía ${bay} no está disponible para reserva.`);
            return;
        }

        spot.estado = 'RESERVADO';
        spot.placaActual = plate;

        const resCode = 'RES-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        const reservation = {
            id: 'R-' + Date.now(),
            codigo: resCode,
            placa: plate,
            tipoVehiculo: type,
            spotCodigo: bay,
            modalidad: modality,
            inicio: startTime,
            costo: costText,
            clienteNombre: owner,
            creadaEn: new Date().toISOString()
        };

        let storedRes = [];
        try {
            storedRes = JSON.parse(localStorage.getItem('parkflow_reservations') || '[]');
        } catch (err) {}
        storedRes.unshift(reservation);
        localStorage.setItem('parkflow_reservations', JSON.stringify(storedRes));

        renderClientCategorizedMap();
        renderBayMatrix();
        renderClientReservations();
        filterAvailableBaysForClientSelf();
        filterAvailableBaysForReservation();

        showReservationReceipt(reservation);
        showRbacToast(`🎉 ¡Reserva <strong>${resCode}</strong> confirmada en bahía <strong>${bay}</strong>!`, false);
    }

    function showReservationReceipt(res) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Comprobante de Reserva Anticipada';
        const html = `
            <div class="saas-receipt" style="border: 2px dashed #f59e0b;">
                <div class="receipt-brand" style="color:#f59e0b;">PARKFLOW RESERVAS</div>
                <div class="receipt-sub">RESERVA CONFIRMADA · CONTROL DE ACCESO</div>
                <div class="receipt-line"><span>CÓDIGO RESERVA:</span><strong style="color:#f59e0b; font-size:1.1rem;">${res.codigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.1rem;">${res.placa}</strong></div>
                <div class="receipt-line"><span>VEHÍCULO:</span><span>${res.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA ASIGNADA:</span><strong style="color:#10b981; font-size:1.15rem;">${res.spotCodigo}</strong></div>
                <div class="receipt-line"><span>FECHA & HORA INICIO:</span><span>${new Date(res.inicio).toLocaleString('es-CO')}</span></div>
                <div class="receipt-line"><span>MODALIDAD:</span><strong>${res.modalidad}</strong></div>
                <div class="receipt-line"><span>TITULAR:</span><span>${res.clienteNombre}</span></div>
                <div class="receipt-line" style="border-top:1px dashed #cbd5e1; padding-top:0.5rem; margin-top:0.5rem;">
                    <span>VALOR APROBADO:</span><strong style="color:#f59e0b; font-size:1.15rem;">${res.costo}</strong>
                </div>
                <div style="text-align:center; margin-top:1.25rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem;">
                    <div style="font-family:'JetBrains Mono'; font-size:1.5rem; letter-spacing:4px; margin-bottom:0.4rem;">|||| | ||||| || |||</div>
                    <div style="font-size:0.7rem; color:#64748b;">Presenta este código al ingresar a las instalaciones</div>
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceipt');
    }

    function cancelClientReservation(resId) {
        if (!confirm('¿Deseas cancelar esta reserva y liberar la bahía?')) return;

        let storedRes = [];
        try {
            storedRes = JSON.parse(localStorage.getItem('parkflow_reservations') || '[]');
        } catch (err) {}

        const res = storedRes.find(r => r.id === resId);
        if (res) {
            const spot = (saasState.spots || []).find(s => s.codigo === res.spotCodigo);
            if (spot && spot.estado === 'RESERVADO') {
                spot.estado = 'DISPONIBLE';
                spot.placaActual = null;
            }
        }

        storedRes = storedRes.filter(r => r.id !== resId);
        localStorage.setItem('parkflow_reservations', JSON.stringify(storedRes));

        renderClientCategorizedMap();
        renderBayMatrix();
        renderClientReservations();
        filterAvailableBaysForClientSelf();
        filterAvailableBaysForReservation();

        showRbacToast('Reserva cancelada. La bahía ha sido liberada a disponible.', true);
    }

    function renderClientReservations() {
        const container = document.getElementById('clientReservationsList');
        const badge = document.getElementById('clientReservationsCountBadge');
        if (!container) return;

        let storedRes = [];
        try {
            storedRes = JSON.parse(localStorage.getItem('parkflow_reservations') || '[]');
        } catch (err) {}

        if (badge) badge.textContent = `${storedRes.length} Activas`;

        if (storedRes.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem; background:rgba(0,0,0,0.2); border-radius:var(--radius-md);">
                    No tienes reservas activas en este momento. Selecciona una bahía en el mapa para reservar con anticipación.
                </div>
            `;
            return;
        }

        container.innerHTML = storedRes.map(r => `
            <div class="reservation-card-item">
                <div style="display:flex; align-items:center; gap:0.85rem;">
                    <div style="width:38px; height:38px; border-radius:var(--radius-md); background:rgba(245,158,11,0.15); color:var(--amber); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                        📅
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span class="plate-pill">${r.placa}</span>
                            <span style="font-weight:800; color:var(--amber); font-family:'JetBrains Mono';">${r.codigo}</span>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                            Bahía: <strong style="color:var(--emerald);">${r.spotCodigo}</strong> · Modalidad: <strong>${r.modalidad}</strong> · Inicio: <strong>${new Date(r.inicio).toLocaleString('es-CO')}</strong>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.65rem;">
                    <span style="font-weight:800; color:var(--text-heading); font-family:'JetBrains Mono'; font-size:0.9rem;">${r.costo}</span>
                    <button type="button" class="btn btn-secondary btn-sm" onclick='showReservationReceipt(${JSON.stringify(r)})' title="Ver Comprobante">
                        Ver Ticket
                    </button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="cancelClientReservation('${r.id}')" title="Cancelar Reserva">
                        Cancelar
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.switchClientActionTab = switchClientActionTab;
    window.onClientVehicleTypeChange = onClientVehicleTypeChange;
    window.filterClientBaysByCategory = filterClientBaysByCategory;
    window.renderClientCategorizedMap = renderClientCategorizedMap;
    window.selectBayForClient = selectBayForClient;
    window.filterAvailableBaysForReservation = filterAvailableBaysForReservation;
    window.onReservationModalityChange = onReservationModalityChange;
    window.calculateReservationCost = calculateReservationCost;
    window.handleClientReservationSubmit = handleClientReservationSubmit;
    window.showReservationReceipt = showReservationReceipt;
    window.cancelClientReservation = cancelClientReservation;
    window.renderClientReservations = renderClientReservations;

    // Renderizar Matriz 2D de Bahías
    function renderBayMatrix() {
        const zones = {
            'Zona A · Estándar': [],
            'Zona B · EV & VIP': [],
            'Zona C · Motos': [],
            'Zona D · Camionetas': []
        };

        saasState.spots.forEach(s => {
            if (zones[s.zona]) zones[s.zona].push(s);
        });

        const container = document.getElementById('saasZonesContainer');
        container.innerHTML = '';

        for (const [zoneName, spots] of Object.entries(zones)) {
            const zDiv = document.createElement('div');
            zDiv.className = 'zone-box';

            const freeCount = spots.filter(s => s.estado === 'DISPONIBLE').length;

            const baysHtml = spots.map(s => {
                const stateClass = s.estado === 'DISPONIBLE' ? 'bay-disponible' : s.estado === 'OCUPADO' ? 'bay-ocupado' : 'bay-bloqueado';
                return `
                    <div class="bay-cell ${stateClass}" onclick="handleBayClick('${s.id}', '${s.codigo}', '${s.estado}')">
                        <div class="bay-code">${s.codigo}</div>
                        <div class="bay-plate-text">${s.placaActual || '—'}</div>
                        <span class="bay-state-tag">${s.estado}</span>
                    </div>
                `;
            }).join('');

            zDiv.innerHTML = `
                <div class="zone-header-row">
                    <span class="zone-title">${zoneName}</span>
                    <span class="status-badge badge-active-live">${freeCount}/${spots.length} Libres</span>
                </div>
                <div class="bays-matrix">${baysHtml}</div>
            `;
            container.appendChild(zDiv);
        }
    }

    async function handleBayClick(id, code, state) {
        if (saasState.currentRole === 'Cliente') {
            const spot = (saasState.spots || []).find(s => s.codigo === code);
            if (state === 'DISPONIBLE') {
                selectBayForClient(code, spot ? spot.tipoPermitido : 'Automóvil', state);
                switchSaasView('view-client-portal');
                showRbacToast(`📍 Bahía <strong>${code}</strong> seleccionada. Elige 'Registrar Entrada' o 'Reservar'.`, false);
            } else if (state === 'OCUPADO') {
                alert(`La bahía ${code} está actualmente ocupada por otro vehículo.`);
            } else {
                alert(`La bahía ${code} se encuentra en estado: ${state}.`);
            }
            return;
        }

        if (state === 'OCUPADO') {
            const ticket = saasState.tickets.find(t => t.spotCodigo === code && t.estado === 'ACTIVO');
            if (ticket) openCheckOutModal(ticket.id);
            return;
        }

        if (!confirm(`¿Alternar estado de bahía ${code}? (Disponible <-> Mantenimiento/Bloqueado)`)) return;

        try {
            await fetch(`${API_BASE}/spots.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, toggleMantenimiento: true })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Renderizar Tarifas
    function renderRatesTable() {
        const tbody = document.getElementById('saasRatesTableBody');
        tbody.innerHTML = saasState.rates.map(r => `
            <tr>
                <td><strong style="color:var(--text-heading);">${r.tipoVehiculo}</strong></td>
                <td><span style="font-family:'JetBrains Mono';">$${r.tarifaPorMinuto}</span></td>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--primary);">$${r.tarifaPorHora.toLocaleString('es-CO')}</span></td>
                <td><span style="font-family:'JetBrains Mono';">$${r.tarifaPlenaDia.toLocaleString('es-CO')}</span></td>
                <td>${r.fraccionGraciaMin} min</td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${r.actualizadoEn}</td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="editRateModal('${r.id}', '${r.tipoVehiculo}', ${r.tarifaPorHora}, ${r.tarifaPorMinuto})">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function editRateModal(id, tipo, curH, curM) {
        const newH = prompt(`Nueva tarifa por hora para ${tipo} (COP):`, curH);
        if (!newH || isNaN(newH)) return;
        const newM = prompt(`Nueva tarifa por minuto para ${tipo} (COP):`, curM);
        if (!newM || isNaN(newM)) return;

        try {
            await fetch(`${API_BASE}/rates.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, tarifaPorHora: parseFloat(newH), tarifaPorMinuto: parseFloat(newM) })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error actualizando tarifa: ' + e.message);
        }
    }

    // Renderizar Usuarios
    function renderUsersTable() {
        const tbody = document.getElementById('saasUsersTableBody');
        tbody.innerHTML = saasState.users.map(u => `
            <tr>
                <td><span style="font-family:'JetBrains Mono'; color:var(--text-muted);">${u.id}</span></td>
                <td><strong style="color:var(--text-heading);">${u.nombre}</strong></td>
                <td>${u.email}</td>
                <td>
                    <span class="status-badge ${u.rol==='Administrador'?'pill-emerald':u.rol==='Operador'?'pill-primary':'status-badge'}">
                        ${u.rol}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${u.activo ? 'badge-completed' : 'badge-blocked'}">
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${u.ultimoAcceso}</td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="toggleUserStatus('${u.id}')">
                        ${u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function toggleUserStatus(id) {
        try {
            await fetch(`${API_BASE}/users.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, toggleActivo: true })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    async function handleNewUserSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('nuName').value.trim();
        const email = document.getElementById('nuEmail').value.trim();
        const role = document.getElementById('nuRole').value;
        const plate = document.getElementById('nuPlate').value.trim();

        try {
            const res = await fetch(`${API_BASE}/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: name, email, rol: role, placaAsociada: plate })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error al crear usuario.');
                return;
            }
            closeSaasModal('modalNewUser');
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Renderizar Auditoría
    function renderAuditTable() {
        const tbody = document.getElementById('saasAuditTableBody');
        tbody.innerHTML = saasState.audit.slice(0, 30).map(a => `
            <tr>
                <td style="white-space:nowrap; font-family:'JetBrains Mono'; font-size:0.75rem; color:var(--text-muted);">${a.timestamp}</td>
                <td><strong>${a.usuarioEmail}</strong></td>
                <td>${a.rol}</td>
                <td><span style="color:var(--primary); font-weight:700;">${a.modulo}</span></td>
                <td>${a.accion}</td>
                <td style="font-size:0.78rem;">${a.detalle}</td>
                <td><span class="status-badge ${a.resultado==='OK'?'badge-completed':'badge-blocked'}">${a.resultado}</span></td>
            </tr>
        `).join('');
    }

    // Renderizar Historial de Estancias
    function renderCompletedTable() {
        const completed = saasState.tickets.filter(t => t.estado === 'FINALIZADO');
        const tbody = document.getElementById('saasCompletedTableBody');

        if (completed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">Sin estancias finalizadas registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = completed.map(t => `
            <tr>
                <td><strong style="color:var(--primary); font-family:'JetBrains Mono';">${t.ticketCodigo}</strong></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.spotCodigo}</td>
                <td>${t.minutosTranscurridos || 0} min</td>
                <td><strong style="color:var(--emerald);">$${(t.valorPagado || 0).toLocaleString('es-CO')}</strong></td>
                <td>${t.metodoPago || '—'}</td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${new Date(t.fechaSalida || t.fechaIngreso).toLocaleString('es-CO')}</td>
            </tr>
        `).join('');
    }

    // Portal del Cliente - Búsqueda
    function handleSaasClientSearch() {
        const plate = document.getElementById('saasClientPlateSearch').value.trim().toUpperCase();
        const card = document.getElementById('saasClientResultCard');

        if (!plate) {
            alert('Ingresa una placa.');
            return;
        }

        const active = saasState.tickets.find(t => t.estado === 'ACTIVO' && t.placa === plate);
        if (!active) {
            card.style.display = 'block';
            card.innerHTML = `
                <div style="color:var(--rose); font-weight:700; margin-bottom:0.25rem;">Vehículo no encontrado</div>
                <p style="font-size:0.8rem; color:var(--text-muted);">La placa <strong>${plate}</strong> no tiene ingreso activo vigente en el parqueadero.</p>
            `;
            return;
        }

        const mins = Math.max(1, Math.round((Date.now() - new Date(active.fechaIngreso).getTime()) / 60000));
        const calc = calculateStayFee(active.tipoVehiculo, mins, 'MINUTE');

        card.style.display = 'block';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                <div>
                    <span class="plate-pill" style="font-size:1.25rem;">${active.placa}</span>
                    <span style="margin-left:0.5rem; color:var(--primary); font-size:0.85rem; font-weight:700;">${active.tipoVehiculo}</span>
                </div>
                <span class="status-badge badge-active-live">Estancia en Curso</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.75rem; margin-bottom:1rem;">
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Bahía Asignada</div>
                    <div style="font-size:1.25rem; font-weight:800; color:var(--emerald);">${active.spotCodigo}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Hora Ingreso</div>
                    <div style="font-size:1rem; font-weight:700; color:var(--text-heading);">${new Date(active.fechaIngreso).toLocaleTimeString('es-CO')}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Tiempo Transcurrido</div>
                    <div style="font-size:1.25rem; font-weight:800; color:var(--primary);">${mins} mins</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Tarifa por Minuto</div>
                    <div style="font-size:1.1rem; font-weight:800; color:var(--text-heading);">$${calc.ratePerMinute.toLocaleString('es-CO')}/min</div>
                </div>
            </div>
            <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem 1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Total Acumulado a Cobrar por Minutos:</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); font-family:'JetBrains Mono';">${calc.formula}</div>
                </div>
                <div style="font-size:1.5rem; font-weight:900; color:var(--emerald); font-family:'JetBrains Mono';">
                    $${calc.total.toLocaleString('es-CO')} COP
                </div>
            </div>
            <div style="margin-top:0.75rem; text-align:right;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="handleSaasClientSearch()" style="font-size:0.75rem;">
                    🔄 Recalcular Minutos en Vivo
                </button>
            </div>
        `;
    }

    // Buscador Global en Topbar
    function handleGlobalSearch(term) {
        if (!term.trim()) return;
        switchSaasView('view-operations');
        const input = document.getElementById('operationsFilterInput');
        if (input) {
            input.value = term;
            filterOperationsTable(term);
        }
    }

    // Restablecer DB desde SaaS
    async function resetDatabaseFromSaas() {
        if (!confirm('¿Restablecer la base de datos `parkflow_db` en MySQL con los datos de fábrica?')) return;
        try {
            const res = await fetch(`${API_BASE}/setup.php`);
            const data = await res.json();
            if (data.success) {
                alert('Base de datos restablecida con éxito en MySQL.');
                closeSaasModal('modalXamppDiagnostics');
                await syncAllFromDatabase();
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Exportar funciones a window para soporte completo de eventos inline HTML
    window.calculateStayFee = calculateStayFee;
    window.openCheckOutModal = openCheckOutModal;
    window.setCheckOutCalculationMode = setCheckOutCalculationMode;
    window.onCheckOutMinutesInputChange = onCheckOutMinutesInputChange;
    window.adjustCheckOutMinutes = adjustCheckOutMinutes;
    window.resetCheckOutToRealTime = resetCheckOutToRealTime;
    window.recalculateCheckOutAmount = recalculateCheckOutAmount;
    window.confirmCheckOutPayment = confirmCheckOutPayment;
    window.showCheckOutReceipt = showCheckOutReceipt;
    window.openMinuteCalculatorModal = openMinuteCalculatorModal;
    window.updateModalMinuteCalculation = updateModalMinuteCalculation;
    window.onModalCalcMinutesInputChange = onModalCalcMinutesInputChange;
    window.onModalCalcMinutesRangeChange = onModalCalcMinutesRangeChange;
    window.setModalCalcMinutes = setModalCalcMinutes;
    window.updatePortalMinuteCalculation = updatePortalMinuteCalculation;
    window.onPortalMinutesInputChange = onPortalMinutesInputChange;
    window.onPortalMinutesRangeChange = onPortalMinutesRangeChange;
    window.setPortalMinutes = setPortalMinutes;
    window.handleSaasClientSearch = handleSaasClientSearch;
    window.handleGlobalSearch = handleGlobalSearch;
    window.resetDatabaseFromSaas = resetDatabaseFromSaas;

    // Inicializar al cargar el DOM
    window.addEventListener('DOMContentLoaded', () => {
        checkAuthSession();
        syncAllFromDatabase();
        updatePortalMinuteCalculation();
        // Polling cada 12 segundos para actualizar métricas en vivo
        setInterval(syncAllFromDatabase, 12000);
    });