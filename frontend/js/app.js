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
        pendingCheckOutTicket: null
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
                'view-client-portal'
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
                'view-client-portal'
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
                'view-matrix'
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
        'view-client-portal': { name: 'Portal Ciudadano', minRole: 'Cliente' }
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
            'view-client-portal': 'Portal Ciudadano'
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
        renderOperationsTable();
        renderBayMatrix();
        renderRatesTable();
        renderUsersTable();
        renderAuditTable();
        renderCompletedTable();
    }

    // Renderizar KPIs
    function renderKpis() {
        const total = saasState.spots.length;
        const occupied = saasState.spots.filter(s => s.estado === 'OCUPADO').length;
        const free = total - occupied;
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

        // Total revenue
        const completed = saasState.tickets.filter(t => t.estado === 'FINALIZADO');
        const revenue = completed.reduce((sum, t) => sum + (parseFloat(t.valorPagado) || 0), 0);

        // Nocturnos
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO');
        const midnightCount = active.filter(t => t.cruzoMedianoche).length;

        document.getElementById('kpiTotalRevenue').textContent = `$${revenue.toLocaleString('es-CO')}`;
        document.getElementById('kpiOccupancyPct').textContent = `${pct}%`;
        document.getElementById('kpiOccupiedSpotsText').textContent = `${occupied} ocupados`;
        document.getElementById('kpiFreeSpotsText').textContent = `${free} disponibles`;
        document.getElementById('kpiOccupancyBar').style.width = `${pct}%`;
        document.getElementById('kpiActiveVehicles').textContent = active.length;
        document.getElementById('kpiMidnightCount').textContent = `${midnightCount} nocturnos`;
        document.getElementById('sidebarActiveStaysBadge').textContent = active.length;
    }

    // Renderizar tabla en Overview
    function renderOverviewTable() {
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO').slice(0, 5);
        const tbody = document.getElementById('overviewActiveTableBody');

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

    // Modal de Cobro / Salida
    function openCheckOutModal(ticketId) {
        const ticket = saasState.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        saasState.pendingCheckOutTicket = ticket;

        const rate = saasState.rates.find(r => r.tipoVehiculo === ticket.tipoVehiculo) || {
            tarifaPorMinuto: 110,
            tarifaPorHora: 5800,
            tarifaPlenaDia: 42000,
            fraccionGraciaMin: 5
        };

        const entryTime = new Date(ticket.fechaIngreso).getTime();
        const mins = Math.max(1, Math.round((Date.now() - entryTime) / 60000));

        let amount = 0;
        if (ticket.cruzoMedianoche || mins >= 720) {
            amount = rate.tarifaPlenaDia;
        } else if (mins <= rate.fraccionGraciaMin) {
            amount = 0;
        } else {
            const h = Math.floor(mins / 60);
            const rem = mins % 60;
            amount = (h * rate.tarifaPorHora) + (rem * rate.tarifaPorMinuto);
            if (amount > rate.tarifaPlenaDia) amount = rate.tarifaPlenaDia;
        }

        saasState.pendingCheckOutTicket.calculatedMinutes = mins;
        saasState.pendingCheckOutTicket.calculatedAmount = amount;

        document.getElementById('coPlateDisplay').textContent = ticket.placa;
        document.getElementById('coBayDisplay').textContent = ticket.spotCodigo;
        document.getElementById('coDurationDisplay').textContent = `${mins} minutos (${(mins/60).toFixed(1)} hrs)`;
        document.getElementById('coTotalAmountDisplay').textContent = `$${amount.toLocaleString('es-CO')} COP`;

        openSaasModal('modalCheckOut');
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
            showCheckOutReceipt(data.data);
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error al liquidar cobro en MySQL: ' + e.message);
        }
    }

    function showCheckOutReceipt(ticket) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Factura Electrónica Equivalente';
        const html = `
            <div class="saas-receipt">
                <div class="receipt-brand">PARKFLOW CLOUD</div>
                <div class="receipt-sub">FACTURA Y RECIBO DE PAGO · MYSQL AUDITED</div>
                <div class="receipt-line"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.15rem;">${ticket.placa}</strong></div>
                <div class="receipt-line"><span>TIPO VEHÍCULO:</span><span>${ticket.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA LIBERADA:</span><strong>${ticket.spotCodigo}</strong></div>
                <div class="receipt-line"><span>DURACIÓN TOTAL:</span><span>${ticket.minutosTranscurridos} minutos</span></div>
                <div class="receipt-line"><span>MÉTODO PAGO:</span><span>${ticket.metodoPago}</span></div>
                <div class="receipt-line"><span>FECHA SALIDA:</span><span>${new Date(ticket.fechaSalida).toLocaleString('es-CO')}</span></div>
                <div class="receipt-total-bar">
                    <span>TOTAL PAGADO:</span>
                    <span style="color:#10b981;">$${(ticket.valorPagado || 0).toLocaleString('es-CO')} COP</span>
                </div>
                <div style="text-align:center; margin-top:1rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem; font-size:0.72rem; color:#64748b;">
                    ¡Gracias por usar ParkFlow! Bahía liberada en MySQL.
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceiptSaas');
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
                <p style="font-size:0.8rem; color:var(--text-muted);">La placa <strong>${plate}</strong> no tiene ingreso activo vigente.</p>
            `;
            return;
        }

        const mins = Math.max(1, Math.round((Date.now() - new Date(active.fechaIngreso).getTime()) / 60000));
        card.style.display = 'block';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                <div>
                    <span class="plate-pill" style="font-size:1.25rem;">${active.placa}</span>
                    <span style="margin-left:0.5rem; color:var(--primary); font-size:0.85rem;">${active.tipoVehiculo}</span>
                </div>
                <span class="status-badge badge-active-live">Estancia en Curso</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem;">
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Bahía Asignada</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--emerald);">${active.spotCodigo}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Hora Ingreso</div>
                    <div style="font-size:1rem; font-weight:700; color:var(--text-heading);">${new Date(active.fechaIngreso).toLocaleTimeString('es-CO')}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Tiempo Actual</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--primary);">${mins} mins</div>
                </div>
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

    // Inicializar al cargar el DOM
    window.addEventListener('DOMContentLoaded', () => {
        checkAuthSession();
        syncAllFromDatabase();
        // Polling cada 12 segundos para actualizar métricas en vivo
        setInterval(syncAllFromDatabase, 12000);
    });