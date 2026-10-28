        // =========================================================================
    // Sistema de Autenticación y Control de Sesión
    // =========================================================================
    const REGISTERED_ACCOUNTS = [
        {
            email: 'admin@parkflow.co',
            password: 'admin',
            nombre: 'Alejandro Vargas',
            rol: 'Administrador',
            placa: null
        },
        {
            email: 'operador@parkflow.co',
            password: 'oper',
            nombre: 'Camila Mendoza',
            rol: 'Operador',
            placa: null
        },
        {
            email: '',
            password: '',
            nombre: 'Conductor Ciudadano',
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

    function showAuthScreen() {
        const overlay = document.getElementById('saasAuthScreen');
        if (overlay) overlay.style.display = 'flex';
    }

    function showAuthError(message) {
        const errBox = document.getElementById('authErrorMsg');
        if (!errBox) return;
        errBox.textContent = message;
        errBox.style.display = 'block';
        errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideAuthError() {
        const errBox = document.getElementById('authErrorMsg');
        if (errBox) errBox.style.display = 'none';
    }

    function syncRoleSelection(role) {
        hideAuthError();
        const emailInput = document.getElementById('authInputEmail');
        const emailHint = document.getElementById('authEmailHint');
        const passHint = document.getElementById('authPassHint');
        const passInput = document.getElementById('authInputPassword');

        if (role === 'Administrador') {
            if (emailInput) emailInput.value = 'admin@parkflow.co';
            if (emailHint) emailHint.textContent = 'Diana Katerine Pérez (Única Admin)';
            if (passHint) passHint.textContent = 'Obligatoria · Contraseña Maestra';
        } else if (role === 'Operador') {
            if (emailInput) emailInput.value = 'operador@parkflow.co';
            if (emailHint) emailHint.textContent = 'Carlos Mendoza (Operador)';
            if (passHint) passHint.textContent = 'Obligatoria · Clave de Turno';
        } else if (role === 'Cliente') {
            if (emailInput) {
                emailInput.value = '';
                emailInput.placeholder = 'Ingresa tu correo o usuario registrado...';
                emailInput.focus();
            }
            if (emailHint) emailHint.textContent = 'Libre · Ingresa tus credenciales';
            if (passHint) passHint.textContent = 'Ingresa tu contraseña de cliente';
        }
        if (passInput) passInput.value = '';
    }

    function focusRecoveryField() {
        const card = document.getElementById('authRecoveryCard');
        const inp = document.getElementById('authRecoveryEmail');
        if (card) {
            card.classList.add('highlight-focus');
            setTimeout(() => card.classList.remove('highlight-focus'), 1800);
        }
        if (inp) {
            const mainEmail = document.getElementById('authInputEmail');
            if (mainEmail && mainEmail.value.trim() && !inp.value.trim()) {
                inp.value = mainEmail.value.trim();
            }
            inp.focus();
            inp.select();
        }
    }

    let activeRecoveryEmail = '';

    function showRecoveryStep(step) {
        const step1 = document.getElementById('recoveryStep1');
        const step2 = document.getElementById('recoveryStep2');
        const box = document.getElementById('recoveryFeedback');
        if (box) box.style.display = 'none';

        if (step === 2) {
            if (step1) step1.style.display = 'none';
            if (step2) step2.style.display = 'block';
            const codeInp = document.getElementById('resetInputCode');
            const passInp = document.getElementById('resetInputNewPass');
            if (codeInp && !codeInp.value) {
                codeInp.focus();
            } else if (passInp) {
                passInp.focus();
            }
        } else {
            if (step2) step2.style.display = 'none';
            if (step1) step1.style.display = 'block';
            const emailInp = document.getElementById('authRecoveryEmail');
            if (emailInp) emailInp.focus();
        }
    }

    function toggleResetPassVisibility() {
        const passInput = document.getElementById('resetInputNewPass');
        if (!passInput) return;
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
    }

    async function executePasswordRecovery() {
        const inp = document.getElementById('authRecoveryEmail');
        const btn = document.getElementById('btnRecoverySubmit');
        const box = document.getElementById('recoveryFeedback');
        const email = inp ? inp.value.trim() : '';

        if (!email) {
            if (box) {
                box.style.display = 'block';
                box.className = 'recovery-feedback-box error';
                box.innerHTML = '⚠️ Por favor ingresa el correo electrónico o usuario asociado a tu cuenta.';
            }
            if (inp) inp.focus();
            return;
        }

        const origBtnText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳ Generando...</span>';
        }
        if (box) box.style.display = 'none';

        try {
            const endpoint = API_BASE + '/auth.php';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'recover_password',
                    email: email
                })
            });

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                activeRecoveryEmail = json.data.email || email;
                
                // Prellenar código en el Paso 2
                const codeInp = document.getElementById('resetInputCode');
                const codeHint = document.getElementById('resetCodeHint');
                if (codeInp) codeInp.value = json.data.codigo_seguridad;
                if (codeHint) codeHint.innerText = 'Generado: ' + json.data.codigo_seguridad;

                if (box) {
                    box.style.display = 'block';
                    box.className = 'recovery-feedback-box success';
                    box.innerHTML = `✅ <strong>Código generado:</strong> <span style="font-size:1.1em; color:#00f5ff; font-weight:bold; letter-spacing:0.1em;">${json.data.codigo_seguridad}</span> para <strong>${json.data.nombre}</strong> (${json.data.rol}).<br>` +
                        `<small style="color:var(--text-muted);">Cargando formulario de validación...</small>`;
                }

                // Transición automática al Paso 2 después de 800ms
                setTimeout(() => {
                    showRecoveryStep(2);
                    if (box) {
                        box.style.display = 'block';
                        box.className = 'recovery-feedback-box success';
                        box.innerHTML = `✅ Código <strong>${json.data.codigo_seguridad}</strong> verificado. Ingresa ahora tu nueva contraseña para acceder:`;
                    }
                }, 900);
            } else {
                if (box) {
                    box.style.display = 'block';
                    box.className = 'recovery-feedback-box error';
                    box.innerHTML = '❌ ' + (json.message || 'No fue posible procesar la recuperación de contraseña.');
                }
            }
        } catch (err) {
            console.error('Error al recuperar contraseña:', err);
            if (box) {
                box.style.display = 'block';
                box.className = 'recovery-feedback-box error';
                box.innerHTML = '❌ Error de comunicación con el servidor. Verifica que los servicios de Apache y MySQL estén activos.';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origBtnText;
            }
        }
    }

    async function executePasswordReset() {
        const codeInp = document.getElementById('resetInputCode');
        const passInp = document.getElementById('resetInputNewPass');
        const btn = document.getElementById('btnResetSubmit');
        const box = document.getElementById('recoveryFeedback');

        const code = codeInp ? codeInp.value.trim().toUpperCase() : '';
        const newPass = passInp ? passInp.value.trim() : '';

        // Determinar correo a restablecer
        let email = activeRecoveryEmail;
        if (!email) {
            const recoveryInp = document.getElementById('authRecoveryEmail');
            const mainEmailInp = document.getElementById('authInputEmail');
            email = (recoveryInp && recoveryInp.value.trim()) || (mainEmailInp && mainEmailInp.value.trim()) || 'admin@parkflow.co';
        }

        if (!code) {
            if (box) {
                box.style.display = 'block';
                box.className = 'recovery-feedback-box error';
                box.innerHTML = '⚠️ Por favor escribe el código de seguridad recibido.';
            }
            if (codeInp) codeInp.focus();
            return;
        }

        if (!newPass || newPass.length < 5) {
            if (box) {
                box.style.display = 'block';
                box.className = 'recovery-feedback-box error';
                box.innerHTML = '⚠️ La nueva contraseña debe tener mínimo 5 caracteres.';
            }
            if (passInp) passInp.focus();
            return;
        }

        const origText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳ Validando y Actualizando...</span>';
        }

        try {
            const endpoint = API_BASE + '/auth.php';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset_password',
                    email: email,
                    codigo: code,
                    nueva_password: newPass
                })
            });

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                if (box) {
                    box.style.display = 'block';
                    box.className = 'recovery-feedback-box success';
                    box.innerHTML = `🎉 <strong>¡Éxito!</strong> Contraseña actualizada correctamente. Iniciando sesión...`;
                }

                // Iniciar sesión inmediatamente con la cuenta recuperada
                setTimeout(() => {
                    loginUserSuccess(json.data);
                    showRbacToast(`¡Contraseña restablecida con éxito! Bienvenido/a <strong>${json.data.nombre}</strong>.`, false);
                }, 800);
            } else {
                if (box) {
                    box.style.display = 'block';
                    box.className = 'recovery-feedback-box error';
                    box.innerHTML = '❌ ' + (json.message || 'Código incorrecto o expirado.');
                }
            }
        } catch (err) {
            console.error('Error al restablecer contraseña:', err);
            if (box) {
                box.style.display = 'block';
                box.className = 'recovery-feedback-box error';
                box.innerHTML = '❌ Error de comunicación con el servidor MySQL.';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        }
    }

    async function handleAuthSubmit(event) {
        if (event) event.preventDefault();
        hideAuthError();

        const roleSelect = document.getElementById('authInputRole');
        const emailInput = document.getElementById('authInputEmail');
        const passInput = document.getElementById('authInputPassword');

        const role = roleSelect ? roleSelect.value : 'Administrador';
        let email = emailInput ? emailInput.value.trim() : '';
        const password = passInput ? passInput.value.trim() : '';

        // Restricción por rol: Admin y Operador REQUIEREN contraseña obligatoria
        if (role === 'Administrador') {
            if (!password) {
                showAuthError('🔒 Acceso Restringido: La contraseña de Administrador es obligatoria.');
                if (passInput) passInput.focus();
                return;
            }
            if (!email) email = 'admin@parkflow.co';
        } else if (role === 'Operador') {
            if (!password) {
                showAuthError('🔒 Acceso Restringido: La contraseña de Operador es obligatoria.');
                if (passInput) passInput.focus();
                return;
            }
            if (!email) email = 'operador@parkflow.co';
        } else if (role === 'Cliente') {
            if (!email) {
                showAuthError('⚠️ Por favor ingresa tus credenciales (correo electrónico o usuario).');
                if (emailInput) emailInput.focus();
                return;
            }
        }

        await performServerAuth(role, email, password);
    }

    async function performServerAuth(role, email, password) {
        const btnSubmit = document.querySelector('.btn-auth-submit');
        const origText = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span>⏳ Validando en Servidor...</span>';
        }

        try {
            const endpoint = API_BASE + '/auth.php';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': role
                },
                body: JSON.stringify({
                    action: 'login',
                    role: role,
                    email: email,
                    password: password
                })
            });

            const json = await res.json();

            if (res.ok && json.success && json.data) {
                loginUserSuccess(json.data);
            } else {
                showAuthError('❌ ' + (json.message || 'Error de autenticación. Verifica tus credenciales.'));
            }
        } catch (err) {
            console.error('Error de autenticación:', err);
            showAuthError('❌ Error de comunicación con el servidor MySQL. Verifica que Apache y MySQL estén iniciados en XAMPP.');
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = origText;
            }
        }
    }

    function toggleAuthPasswordVisibility() {
        const passInput = document.getElementById('authInputPassword');
        if (!passInput) return;
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
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

        // Actualizar indicador estático de sesión protegida
        const lockText = document.getElementById('sidebarLockText');
        if (lockText) lockText.textContent = `Sesión Protegida · ${account.rol}`;

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
    window.syncRoleSelection = syncRoleSelection;
    window.focusRecoveryField = focusRecoveryField;
    window.showRecoveryStep = showRecoveryStep;
    window.toggleResetPassVisibility = toggleResetPassVisibility;
    window.executePasswordRecovery = executePasswordRecovery;
    window.executePasswordReset = executePasswordReset;
    window.performServerAuth = performServerAuth;
    window.showAuthError = showAuthError;
    window.toggleAuthPasswordVisibility = toggleAuthPasswordVisibility;
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
            name: 'Diana Katerine Pérez',
            roleTitle: '👑 Super Administradora',
            email: 'admin@parkflow.co',
            avatar: 'DK',
            avatarBg: 'linear-gradient(135deg, #00f5ff, #6366f1)',
            avatarBorder: 'rgba(0, 245, 255, 0.45)',
            badge: 'Super Administradora',
            badgeClass: 'pill-emerald',
            sessionStatus: 'Sesión Activa (Control Total)',
            statusDotColor: '#10b981',
            defaultView: 'view-overview',
            allowedViews: [
                'view-overview',
                'view-operations',
                'view-matrix',
                'view-rates',
                'view-users',
                'view-audit',
                'view-patterns',
                'view-client-entry',
                'view-client-reserve',
                'view-client-payment',
                'view-client-exit',
                'view-client-bays',
                'view-client-rates'
            ],
            canCheckIn: true,
            canCheckOut: true,
            canEditRates: true,
            canManageUsers: true,
            canViewAudit: true,
            canResetDb: true
        },
        'Operador': {
            name: 'Carlos Mendoza',
            roleTitle: '👷 Operador de Patio',
            email: 'carlos.operador@parkflow.co',
            avatar: 'CM',
            avatarBg: 'linear-gradient(135deg, #10b981, #06b6d4)',
            avatarBorder: 'rgba(168, 85, 247, 0.45)',
            badge: 'Operador de Patio',
            badgeClass: 'pill-primary',
            sessionStatus: 'Turno Activo (Cabina de Entrada)',
            statusDotColor: '#10b981',
            defaultView: 'view-operations',
            allowedViews: [
                'view-operations',
                'view-matrix',
                'view-overview',
                'view-rates'
            ],
            canCheckIn: true,
            canCheckOut: true,
            canEditRates: false,
            canManageUsers: false,
            canViewAudit: false,
            canResetDb: false
        },
        'Cliente': {
            name: 'Cliente / Conductor',
            roleTitle: '👤 Cliente / Conductor',
            email: '',
            avatar: 'CL',
            avatarBg: 'linear-gradient(135deg, #a855f7, #ec4899)',
            avatarBorder: 'rgba(168, 85, 247, 0.45)',
            badge: 'Cliente / Autoservicio',
            badgeClass: 'pill-primary',
            sessionStatus: 'En Línea (Portal Autoservicio)',
            statusDotColor: '#10b981',
            defaultView: 'view-client-entry',
            allowedViews: [
                'view-client-entry',
                'view-client-reserve',
                'view-client-payment',
                'view-client-exit',
                'view-client-bays',
                'view-client-rates'
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
        'view-rates': { name: 'Matriz Tarifaria', minRole: 'Operador' },
        'view-users': { name: 'Cuentas & RBAC', minRole: 'Administrador' },
        'view-audit': { name: 'Seguridad & Logs', minRole: 'Administrador' },
        'view-patterns': { name: 'Patrones & Dominios DDD', minRole: 'Administrador' },
        'view-client-entry': { name: 'Registro de Vehículo', minRole: 'Cliente' },
        'view-client-reserve': { name: 'Mis Reservas', minRole: 'Cliente' },
        'view-client-payment': { name: 'Pago de Estadía', minRole: 'Cliente' },
        'view-client-exit': { name: 'Salida de Vehículo', minRole: 'Cliente' },
        'view-client-bays': { name: 'Bahías Disponibles', minRole: 'Cliente' },
        'view-client-rates': { name: 'Tarifas al Público', minRole: 'Cliente' }
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

        // 1. Sidebar profile card updates
        const avatar = document.getElementById('sidebarAvatar');
        const userName = document.getElementById('sidebarUserName');
        const roleTag = document.getElementById('sidebarRoleTag');
        const statusText = document.getElementById('sidebarStatusText');
        const lockText = document.getElementById('sidebarLockText');

        const activeName = (currentAuthSession && currentAuthSession.nombre) || config.name;
        const activeRole = (currentAuthSession && currentAuthSession.rol) || role;

        if (avatar) {
            const initials = activeName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || config.avatar;
            avatar.textContent = initials;
            avatar.style.background = config.avatarBg;
            avatar.style.borderColor = config.avatarBorder;
        }
        if (userName) userName.textContent = activeName;
        if (roleTag) {
            roleTag.textContent = activeRole === 'Administrador' ? '👑 Super Administradora' : (activeRole === 'Operador' ? '👷 Operador de Patio' : '👤 Cliente / Conductor');
        }
        if (statusText) statusText.textContent = config.sessionStatus;
        if (lockText) {
            lockText.textContent = `Sesión Protegida · ${activeRole}`;
        }

        // 2. Navigation items: MOSTRAR ÚNICAMENTE MÓDULOS PERMITIDOS
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
                btn.style.display = 'flex';
                btn.classList.remove('restricted');
                btn.removeAttribute('title');
                if (lockBadge) lockBadge.remove();
                if (normalBadge) normalBadge.style.display = 'inline-block';
            } else {
                // Ocultar por completo: solo mostrar a lo que tiene acceso
                btn.style.display = 'none';
                btn.classList.add('restricted');
                if (lockBadge) lockBadge.remove();
            }
        });

        // 2.1 Ocultar encabezados de sección vacíos en la barra lateral
        document.querySelectorAll('.sidebar-nav .nav-group-label').forEach(label => {
            let nextEl = label.nextElementSibling;
            let hasVisibleChild = false;
            while (nextEl && !nextEl.classList.contains('nav-group-label')) {
                if (nextEl.classList.contains('nav-item-btn') && nextEl.style.display !== 'none') {
                    hasVisibleChild = true;
                    break;
                }
                nextEl = nextEl.nextElementSibling;
            }
            label.style.display = hasVisibleChild ? 'block' : 'none';
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

        // 6. Refresh rates table buttons according to permissions
        renderRatesTable();
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

        // Reset scroll position to top
        const saasContent = document.querySelector('.saas-content');
        if (saasContent) saasContent.scrollTop = 0;

        if (btnElement) {
            btnElement.classList.add('active');
        } else {
            document.querySelectorAll('.nav-item-btn').forEach(b => {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(viewId)) {
                    b.classList.add('active');
                }
            });
        }

        // Sincronizar botones de los hubs horizontales de clientes
        document.querySelectorAll('.client-hub-btn').forEach(hubBtn => {
            const hubOnclick = hubBtn.getAttribute('onclick') || '';
            if (hubOnclick.includes(viewId)) {
                hubBtn.classList.add('active');
            } else {
                hubBtn.classList.remove('active');
            }
        });

        // Actualizar datos específicos al entrar a vistas del cliente
        if (viewId === 'view-client-entry') {
            filterAvailableBaysForClientSelf();
            renderEntryBaysMap();
            const ownerEl = document.getElementById('clientSelfOwner');
            if (ownerEl && currentAuthSession && currentAuthSession.nombre) {
                ownerEl.value = currentAuthSession.nombre;
            }
        } else if (viewId === 'view-client-reserve') {
            filterAvailableBaysForReservation();
            renderReserveBaysMap();
            renderClientReservations();
        } else if (viewId === 'view-client-bays') {
            renderClientCategorizedMap();
        } else if (viewId === 'view-client-rates') {
            updatePortalMinuteCalculation();
            renderClientHistoryTable();
        }

        // Update breadcrumb
        const breadcrumbNames = {
            'view-overview': 'Dashboard General',
            'view-operations': 'Flujo & Estancias',
            'view-matrix': 'Telemetría de Bahías',
            'view-rates': 'Matriz Tarifaria',
            'view-users': 'Cuentas & RBAC',
            'view-audit': 'Seguridad & Logs',
            'view-patterns': 'Patrones & Dominios DDD',
            'view-client-entry': 'Registro de Vehículo',
            'view-client-reserve': 'Mis Reservas',
            'view-client-payment': 'Pago de Estadía',
            'view-client-exit': 'Salida de Vehículo',
            'view-client-bays': 'Bahías Disponibles',
            'view-client-rates': 'Tarifas al Público'
        };
        const bc = document.getElementById('currentViewBreadcrumb');
        if (bc) bc.textContent = breadcrumbNames[viewId] || 'Dashboard';
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

    // Cambio de Rol RBAC - Inhabilitado por seguridad (Exige autenticación obligatoria)
    function handleRoleChange(role) {
        showRbacToast('🔒 El cambio de perfil dentro del sistema está deshabilitado por seguridad. Para acceder con otro rol debes cerrar sesión e ingresar tus credenciales.', true);
    }

    // 1. Sincronización completa con MySQL vía API PHP
    async function syncAllFromDatabase() {
        try {
            // Healthcheck
            const statusRes = await fetch(`${API_BASE}/status.php`);
            const statusJson = await statusRes.json();
            const badge = document.getElementById('saasDbBadge');
            const badgeText = document.getElementById('saasDbStatusText');

            if (badge && badgeText) {
                if (statusJson.success && statusJson.data.connected) {
                    badge.className = 'heartbeat-badge hb-connected';
                    badgeText.textContent = `MySQL: ${statusJson.data.port || 3306}`;
                } else {
                    badge.className = 'heartbeat-badge hb-disconnected';
                    badgeText.textContent = 'MySQL Desconectado';
                }
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
        renderEntryBaysMap();
        renderReserveBaysMap();
        filterAvailableBaysForClientSelf();
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
        // 1. Gráfica de Donut: Distribución de Flota y Recaudo por las 4 Zonas Oficiales
        const allTickets = saasState.tickets || [];
        const allSpots = saasState.spots || [];

        let countAP = 0, countAG = 0, countMoto = 0, countBici = 0;

        allTickets.forEach(t => {
            const cat = (t.tipoVehiculo || '').toLowerCase();
            if (cat.includes('pequeñ') || (cat.includes('auto') && !cat.includes('grand'))) countAP++;
            else if (cat.includes('grand') || cat.includes('camioneta') || cat.includes('suv')) countAG++;
            else if (cat.includes('moto')) countMoto++;
            else if (cat.includes('bici')) countBici++;
            else countAP++;
        });

        if (countAP + countAG + countMoto + countBici === 0) {
            allSpots.forEach(s => {
                const tipo = (s.tipoPermitido || s.zona || '').toLowerCase();
                if (tipo.includes('pequeñ') || (tipo.includes('auto') && !tipo.includes('grand'))) countAP++;
                else if (tipo.includes('grand') || tipo.includes('camioneta') || tipo.includes('suv')) countAG++;
                else if (tipo.includes('moto')) countMoto++;
                else if (tipo.includes('bici')) countBici++;
            });
        }

        const totalFlota = Math.max(1, countAP + countAG + countMoto + countBici);
        const pAP = Math.round((countAP / totalFlota) * 100);
        const pAG = Math.round((countAG / totalFlota) * 100);
        const pMoto = Math.round((countMoto / totalFlota) * 100);
        const pBici = Math.max(0, 100 - (pAP + pAG + pMoto));

        const distAuto = document.getElementById('distAutoCount');
        if (distAuto) distAuto.textContent = `${pAP}% (${countAP})`;
        const distSuv = document.getElementById('distSuvCount');
        if (distSuv) distSuv.textContent = `${pAG}% (${countAG})`;
        const distMoto = document.getElementById('distMotoCount');
        if (distMoto) distMoto.textContent = `${pMoto}% (${countMoto})`;
        const distBici = document.getElementById('distBiciCount');
        if (distBici) distBici.textContent = `${pBici}% (${countBici})`;

        // Ajustar arcos SVG del donut (Circunferencia: 2 * PI * 38 ≈ 238.76)
        const C = 238.76;
        const lenAP = (pAP / 100) * C;
        const lenAG = (pAG / 100) * C;
        const lenMoto = (pMoto / 100) * C;
        const lenBici = (pBici / 100) * C;

        const donutSvg = document.getElementById('adminFleetDonutSvg');
        if (donutSvg) {
            const circles = donutSvg.querySelectorAll('circle');
            if (circles.length >= 5) {
                circles[1].setAttribute('stroke-dasharray', `${lenAP} ${C}`);
                circles[1].setAttribute('stroke-dashoffset', '0');
                circles[2].setAttribute('stroke-dasharray', `${lenAG} ${C}`);
                circles[2].setAttribute('stroke-dashoffset', `-${lenAP}`);
                circles[3].setAttribute('stroke-dasharray', `${lenMoto} ${C}`);
                circles[3].setAttribute('stroke-dashoffset', `-${lenAP + lenAG}`);
                circles[4].setAttribute('stroke-dasharray', `${lenBici} ${C}`);
                circles[4].setAttribute('stroke-dashoffset', `-${lenAP + lenAG + lenMoto}`);
                if (circles[5]) circles[5].style.display = 'none';
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
                    <div style="font-size:1.15rem; font-weight:800; color:var(--text-heading); letter-spacing:1px;">PARKFLOW</div>
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

        const freeBays = (saasState.spots || []).filter(s => {
            if (s.estado !== 'DISPONIBLE') return false;
            return s.tipoPermitido === type || s.zona === type || (s.tipoPermitido || '').toLowerCase().includes(type.toLowerCase());
        });

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
        const available = (saasState.spots || []).filter(s => {
            if (s.estado !== 'DISPONIBLE') return false;
            return s.tipoPermitido === selectedType || s.zona === selectedType || (s.tipoPermitido || '').toLowerCase().includes(selectedType.toLowerCase());
        });

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

        if (selectedClientBayCode && available.some(b => b.codigo === selectedClientBayCode)) {
            baySelect.value = selectedClientBayCode;
        }
    }

    async function handleClientSelfEntrySubmit(e) {
        if (e) e.preventDefault();
        const plateInput = document.getElementById('clientSelfPlate');
        const typeSelect = document.getElementById('clientSelfType');
        const baySelect = document.getElementById('clientSelfBay');
        const btn = document.getElementById('btnSubmitClientSelf');

        const plate = plateInput ? plateInput.value.trim().toUpperCase() : '';
        const type = typeSelect ? typeSelect.value : 'Automóviles pequeños';
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
            btn.innerHTML = '<span>⏳</span> Registrando Entrada...';
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

            // Mostrar ticket digital activo en la pantalla de Registro
            const activeContainer = document.getElementById('clientActiveTicketContainer');
            if (activeContainer) {
                activeContainer.style.display = 'block';
                activeContainer.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                        <div>
                            <span class="role-badge-tag pill-emerald" style="margin-bottom:0.35rem;">✓ Entrada Registrada con Éxito</span>
                            <div style="font-size:1.15rem; font-weight:800; color:var(--text-heading);">Ticket Digital: <span style="color:var(--primary); font-family:'JetBrains Mono';">${data.data.ticketCodigo}</span></div>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick='showCheckInReceipt(${JSON.stringify(data.data)})'>🖨️ Ver Recibo</button>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Placa</div>
                            <div class="plate-pill" style="font-size:1.1rem; margin-top:0.25rem;">${data.data.placa}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Bahía Asignada</div>
                            <div style="font-size:1.2rem; font-weight:800; color:var(--emerald);">${data.data.spotCodigo}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Hora Entrada</div>
                            <div style="font-size:0.95rem; font-weight:700; color:var(--text-heading);">${new Date(data.data.fechaIngreso).toLocaleTimeString('es-CO')}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Estado</div>
                            <div class="status-badge badge-active-live">Estadía Activa</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="quickProceedToPay('${data.data.placa}')">
                            💳 Ir a Pagar Estadía de este Vehículo
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="switchSaasView('view-client-bays')">
                            🗺️ Ver Bahía en el Mapa
                        </button>
                    </div>
                `;
            }

            // Precargar la placa en los demás módulos para máxima comodidad del usuario
            const payInput = document.getElementById('clientPaySearchPlate');
            if (payInput) payInput.value = plate;
            const exitInput = document.getElementById('clientExitSearchPlate');
            if (exitInput) exitInput.value = plate;

            // Mostrar modal de ticket
            showCheckInReceipt(data.data);

            // Sincronizar datos de la base de datos
            await syncAllFromDatabase();

            showRbacToast(`✅ ¡Vehículo <strong>${plate}</strong> registrado exitosamente en bahía <strong>${bay}</strong>!`, false);

        } catch (err) {
            alert('Error al registrar vehículo: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>🚀</span> Registrar Entrada Inmediata';
            }
        }
    }

    function quickProceedToPay(plate) {
        switchSaasView('view-client-payment');
        const payInput = document.getElementById('clientPaySearchPlate');
        if (payInput) {
            payInput.value = plate;
            handleClientPaymentSearch();
        }
    }

    window.filterAvailableBaysForClientSelf = filterAvailableBaysForClientSelf;
    window.handleClientSelfEntrySubmit = handleClientSelfEntrySubmit;
    window.quickProceedToPay = quickProceedToPay;

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
        const norm = (tipoVehiculo || '').toLowerCase();
        const rate = (saasState.rates && saasState.rates.find(r => {
            const rt = (r.tipoVehiculo || '').toLowerCase();
            return rt === norm || rt.includes(norm) || norm.includes(rt);
        })) || {
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
    let currentEntryCategoryFilter = 'ALL';
    let currentReserveCategoryFilter = 'ALL';
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

        currentClientCategoryFilter = type;
        currentEntryCategoryFilter = type;
        currentReserveCategoryFilter = type;

        filterAvailableBaysForClientSelf();
        filterAvailableBaysForReservation();
        renderEntryBaysMap();
        renderReserveBaysMap();
        renderClientCategorizedMap();
        calculateReservationCost();
    }

    // Helper para obtener estrictamente las bahías correspondientes a un tipo de vehículo
    function getSpotsForVehicleType(selectedType) {
        const sel = (selectedType || 'Automóviles pequeños').toLowerCase();
        return (saasState.spots || []).filter(s => {
            const tipo = (s.tipoPermitido || '').toLowerCase();
            const zona = (s.zona || '').toLowerCase();
            if (sel.includes('pequeñ') || sel === 'automóvil' || sel === 'automovil') {
                return tipo.includes('pequeñ') || zona.includes('pequeñ') || tipo === 'automóvil' || tipo === 'automovil';
            }
            if (sel.includes('grand') || sel === 'camioneta') {
                return tipo.includes('grand') || zona.includes('grand') || tipo === 'camioneta';
            }
            if (sel.includes('moto')) {
                return tipo.includes('moto') || zona.includes('moto');
            }
            if (sel.includes('bici')) {
                return tipo.includes('bici') || zona.includes('bici');
            }
            return tipo.includes(sel) || zona.includes(sel);
        });
    }

    function filterClientBaysByCategory(category) {
        currentClientCategoryFilter = category;

        const btns = {
            'ALL': 'catBtnAll',
            'Automóviles pequeños': 'catBtnAP',
            'Automóviles grandes': 'catBtnAG',
            'Motocicletas': 'catBtnMoto',
            'Bicicletas': 'catBtnBici',
            'Automóvil': 'catBtnAP',
            'Camioneta': 'catBtnAG',
            'Motocicleta': 'catBtnMoto',
            'Bicicleta': 'catBtnBici'
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

    // Filtrar bahías dentro del formulario de Registro de Vehículo al hacer clic en pestañas
    function filterEntryBaysByCategory(type) {
        const selfType = document.getElementById('clientSelfType');
        if (selfType) selfType.value = type;
        onClientVehicleTypeChange(type);
    }

    // Renderizar Mapa de Bahías dentro de Registro de Vehículo (Solo muestra el tipo seleccionado)
    function renderEntryBaysMap() {
        const container = document.getElementById('entryBaysMatrixContainer');
        if (!container) return;

        const typeSelect = document.getElementById('clientSelfType');
        const selectedType = typeSelect ? typeSelect.value : (currentEntryCategoryFilter || 'Automóviles pequeños');

        // Filtrar estrictamente solo las bahías del tipo seleccionado
        const spotsList = getSpotsForVehicleType(selectedType);

        // Actualizar tabs de categoría activas en Registro
        const catMap = {
            'Automóviles pequeños': 'entryCatBtnAP',
            'Automóviles grandes': 'entryCatBtnAG',
            'Motocicletas': 'entryCatBtnMoto',
            'Bicicletas': 'entryCatBtnBici'
        };
        ['entryCatBtnAP', 'entryCatBtnAG', 'entryCatBtnMoto', 'entryCatBtnBici'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
        });
        const activeBtnId = catMap[selectedType] || 'entryCatBtnAP';
        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) activeBtn.classList.add('active');

        // Contadores por categoría
        const countAP = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('pequeñ') || (s.zona || '').toLowerCase().includes('pequeñ') || s.tipoPermitido === 'Automóvil')).length;
        const countAG = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('grand') || (s.zona || '').toLowerCase().includes('grand') || s.tipoPermitido === 'Camioneta')).length;
        const countMoto = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('moto') || (s.zona || '').toLowerCase().includes('moto'))).length;
        const countBici = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('bici') || (s.zona || '').toLowerCase().includes('bici'))).length;

        const elAP = document.getElementById('entryCatCountAP'); if (elAP) elAP.textContent = countAP;
        const elAG = document.getElementById('entryCatCountAG'); if (elAG) elAG.textContent = countAG;
        const elMoto = document.getElementById('entryCatCountMoto'); if (elMoto) elMoto.textContent = countMoto;
        const elBici = document.getElementById('entryCatCountBici'); if (elBici) elBici.textContent = countBici;

        // Nombre del tipo de vehículo filtrado y resumen de cantidad
        const typeNameEl = document.getElementById('entryCurrentTypeName');
        if (typeNameEl) typeNameEl.textContent = selectedType;

        const freeCount = spotsList.filter(s => s.estado === 'DISPONIBLE').length;
        const summaryEl = document.getElementById('entryBaysCountSummary');
        if (summaryEl) summaryEl.textContent = `${spotsList.length} bahías exclusivas · ${freeCount} libres`;

        // Actualizar indicador de espacio seleccionado
        const codeDisplay = document.getElementById('entrySelectedBayCodeDisplay');
        const zoneDisplay = document.getElementById('entrySelectedBayZoneDisplay');
        const indicatorBox = document.getElementById('entrySelectedBayIndicator');

        if (selectedClientBayCode) {
            const spot = (saasState.spots || []).find(s => s.codigo === selectedClientBayCode);
            if (codeDisplay) codeDisplay.textContent = selectedClientBayCode;
            if (zoneDisplay) {
                const zText = spot ? `${spot.tipoPermitido || spot.zona} · ${spot.estado === 'DISPONIBLE' ? 'Libre' : spot.estado}` : 'Seleccionado';
                zoneDisplay.textContent = `(${zText})`;
                zoneDisplay.style.color = (spot && spot.estado === 'DISPONIBLE') ? 'var(--emerald)' : 'var(--amber)';
            }
            if (indicatorBox) {
                indicatorBox.style.background = 'rgba(0, 245, 255, 0.16)';
                indicatorBox.style.borderColor = 'var(--primary)';
                indicatorBox.style.boxShadow = '0 0 14px rgba(0, 245, 255, 0.35)';
            }
        } else {
            if (codeDisplay) codeDisplay.textContent = 'Ninguno';
            if (zoneDisplay) {
                zoneDisplay.textContent = '(Haz clic en una bahía disponible)';
                zoneDisplay.style.color = 'var(--text-muted)';
            }
            if (indicatorBox) {
                indicatorBox.style.background = 'rgba(0, 245, 255, 0.08)';
                indicatorBox.style.borderColor = 'rgba(0, 245, 255, 0.3)';
                indicatorBox.style.boxShadow = 'none';
            }
        }

        if (spotsList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:2rem; color:var(--text-muted);">No hay bahías configuradas para ${selectedType}.</div>`;
            return;
        }

        container.innerHTML = spotsList.map(s => {
            const isAvailable = (s.estado === 'DISPONIBLE');
            const isReserved = (s.estado === 'RESERVADO');
            const stateClass = isAvailable ? 'bay-disponible' : isReserved ? 'bay-reservado' : 'bay-ocupado';
            const isSelected = (selectedClientBayCode === s.codigo);

            const tipoLower = (s.tipoPermitido || s.zona || '').toLowerCase();
            const icon = tipoLower.includes('moto') ? '🏍️' : tipoLower.includes('bici') ? '🚲' : tipoLower.includes('grand') || tipoLower.includes('camioneta') ? '🚙' : '🚗';
            const stateLabel = isAvailable ? 'Libre' : isReserved ? 'Reservado' : 'Ocupado';

            return `
                <div class="bay-cell ${stateClass} ${isSelected ? 'bay-selected-target' : ''}" 
                     onclick="selectBayForClient('${s.codigo}', '${s.tipoPermitido}', '${s.estado}')"
                     style="cursor:pointer;"
                     id="entry-bay-${s.codigo}"
                     title="${s.codigo} · ${s.zona} (${s.estado}) - Clic para elegir">
                    <div style="font-size:0.9rem; margin-bottom:0.2rem;">${icon}</div>
                    <div class="bay-code">${s.codigo}</div>
                    <div class="bay-plate-text">${s.placaActual || (isReserved ? 'RESERVA' : s.tipoPermitido)}</div>
                    <span class="bay-state-tag">${stateLabel}</span>
                </div>
            `;
        }).join('');
    }

    // Cambio desde el select dropdown de bahías
    function onClientSelfBayDropdownChange(codigo) {
        if (!codigo) return;
        selectedClientBayCode = codigo;
        renderEntryBaysMap();
        renderReserveBaysMap();
        renderClientCategorizedMap();

        const bayCard = document.getElementById(`entry-bay-${codigo}`);
        if (bayCard) {
            bayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Filtrar bahías dentro del formulario de Reservas Anticipadas al hacer clic en pestañas
    function filterReserveBaysByCategory(type) {
        const resType = document.getElementById('reserveType');
        if (resType) resType.value = type;
        onClientVehicleTypeChange(type);
    }

    // Renderizar Mapa de Bahías dentro de Reservas Anticipadas (Solo muestra el tipo seleccionado)
    function renderReserveBaysMap() {
        const container = document.getElementById('reserveBaysMatrixContainer');
        if (!container) return;

        const typeSelect = document.getElementById('reserveType');
        const selectedType = typeSelect ? typeSelect.value : (currentReserveCategoryFilter || 'Automóviles pequeños');

        // Filtrar estrictamente solo las bahías del tipo seleccionado
        const spotsList = getSpotsForVehicleType(selectedType);

        // Actualizar tabs de categoría activas en Reservas
        const catMap = {
            'Automóviles pequeños': 'reserveCatBtnAP',
            'Automóviles grandes': 'reserveCatBtnAG',
            'Motocicletas': 'reserveCatBtnMoto',
            'Bicicletas': 'reserveCatBtnBici'
        };
        ['reserveCatBtnAP', 'reserveCatBtnAG', 'reserveCatBtnMoto', 'reserveCatBtnBici'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
        });
        const activeBtnId = catMap[selectedType] || 'reserveCatBtnAP';
        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) activeBtn.classList.add('active');

        // Contadores por categoría
        const countAP = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('pequeñ') || (s.zona || '').toLowerCase().includes('pequeñ') || s.tipoPermitido === 'Automóvil')).length;
        const countAG = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('grand') || (s.zona || '').toLowerCase().includes('grand') || s.tipoPermitido === 'Camioneta')).length;
        const countMoto = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('moto') || (s.zona || '').toLowerCase().includes('moto'))).length;
        const countBici = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('bici') || (s.zona || '').toLowerCase().includes('bici'))).length;

        const elAP = document.getElementById('reserveCatCountAP'); if (elAP) elAP.textContent = countAP;
        const elAG = document.getElementById('reserveCatCountAG'); if (elAG) elAG.textContent = countAG;
        const elMoto = document.getElementById('reserveCatCountMoto'); if (elMoto) elMoto.textContent = countMoto;
        const elBici = document.getElementById('reserveCatCountBici'); if (elBici) elBici.textContent = countBici;

        // Nombre del tipo de vehículo filtrado y resumen de cantidad
        const typeNameEl = document.getElementById('reserveCurrentTypeName');
        if (typeNameEl) typeNameEl.textContent = selectedType;

        const freeCount = spotsList.filter(s => s.estado === 'DISPONIBLE').length;
        const summaryEl = document.getElementById('reserveBaysCountSummary');
        if (summaryEl) summaryEl.textContent = `${spotsList.length} bahías exclusivas · ${freeCount} libres`;

        // Actualizar indicador de espacio seleccionado para reserva
        const codeDisplay = document.getElementById('reserveSelectedBayCodeDisplay');
        const zoneDisplay = document.getElementById('reserveSelectedBayZoneDisplay');
        const indicatorBox = document.getElementById('reserveSelectedBayIndicator');

        if (selectedClientBayCode) {
            const spot = (saasState.spots || []).find(s => s.codigo === selectedClientBayCode);
            if (codeDisplay) codeDisplay.textContent = selectedClientBayCode;
            if (zoneDisplay) {
                const zText = spot ? `${spot.tipoPermitido || spot.zona} · ${spot.estado === 'DISPONIBLE' ? 'Libre' : spot.estado}` : 'Seleccionado';
                zoneDisplay.textContent = `(${zText})`;
                zoneDisplay.style.color = (spot && spot.estado === 'DISPONIBLE') ? 'var(--emerald)' : 'var(--amber)';
            }
            if (indicatorBox) {
                indicatorBox.style.background = 'rgba(245, 158, 11, 0.16)';
                indicatorBox.style.borderColor = 'var(--amber)';
                indicatorBox.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.35)';
            }
        } else {
            if (codeDisplay) codeDisplay.textContent = 'Ninguno';
            if (zoneDisplay) {
                zoneDisplay.textContent = '(Haz clic en una bahía disponible)';
                zoneDisplay.style.color = 'var(--text-muted)';
            }
            if (indicatorBox) {
                indicatorBox.style.background = 'rgba(245, 158, 11, 0.08)';
                indicatorBox.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                indicatorBox.style.boxShadow = 'none';
            }
        }

        if (spotsList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:2rem; color:var(--text-muted);">No hay bahías configuradas para ${selectedType}.</div>`;
            return;
        }

        container.innerHTML = spotsList.map(s => {
            const isAvailable = (s.estado === 'DISPONIBLE');
            const isReserved = (s.estado === 'RESERVADO');
            const stateClass = isAvailable ? 'bay-disponible' : isReserved ? 'bay-reservado' : 'bay-ocupado';
            const isSelected = (selectedClientBayCode === s.codigo);

            const tipoLower = (s.tipoPermitido || s.zona || '').toLowerCase();
            const icon = tipoLower.includes('moto') ? '🏍️' : tipoLower.includes('bici') ? '🚲' : tipoLower.includes('grand') || tipoLower.includes('camioneta') ? '🚙' : '🚗';
            const stateLabel = isAvailable ? 'Libre' : isReserved ? 'Reservado' : 'Ocupado';

            return `
                <div class="bay-cell ${stateClass} ${isSelected ? 'bay-selected-target' : ''}" 
                     onclick="selectBayForClient('${s.codigo}', '${s.tipoPermitido}', '${s.estado}')"
                     style="cursor:pointer;"
                     id="reserve-bay-${s.codigo}"
                     title="${s.codigo} · ${s.zona} (${s.estado}) - Clic para reservar">
                    <div style="font-size:0.9rem; margin-bottom:0.2rem;">${icon}</div>
                    <div class="bay-code">${s.codigo}</div>
                    <div class="bay-plate-text">${s.placaActual || (isReserved ? 'RESERVA' : s.tipoPermitido)}</div>
                    <span class="bay-state-tag">${stateLabel}</span>
                </div>
            `;
        }).join('');
    }

    // Cambio desde el select dropdown de bahías en Reservas
    function onReserveBayDropdownChange(codigo) {
        if (!codigo) return;
        selectedClientBayCode = codigo;
        renderReserveBaysMap();
        renderEntryBaysMap();
        renderClientCategorizedMap();

        const bayCard = document.getElementById(`reserve-bay-${codigo}`);
        if (bayCard) {
            bayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        calculateReservationCost();
    }

    function renderClientCategorizedMap() {
        const container = document.getElementById('clientCategorizedBaysContainer');
        if (!container) return;

        let spotsList = saasState.spots || [];
        if (currentClientCategoryFilter !== 'ALL') {
            const filter = currentClientCategoryFilter.toLowerCase();
            spotsList = spotsList.filter(s => {
                const tipo = (s.tipoPermitido || '').toLowerCase();
                const zona = (s.zona || '').toLowerCase();
                return tipo === filter || tipo.includes(filter) || filter.includes(tipo) || zona.includes(filter);
            });
        }

        const countAll = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE').length;
        const countAP = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('pequeñ') || (s.zona || '').toLowerCase().includes('pequeñ') || s.tipoPermitido === 'Automóvil')).length;
        const countAG = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('grand') || (s.zona || '').toLowerCase().includes('grand') || s.tipoPermitido === 'Camioneta')).length;
        const countMoto = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('moto') || (s.zona || '').toLowerCase().includes('moto'))).length;
        const countBici = (saasState.spots || []).filter(s => s.estado === 'DISPONIBLE' && ((s.tipoPermitido || '').toLowerCase().includes('bici') || (s.zona || '').toLowerCase().includes('bici'))).length;

        const elAll = document.getElementById('catCountAll'); if (elAll) elAll.textContent = countAll;
        const elAP = document.getElementById('catCountAP'); if (elAP) elAP.textContent = countAP;
        const elAG = document.getElementById('catCountAG'); if (elAG) elAG.textContent = countAG;
        const elMoto = document.getElementById('catCountMoto'); if (elMoto) elMoto.textContent = countMoto;
        const elBici = document.getElementById('catCountBici'); if (elBici) elBici.textContent = countBici;

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

            const tipoLower = (s.tipoPermitido || s.zona || '').toLowerCase();
            const icon = tipoLower.includes('moto') ? '🏍️' : tipoLower.includes('bici') ? '🚲' : tipoLower.includes('grand') || tipoLower.includes('camioneta') ? '🚙' : '🚗';
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

        // Mapear al tipo estándar del selector si es necesario
        let matchedType = tipo;
        const lower = (tipo || '').toLowerCase();
        if (lower.includes('pequeñ') || lower === 'automóvil' || lower === 'automovil') {
            matchedType = 'Automóviles pequeños';
        } else if (lower.includes('grand') || lower === 'camioneta') {
            matchedType = 'Automóviles grandes';
        } else if (lower.includes('moto')) {
            matchedType = 'Motocicletas';
        } else if (lower.includes('bici')) {
            matchedType = 'Bicicletas';
        }

        // Auto-seleccionar en formulario de entrada
        const selfBay = document.getElementById('clientSelfBay');
        const selfType = document.getElementById('clientSelfType');
        if (selfType && matchedType) selfType.value = matchedType;
        filterAvailableBaysForClientSelf();
        if (selfBay) {
            let exists = Array.from(selfBay.options).some(o => o.value === codigo);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = codigo;
                opt.textContent = `${codigo} (${matchedType})`;
                selfBay.appendChild(opt);
            }
            selfBay.value = codigo;
        }

        // Auto-seleccionar en formulario de reserva
        const resBay = document.getElementById('reserveBay');
        const resType = document.getElementById('reserveType');
        if (resType && matchedType) resType.value = matchedType;
        filterAvailableBaysForReservation();
        if (resBay) {
            let exists = Array.from(resBay.options).some(o => o.value === codigo);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = codigo;
                opt.textContent = `${codigo} (${matchedType})`;
                resBay.appendChild(opt);
            }
            resBay.value = codigo;
        }

        renderEntryBaysMap();
        renderReserveBaysMap();
        renderClientCategorizedMap();
        calculateReservationCost();

        showRbacToast(`📍 Bahía <strong>${codigo}</strong> seleccionada para tu vehículo.`, false);
    }

    function filterAvailableBaysForReservation() {
        const typeSelect = document.getElementById('reserveType');
        const baySelect = document.getElementById('reserveBay');
        if (!typeSelect || !baySelect) return;

        const selectedType = typeSelect.value;
        const available = (saasState.spots || []).filter(s => {
            if (s.estado !== 'DISPONIBLE') return false;
            return s.tipoPermitido === selectedType || s.zona === selectedType || (s.tipoPermitido || '').toLowerCase().includes(selectedType.toLowerCase());
        });

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

        const hourlyRates = { 
            'Automóviles pequeños': 5800, 'Automóviles grandes': 7200, 'Motocicletas': 3400, 'Bicicletas': 1200,
            'Automóvil': 5800, 'Camioneta': 7200, 'Motocicleta': 3400, 'Bicicleta': 1200 
        };
        const dailyRates = { 
            'Automóviles pequeños': 42000, 'Automóviles grandes': 52000, 'Motocicletas': 24000, 'Bicicletas': 8000,
            'Automóvil': 42000, 'Camioneta': 52000, 'Motocicleta': 24000, 'Bicicleta': 8000 
        };
        const nightRates = { 
            'Automóviles pequeños': 28000, 'Automóviles grandes': 34000, 'Motocicletas': 16000, 'Bicicletas': 5000,
            'Automóvil': 28000, 'Camioneta': 34000, 'Motocicleta': 16000, 'Bicicleta': 5000 
        };

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
    window.filterEntryBaysByCategory = filterEntryBaysByCategory;
    window.renderEntryBaysMap = renderEntryBaysMap;
    window.onClientSelfBayDropdownChange = onClientSelfBayDropdownChange;
    window.filterReserveBaysByCategory = filterReserveBaysByCategory;
    window.renderReserveBaysMap = renderReserveBaysMap;
    window.onReserveBayDropdownChange = onReserveBayDropdownChange;
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
        const zoneConfig = {
            'Automóviles pequeños': { icon: '🚗', tipo: 'Automóviles pequeños' },
            'Automóviles grandes': { icon: '🚙', tipo: 'Automóviles grandes' },
            'Motocicletas': { icon: '🏍️', tipo: 'Motocicletas' },
            'Bicicletas': { icon: '🚲', tipo: 'Bicicletas' }
        };

        const zones = {};
        for (const [zKey, zConf] of Object.entries(zoneConfig)) {
            zones[zKey] = { spots: [], icon: zConf.icon, tipo: zConf.tipo };
        }

        (saasState.spots || []).forEach(s => {
            const zKey = s.zona || 'Zona General';
            if (!zones[zKey]) {
                const tipoLower = (s.tipoPermitido || s.zona || '').toLowerCase();
                const icon = tipoLower.includes('moto') ? '🏍️' : tipoLower.includes('bici') ? '🚲' : tipoLower.includes('grand') || tipoLower.includes('camioneta') ? '🚙' : '🚗';
                zones[zKey] = { spots: [], icon: icon, tipo: s.tipoPermitido };
            }
            zones[zKey].spots.push(s);
        });

        const container = document.getElementById('saasZonesContainer');
        if (!container) return;
        container.innerHTML = '';

        for (const [zoneName, zData] of Object.entries(zones)) {
            if (zData.spots.length === 0) continue;

            const zDiv = document.createElement('div');
            zDiv.className = 'zone-box';

            // Ordenar naturalmente por código (A-01, A-02, ... A-16)
            zData.spots.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' }));

            const freeCount = zData.spots.filter(s => s.estado === 'DISPONIBLE').length;

            const baysHtml = zData.spots.map(s => {
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
                    <span class="zone-title">${zData.icon} ${zoneName}</span>
                    <span class="status-badge badge-active-live">${freeCount}/${zData.spots.length} Libres</span>
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
                selectBayForClient(code, spot ? spot.tipoPermitido : 'Automóviles pequeños', state);
                switchSaasView('view-client-entry');
                showRbacToast(`📍 Bahía <strong>${code}</strong> seleccionada para tu registro de vehículo.`, false);
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
        if (!tbody) return;
        const sortOrder = { 
            'Automóviles pequeños': 1, 
            'Automóviles grandes': 2, 
            'Motocicletas': 3, 
            'Bicicletas': 4,
            'Automóvil': 5, 
            'Camioneta': 6 
        };
        const sortedRates = [...(saasState.rates || [])].sort((a,b) => (sortOrder[a.tipoVehiculo] || 99) - (sortOrder[b.tipoVehiculo] || 99));

        const role = saasState.currentRole || 'Administrador';
        const config = RBAC_RULES[role] || RBAC_RULES['Administrador'];
        const canEdit = !!config.canEditRates;

        tbody.innerHTML = sortedRates.map(r => `
            <tr>
                <td><strong style="color:var(--text-heading); font-size:0.85rem;">${r.tipoVehiculo}</strong></td>
                <td><span style="font-family:'JetBrains Mono'; font-weight:600;">$${Number(r.tarifaPorMinuto).toLocaleString('es-CO')} COP</span></td>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--primary);">$${Number(r.tarifaPorHora).toLocaleString('es-CO')} COP</span></td>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--emerald);">$${Number(r.tarifaPlenaDia).toLocaleString('es-CO')} COP</span></td>
                <td><span class="role-badge-tag" style="background:rgba(255,255,255,0.06); color:var(--text-body);">${r.fraccionGraciaMin} min</span></td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${r.actualizadoEn}</td>
                <td style="text-align:right;">
                    ${canEdit ? `
                        <button type="button" class="btn btn-secondary btn-sm" onclick="editRateModal('${r.id}', '${r.tipoVehiculo}', ${r.tarifaPorHora}, ${r.tarifaPorMinuto})">
                            ✏️ Editar
                        </button>
                    ` : `
                        <span class="role-badge-tag pill-emerald" style="padding:0.25rem 0.6rem; font-size:0.72rem;">✓ Vigente</span>
                    `}
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
        if (!tbody) return;
        const roleOrder = { 'Administrador': 1, 'Operador': 2, 'Cliente': 3 };
        const sortedUsers = [...(saasState.users || [])].sort((a,b) => {
            const rDiff = (roleOrder[a.rol] || 99) - (roleOrder[b.rol] || 99);
            if (rDiff !== 0) return rDiff;
            return (a.id || '').localeCompare(b.id || '');
        });

        tbody.innerHTML = sortedUsers.map(u => `
            <tr>
                <td><span style="font-family:'JetBrains Mono'; color:var(--primary); font-weight:700;">${u.id}</span></td>
                <td>
                    <strong style="color:var(--text-heading); font-size:0.85rem;">${u.nombre}</strong>
                    ${u.placaAsociada ? `<span class="plate-pill" style="margin-left:8px; font-size:0.7rem;">${u.placaAsociada}</span>` : ''}
                </td>
                <td style="color:var(--text-body); font-size:0.8rem;">${u.email}</td>
                <td>
                    <span class="status-badge ${u.rol==='Administrador'?'pill-emerald':u.rol==='Operador'?'pill-primary':'status-badge'}">
                        ${u.rol === 'Administrador' ? '👑 Admin' : u.rol === 'Operador' ? '👷 Operador' : '👤 Cliente'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${u.activo ? 'badge-completed' : 'badge-blocked'}">
                        ${u.activo ? '● Activo' : '○ Inactivo'}
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

    // =========================================================================
    // MÓDULOS DE AUTOSERVICIO DEL CLIENTE: PAGO, SALIDA & PAZ Y SALVO
    // =========================================================================
    let activeClientPaymentData = null;
    let selectedClientPaymentMethod = 'NEQUI';

    // 1. Módulo de Pago: Búsqueda y Liquidación
    function handleClientPaymentSearch() {
        const input = document.getElementById('clientPaySearchPlate');
        const plate = input ? input.value.trim().toUpperCase() : '';
        const resultBox = document.getElementById('clientPayResultBox');
        const methodsSection = document.getElementById('clientPaymentMethodsSection');
        const pazBox = document.getElementById('clientPazYSalvoBox');

        if (pazBox) pazBox.style.display = 'none';

        if (!plate) {
            alert('Por favor ingresa la placa de tu vehículo.');
            return;
        }

        const activeTicket = (saasState.tickets || []).find(t => t.estado === 'ACTIVO' && t.placa === plate);

        if (!activeTicket) {
            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.75rem; color:var(--rose);">
                        <span style="font-size:1.5rem;">⚠️</span>
                        <div>
                            <strong style="font-size:0.95rem;">Vehículo sin Estancia Activa</strong>
                            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
                                La placa <strong>${plate}</strong> no tiene un ingreso activo en este momento o ya fue liquidada.
                            </p>
                        </div>
                    </div>
                `;
            }
            if (methodsSection) methodsSection.style.display = 'none';
            return;
        }

        // Calcular minutos de estadía y tarifa
        const entryTime = new Date(activeTicket.fechaIngreso).getTime();
        const mins = Math.max(1, Math.round((Date.now() - entryTime) / 60000));
        const calc = calculateStayFee(activeTicket.tipoVehiculo, mins, 'MINUTE');

        activeClientPaymentData = {
            ticket: activeTicket,
            minutes: mins,
            calc: calc
        };

        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                    <div>
                        <span class="plate-pill" style="font-size:1.25rem;">${activeTicket.placa}</span>
                        <span style="margin-left:0.5rem; color:var(--primary); font-size:0.85rem; font-weight:700;">${activeTicket.tipoVehiculo}</span>
                    </div>
                    <span class="status-badge badge-active-live">Estancia en Curso</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.85rem; margin-bottom:1.15rem;">
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Bahía Asignada</div>
                        <div style="font-size:1.25rem; font-weight:800; color:var(--emerald); font-family:'JetBrains Mono';">${activeTicket.spotCodigo}</div>
                    </div>
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Hora Ingreso</div>
                        <div style="font-size:0.95rem; font-weight:700; color:var(--text-heading);">${new Date(activeTicket.fechaIngreso).toLocaleTimeString('es-CO')}</div>
                    </div>
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Tiempo Transcurrido</div>
                        <div style="font-size:1.2rem; font-weight:800; color:var(--primary); font-family:'JetBrains Mono';">${mins} mins</div>
                    </div>
                    <div>
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Tarifa por Minuto</div>
                        <div style="font-size:1.1rem; font-weight:800; color:var(--text-heading); font-family:'JetBrains Mono';">$${calc.ratePerMinute.toLocaleString('es-CO')}/min</div>
                    </div>
                </div>
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.9rem 1.15rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Desglose de Liquidación:</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); font-family:'JetBrains Mono';">${calc.formula} (5m gracia aplicados)</div>
                    </div>
                    <div style="font-size:1.55rem; font-weight:900; color:var(--emerald); font-family:'JetBrains Mono';">
                        $${calc.total.toLocaleString('es-CO')} COP
                    </div>
                </div>
                <div style="margin-top:0.75rem; text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="handleClientPaymentSearch()" style="font-size:0.75rem;">
                        🔄 Recalcular Minutos en Vivo
                    </button>
                </div>
            `;
        }

        if (methodsSection) {
            methodsSection.style.display = 'block';
            selectClientPaymentMethod('NEQUI');
        }
    }

    // 2. Selección de Método de Pago
    function selectClientPaymentMethod(method) {
        selectedClientPaymentMethod = method;

        const btnNequi = document.getElementById('payMethodNequi');
        const btnCard = document.getElementById('payMethodCard');
        const btnCash = document.getElementById('payMethodCash');
        const formContainer = document.getElementById('clientPaymentFormContainer');
        const confirmBtn = document.getElementById('btnConfirmClientPay');

        if (btnNequi) btnNequi.className = (method === 'NEQUI') ? 'payment-method-card active' : 'payment-method-card';
        if (btnCard) btnCard.className = (method === 'CARD') ? 'payment-method-card active' : 'payment-method-card';
        if (btnCash) btnCash.className = (method === 'CASH') ? 'payment-method-card active' : 'payment-method-card';

        const totalFormatted = activeClientPaymentData ? `$${activeClientPaymentData.calc.total.toLocaleString('es-CO')} COP` : '$0 COP';

        if (formContainer) {
            if (method === 'NEQUI') {
                formContainer.innerHTML = `
                    <div style="display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;">
                        <div style="background:#ffffff; padding:0.6rem; border-radius:var(--radius-md); text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.4);">
                            <div style="width:110px; height:110px; background:repeating-linear-gradient(45deg, #000 0px, #000 7px, #fff 7px, #fff 14px); border-radius:4px; margin:0 auto;"></div>
                            <div style="font-size:0.65rem; color:#0f172a; font-weight:800; margin-top:0.35rem;">QR OFICIAL NEQUI</div>
                        </div>
                        <div style="flex:1; min-width:200px;">
                            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Línea de Recaudo Empresarial</div>
                            <div style="font-size:1.2rem; font-weight:800; color:var(--primary); font-family:'JetBrains Mono'; margin:0.2rem 0;">315 890 4421</div>
                            <p style="font-size:0.78rem; color:var(--text-body); line-height:1.4;">
                                Escanea el código QR desde tu App Nequi / Daviplata o transfiere el monto exacto de <strong>${totalFormatted}</strong>. La acreditación se reflejará al confirmar.
                            </p>
                        </div>
                    </div>
                `;
            } else if (method === 'CARD') {
                formContainer.innerHTML = `
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem;">
                        <div class="form-row" style="margin-bottom:0; grid-column: 1 / -1;">
                            <label class="form-label-saas">Número de Tarjeta</label>
                            <input type="text" class="form-control-saas" value="4532 •••• •••• 8891" readonly style="font-family:'JetBrains Mono';">
                        </div>
                        <div class="form-row" style="margin-bottom:0;">
                            <label class="form-label-saas">Vencimiento</label>
                            <input type="text" class="form-control-saas" value="08/29" readonly style="text-align:center;">
                        </div>
                        <div class="form-row" style="margin-bottom:0;">
                            <label class="form-label-saas">CVV</label>
                            <input type="text" class="form-control-saas" value="•••" readonly style="text-align:center;">
                        </div>
                    </div>
                `;
            } else {
                formContainer.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.75rem; color:var(--amber);">
                        <span style="font-size:1.4rem;">💵</span>
                        <div style="font-size:0.82rem; color:var(--text-body);">
                            Acércate a la taquilla física del parqueadero para realizar el pago en efectivo de <strong>${totalFormatted}</strong> y solicita tu comprobante impreso.
                        </div>
                    </div>
                `;
            }
        }

        if (confirmBtn) {
            confirmBtn.innerHTML = `<span>💳</span> Confirmar Pago con ${method === 'NEQUI' ? 'Nequi / Daviplata' : method === 'CARD' ? 'Tarjeta Débito/Crédito' : 'Taquilla'} (${totalFormatted})`;
        }
    }

    // 3. Ejecutar Pago y Emitir Paz y Salvo
    async function executeClientPayment() {
        if (!activeClientPaymentData) {
            alert('Por favor busca y liquida una placa primero.');
            return;
        }

        const data = activeClientPaymentData;
        const btn = document.getElementById('btnConfirmClientPay');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> Procesando Pago Seguro...';
        }

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logId: data.ticket.id,
                    valorPagado: data.calc.total,
                    minutosTranscurridos: data.minutes,
                    metodoPago: selectedClientPaymentMethod,
                    operadorSalida: 'Cliente Autoservicio (' + (currentAuthSession?.nombre || 'Usuario') + ')'
                })
            });

            const json = await res.json();
            if (!json.success) {
                alert(json.message || 'Error al procesar pago.');
                return;
            }

            // Registrar Paz y Salvo Oficial
            const pzId = 'PZ-' + Date.now().toString().slice(-6);
            const pazYSalvo = {
                id: pzId,
                ticketCodigo: data.ticket.ticketCodigo,
                placa: data.ticket.placa,
                tipoVehiculo: data.ticket.tipoVehiculo,
                spotCodigo: data.ticket.spotCodigo,
                valorPagado: data.calc.total,
                minutos: data.minutes,
                metodoPago: selectedClientPaymentMethod,
                fechaPago: new Date().toISOString(),
                graciaSalidaMinutos: 15
            };

            localStorage.setItem('parkflow_pz_' + data.ticket.placa, JSON.stringify(pazYSalvo));

            // Ocultar sección de métodos y mostrar tarjeta de Paz y Salvo
            const methodsSection = document.getElementById('clientPaymentMethodsSection');
            if (methodsSection) methodsSection.style.display = 'none';

            const pazBox = document.getElementById('clientPazYSalvoBox');
            if (pazBox) {
                pazBox.style.display = 'block';
                pazBox.innerHTML = `
                    <div class="paz-salvo-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:0.75rem;">
                            <div style="display:flex; align-items:center; gap:0.6rem;">
                                <span style="font-size:1.6rem;">🎉</span>
                                <div>
                                    <h3 style="color:var(--emerald); font-size:1.15rem; font-weight:800; margin:0;">¡Paz y Salvo Digital Emitido!</h3>
                                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Comprobante oficial de pago de estadía</p>
                                </div>
                            </div>
                            <span class="role-badge-tag pill-emerald">N° ${pzId}</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
                            <div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Placa</div>
                                <div class="plate-pill" style="font-size:1.1rem; margin-top:0.25rem;">${pazYSalvo.placa}</div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Bahía</div>
                                <div style="font-size:1.15rem; font-weight:800; color:var(--text-heading); font-family:'JetBrains Mono';">${pazYSalvo.spotCodigo}</div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Monto Liquidado</div>
                                <div style="font-size:1.15rem; font-weight:800; color:var(--emerald); font-family:'JetBrains Mono';">$${pazYSalvo.valorPagado.toLocaleString('es-CO')}</div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Gracia para Salida</div>
                                <div style="font-size:1.1rem; font-weight:800; color:var(--amber);">15 Minutos</div>
                            </div>
                        </div>
                        <div style="background:rgba(0,0,0,0.3); border-radius:var(--radius-sm); padding:0.85rem 1rem; margin-bottom:1.25rem; font-size:0.8rem; color:var(--text-body);">
                            ✓ Tu pago ha sido registrado en el sistema. Tienes <strong>15 minutos</strong> para retirar tu vehículo. Dirígete al módulo de <strong>Salida de Vehículo</strong> para liberar tu bahía.
                        </div>
                        <button type="button" class="btn btn-primary" onclick="proceedToExitAfterPayment('${pazYSalvo.placa}')" style="width:100%; height:46px; font-weight:800; background:linear-gradient(135deg, var(--emerald), #059669); color:#060911;">
                            <span>🚪</span> Proceder a Salida de Vehículo & Liberar Bahía →
                        </button>
                    </div>
                `;
            }

            await syncAllFromDatabase();
            showRbacToast(`🎉 ¡Pago confirmado! Paz y Salvo <strong>${pzId}</strong> emitido.`, false);

        } catch (err) {
            alert('Error procesando pago: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>💳</span> Procesar Pago & Generar Paz y Salvo Oficial';
            }
        }
    }

    function proceedToExitAfterPayment(plate) {
        switchSaasView('view-client-exit');
        const exitInput = document.getElementById('clientExitSearchPlate');
        if (exitInput) {
            exitInput.value = plate;
            handleClientExitSearch();
        }
    }

    // 4. Módulo de Salida: Validación de Paz y Salvo
    function handleClientExitSearch() {
        const input = document.getElementById('clientExitSearchPlate');
        const plate = input ? input.value.trim().toUpperCase() : '';
        const container = document.getElementById('clientExitStatusContainer');

        if (!plate) {
            alert('Por favor ingresa la placa de tu vehículo.');
            return;
        }

        if (!container) return;
        container.style.display = 'block';

        // 1. Revisar si tiene Paz y Salvo local vigente
        let pz = null;
        try {
            const raw = localStorage.getItem('parkflow_pz_' + plate);
            if (raw) pz = JSON.parse(raw);
        } catch (e) {}

        // 2. Revisar si hay un ticket activo o recientemente finalizado
        const activeTicket = (saasState.tickets || []).find(t => t.estado === 'ACTIVO' && t.placa === plate);
        const lastTicket = (saasState.tickets || []).find(t => t.placa === plate);

        if (pz) {
            // Caso A: Paz y Salvo Autorizado
            container.innerHTML = `
                <div class="exit-hero-card" style="border-left:4px solid var(--emerald);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span style="font-size:1.6rem; color:var(--emerald);">✓</span>
                            <div>
                                <h3 style="color:var(--text-heading); font-size:1.15rem; font-weight:800; margin:0;">Vehículo Autorizado para Salida</h3>
                                <p style="font-size:0.75rem; color:var(--emerald); margin:0;">Paz y Salvo Vigente (${pz.id})</p>
                            </div>
                        </div>
                        <span class="status-badge badge-available">Salida Aprobada</span>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Placa</div>
                            <div class="plate-pill" style="font-size:1.15rem; margin-top:0.25rem;">${pz.placa}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Bahía a Liberar</div>
                            <div style="font-size:1.25rem; font-weight:800; color:var(--emerald); font-family:'JetBrains Mono';">${pz.spotCodigo}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Valor Liquidado</div>
                            <div style="font-size:1.1rem; font-weight:800; color:var(--text-heading); font-family:'JetBrains Mono';">$${pz.valorPagado.toLocaleString('es-CO')}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Método de Pago</div>
                            <div style="font-size:0.95rem; font-weight:700; color:var(--primary);">${pz.metodoPago}</div>
                        </div>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-body); margin-bottom:1.25rem;">
                        Al hacer clic en confirmar salida, el sistema abrirá la barrera y la bahía <strong>${pz.spotCodigo}</strong> pasará inmediatamente a estado <strong>DISPONIBLE</strong>.
                    </p>
                    <button type="button" class="btn btn-primary" onclick="executeClientExit('${pz.placa}', '${pz.spotCodigo}')" style="width:100%; height:46px; font-weight:800; font-size:0.95rem; background:linear-gradient(135deg, var(--emerald), #059669); color:#060911;">
                        <span>🚪</span> Confirmar Salida y Liberar Bahía [${pz.spotCodigo}]
                    </button>
                </div>
            `;
        } else if (activeTicket) {
            // Caso B: Pendiente de Pago
            const mins = Math.max(1, Math.round((Date.now() - new Date(activeTicket.fechaIngreso).getTime()) / 60000));
            const calc = calculateStayFee(activeTicket.tipoVehiculo, mins, 'MINUTE');

            container.innerHTML = `
                <div class="exit-hero-card" style="border-left:4px solid var(--rose);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span style="font-size:1.6rem; color:var(--rose);">⛔</span>
                            <div>
                                <h3 style="color:var(--rose); font-size:1.15rem; font-weight:800; margin:0;">Estadía Pendiente de Pago</h3>
                                <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Se requiere Paz y Salvo antes de autorizar la salida</p>
                            </div>
                        </div>
                        <span class="role-badge-tag pill-rose">Saldo Pendiente</span>
                    </div>
                    <p style="font-size:0.82rem; color:var(--text-body); margin-bottom:1rem;">
                        Tu vehículo con placa <strong>${plate}</strong> lleva <strong>${mins} minutos</strong> de permanencia acumulada en la bahía <strong>${activeTicket.spotCodigo}</strong> (Total: <strong>$${calc.total.toLocaleString('es-CO')} COP</strong>).
                    </p>
                    <button type="button" class="btn btn-primary" onclick="quickProceedToPay('${plate}')" style="width:100%; height:44px; font-weight:800;">
                        <span>💳</span> Ir al Módulo de Pago de Estadía →
                    </button>
                </div>
            `;
        } else {
            // Caso C: No encontrado
            container.innerHTML = `
                <div class="exit-hero-card" style="border-left:4px solid var(--amber);">
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <span style="font-size:1.5rem; color:var(--amber);">⚠️</span>
                        <div>
                            <strong style="font-size:0.95rem; color:var(--text-heading);">Sin Registro Activo para Salida</strong>
                            <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">
                                No se encontró ningún ingreso activo para la placa <strong>${plate}</strong>. Si ya registraste tu salida anteriormente, la bahía ya fue liberada.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 5. Ejecutar Salida y Liberar Bahía
    async function executeClientExit(plate, bayCode) {
        try {
            // Si la bahía aún está marcada como OCUPADA, liberarla en MySQL
            const spot = (saasState.spots || []).find(s => s.codigo === bayCode);
            if (spot && spot.id) {
                await fetch(`${API_BASE}/spots.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: spot.id,
                        estado: 'DISPONIBLE',
                        placaActual: null
                    })
                });
            }

            // Limpiar Paz y Salvo consumido
            localStorage.removeItem('parkflow_pz_' + plate);

            // Mostrar pantalla de despedida exitosa
            const container = document.getElementById('clientExitStatusContainer');
            if (container) {
                container.innerHTML = `
                    <div class="paz-salvo-card" style="border-color:var(--emerald); text-align:center; padding:2rem 1.5rem;">
                        <div style="font-size:3rem; margin-bottom:0.5rem;">👋🚗</div>
                        <h3 style="font-size:1.35rem; font-weight:800; color:var(--emerald); margin-bottom:0.4rem;">
                            ¡Salida Confirmada! Buen Viaje
                        </h3>
                        <p style="font-size:0.85rem; color:var(--text-body); max-width:500px; margin:0 auto 1.25rem; line-height:1.5;">
                            La barrera vehicular ha sido autorizada. La bahía <strong>${bayCode}</strong> ha sido liberada exitosamente a <strong>DISPONIBLE</strong> en ParkFlow.
                        </p>
                        <div style="display:flex; justify-content:center; gap:0.75rem;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="switchSaasView('view-client-bays')">
                                🗺️ Ver Disponibilidad de Bahías
                            </button>
                            <button type="button" class="btn btn-primary btn-sm" onclick="switchSaasView('view-client-entry')">
                                🚗 Nuevo Registro de Vehículo
                            </button>
                        </div>
                    </div>
                `;
            }

            // Sincronizar datos de la base de datos
            await syncAllFromDatabase();
            showRbacToast(`🚗 ¡Salida registrada! Bahía <strong>${bayCode}</strong> liberada.`, false);

        } catch (e) {
            alert('Error liberando bahía: ' + e.message);
        }
    }

    // 6. Historial de Estancias del Cliente
    function renderClientHistoryTable() {
        const tbody = document.getElementById('clientHistoryTableBody');
        if (!tbody) return;
        const completed = (saasState.tickets || []).filter(t => t.estado === 'FINALIZADO').slice(0, 10);
        if (completed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">No hay estancias registradas aún.</td></tr>';
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

    // Compatibilidad con buscador previo
    function handleSaasClientSearch() {
        handleClientPaymentSearch();
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
    window.handleClientPaymentSearch = handleClientPaymentSearch;
    window.selectClientPaymentMethod = selectClientPaymentMethod;
    window.executeClientPayment = executeClientPayment;
    window.proceedToExitAfterPayment = proceedToExitAfterPayment;
    window.handleClientExitSearch = handleClientExitSearch;
    window.executeClientExit = executeClientExit;
    window.renderClientHistoryTable = renderClientHistoryTable;
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