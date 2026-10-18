/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ParkFlow - Premium SaaS Dashboard Layout
 * Full sidebar-based dashboard with XAMPP/MySQL backend
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LogOut, ShieldAlert, CheckCircle2, X, UserCheck, Database,
  RefreshCw, Menu, Car, LayoutDashboard, Settings, Users,
  BarChart3, ShieldCheck, Bell, TrendingUp, MapPin, Activity,
  DollarSign, AlertTriangle,
} from 'lucide-react';
import {
  AuditLog, ParkingLog, ParkingSpot, PaymentMethod,
  RateConfig, RoleType, UserAccount, VehicleType,
} from './types/parking';
import {
  INITIAL_AUDIT_LOGS, INITIAL_RATES, INITIAL_SPOTS,
  INITIAL_USERS, INITIAL_LOGS, formatCOP,
} from './data/initialData';
import { LoginView } from './components/LoginView';
import { OperatorWorkspace } from './components/OperatorWorkspace';
import { ClientPortal } from './components/ClientPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { XamppStatusModal } from './components/XamppStatusModal';
import { parkFlowApi, BackendStatus } from './services/api';
import operatorAvatarImg from './assets/images/operator_profile_avatar_1791411155955.jpg';

type ActiveModuleView = 'DASHBOARD' | 'PANEL_OPERATIVO' | 'PANEL_ADMINISTRATIVO' | 'PORTAL_CLIENTE';

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [spots, setSpots] = useState<ParkingSpot[]>(INITIAL_SPOTS);
  const [rates, setRates] = useState<RateConfig[]>(INITIAL_RATES);
  const [logs, setLogs] = useState<ParkingLog[]>(INITIAL_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeView, setActiveView] = useState<ActiveModuleView>('DASHBOARD');
  const [unauthorizedRedirectMsg, setUnauthorizedRedirectMsg] = useState<string | null>(null);
  const [rbacForbiddenBanner, setRbacForbiddenBanner] = useState<{ attemptedView: string; requiredRole: RoleType; } | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const availableSpotsCount = useMemo(() => spots.filter(s => s.estado === 'DISPONIBLE').length, [spots]);
  const occupiedSpotsCount = useMemo(() => spots.filter(s => s.estado === 'OCUPADO').length, [spots]);
  const activeTickets = useMemo(() => logs.filter(l => l.estado === 'ACTIVO').length, [logs]);
  const todayRevenue = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return logs
      .filter(l => l.estado === 'FINALIZADO' && l.fechaSalida && new Date(l.fechaSalida) >= today)
      .reduce((sum, l) => sum + (l.valorPagado || 0), 0);
  }, [logs]);

  const refreshBackendData = async () => {
    setIsSyncing(true);
    try {
      const status = await parkFlowApi.getStatus();
      setBackendStatus(status);
      if (status.connected) {
        const [spotsData, ratesData, ticketsData, usersData, auditData] = await Promise.all([
          parkFlowApi.getSpots(), parkFlowApi.getRates(), parkFlowApi.getTickets(),
          parkFlowApi.getUsers(), parkFlowApi.getAuditLogs(),
        ]);
        if (spotsData.length > 0) setSpots(spotsData);
        if (ratesData.length > 0) setRates(ratesData);
        if (ticketsData.length > 0) setLogs(ticketsData);
        if (usersData.length > 0) setUsers(usersData);
        if (auditData.length > 0) setAuditLogs(auditData);
      }
    } catch (e) {
      console.warn('Conexion con PHP XAMPP no disponible:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { refreshBackendData(); }, []);

  const appendAuditLog = (
    accion: string, modulo: AuditLog['modulo'], detalle: string,
    resultado: AuditLog['resultado'], overrideUser?: UserAccount
  ) => {
    const actor = overrideUser || currentUser;
    const timestamp = new Date().toLocaleString('es-CO');
    const newEntry: AuditLog = {
      id: `AUD-${9005 + auditLogs.length}`,
      usuarioEmail: actor ? actor.email : 'anonimo@visitante.co',
      rol: actor ? actor.rol : 'Cliente',
      accion, modulo, detalle, timestamp, resultado,
    };
    setAuditLogs(prev => [newEntry, ...prev]);
    parkFlowApi.logAudit({
      usuarioEmail: newEntry.usuarioEmail, rol: newEntry.rol,
      accion, modulo, detalle, timestamp, resultado
    }).catch(() => {});
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setUnauthorizedRedirectMsg(null);
    setRbacForbiddenBanner(null);
    parkFlowApi.loginUser(user.email).catch(() => {});
    if (user.rol === 'Cliente') setActiveView('PORTAL_CLIENTE');
    else setActiveView('DASHBOARD');
    appendAuditLog('AUTH_LOGIN_SUCCESS', 'AUTH', `Inicio de sesion: ${user.email} (${user.rol})`, 'OK', user);
  };

  const handleLogout = () => {
    if (currentUser) appendAuditLog('AUTH_LOGOUT', 'AUTH', `Cierre de sesion: ${currentUser.email}`, 'OK');
    setCurrentUser(null);
    setRbacForbiddenBanner(null);
    setMobileSidebarOpen(false);
  };

  const handleNavigateModule = (target: ActiveModuleView) => {
    if (!currentUser) { setUnauthorizedRedirectMsg('Debe iniciar sesion.'); return; }
    if (target === 'PANEL_ADMINISTRATIVO' && currentUser.rol !== 'Administrador') {
      setRbacForbiddenBanner({ attemptedView: 'Panel Administrativo', requiredRole: 'Administrador' });
      appendAuditLog('RBAC_403_FORBIDDEN', 'RBAC_SECURITY',
        `Bloqueo 403: "${currentUser.rol}" intento acceder al Panel Administrativo`, 'BLOQUEADO_403');
      return;
    }
    if (target === 'PANEL_OPERATIVO' && currentUser.rol === 'Cliente') {
      setRbacForbiddenBanner({ attemptedView: 'Panel Operativo', requiredRole: 'Operador' });
      appendAuditLog('RBAC_403_FORBIDDEN', 'RBAC_SECURITY',
        `Bloqueo 403: "Cliente" intento acceder al Panel Operativo`, 'BLOQUEADO_403');
      return;
    }
    setRbacForbiddenBanner(null);
    setActiveView(target);
    setMobileSidebarOpen(false);
  };

  const handleQuickSwitchRole = (role: RoleType) => {
    const matched = users.find(u => u.rol === role && u.activo) || users[0];
    handleLoginSuccess(matched);
  };

  const handleRegisterEntry = ({
    placa, tipoVehiculo, spotCodigo, propietarioNombre,
  }: {
    placa: string; tipoVehiculo: VehicleType; spotCodigo: string; propietarioNombre?: string;
  }): { ok: boolean; error?: string; createdLog?: ParkingLog } => {
    const existingActive = logs.find(l => l.estado === 'ACTIVO' && l.placa.toUpperCase() === placa.toUpperCase());
    if (existingActive) {
      appendAuditLog('DUPLICATE_ACTIVE_PLATE_REJECTED', 'FLUJO_VEHICULAR',
        `Rechazo: Placa ${placa} ya en bahia ${existingActive.spotCodigo}`, 'ALERTA');
      return { ok: false, error: `Vehiculo dentro del parqueadero: La placa ${placa} ya registra una estancia activa en la bahia ${existingActive.spotCodigo} (Ticket ${existingActive.ticketCodigo}).` };
    }
    const targetSpot = spots.find(s => s.codigo === spotCodigo);
    if (!targetSpot || targetSpot.estado !== 'DISPONIBLE') {
      return { ok: false, error: `La bahia ${spotCodigo} no se encuentra disponible.` };
    }
    const ticketNumber = 8846 + logs.length;
    const createdLog: ParkingLog = {
      id: `LOG-${1008 + logs.length}`, ticketCodigo: `TCK-2026-${ticketNumber}`,
      placa, tipoVehiculo, spotCodigo, fechaIngreso: new Date().toISOString(),
      estado: 'ACTIVO', operadorEntrada: currentUser?.nombre || 'Operador de Turno',
      cruzoMedianoche: false, propietarioNombre,
    };
    setSpots(prev => prev.map(s =>
      s.codigo === spotCodigo ? { ...s, estado: 'OCUPADO', placaActual: placa, ticketActualId: createdLog.ticketCodigo } : s
    ));
    setLogs(prev => [createdLog, ...prev]);
    appendAuditLog('VEHICLE_ENTRY_REGISTERED', 'FLUJO_VEHICULAR',
      `Ingreso ${placa} (${tipoVehiculo}) en bahia ${spotCodigo} - Ticket ${createdLog.ticketCodigo}`, 'OK');
    parkFlowApi.registerEntry({
      placa, tipoVehiculo, spotCodigo,
      operadorEntrada: currentUser?.nombre || 'Operador de Turno',
      operadorEmail: currentUser?.email, propietarioNombre,
    }).then(() => parkFlowApi.getStatus().then(setBackendStatus)).catch(() => {});
    return { ok: true, createdLog };
  };

  const handleRegisterExit = ({
    logId, metodoPago, valorPagado, minutosTranscurridos, cruzoMedianoche, fechaSalidaISO,
  }: {
    logId: string; metodoPago: PaymentMethod; valorPagado: number;
    minutosTranscurridos: number; cruzoMedianoche: boolean; fechaSalidaISO: string;
  }): { ok: boolean; error?: string; completedLog?: ParkingLog } => {
    const targetLog = logs.find(l => l.id === logId && l.estado === 'ACTIVO');
    if (!targetLog) return { ok: false, error: 'Registro activo no encontrado.' };
    const completedLog: ParkingLog = {
      ...targetLog, fechaSalida: fechaSalidaISO, minutosTranscurridos, valorPagado,
      metodoPago, estado: 'FINALIZADO',
      operadorSalida: currentUser?.nombre || 'Operador de Turno', cruzoMedianoche,
    };
    setSpots(prev => prev.map(s =>
      s.codigo === targetLog.spotCodigo ? { ...s, estado: 'DISPONIBLE', placaActual: undefined, ticketActualId: undefined } : s
    ));
    setLogs(prev => prev.map(l => l.id === logId ? completedLog : l));
    appendAuditLog('VEHICLE_EXIT_AND_PAYMENT', 'FLUJO_VEHICULAR',
      `Salida ${targetLog.placa} - Bahia ${targetLog.spotCodigo} liberada - ${formatCOP(valorPagado)} (${metodoPago})`, 'OK');
    parkFlowApi.registerExit({
      logId, metodoPago, valorPagado, minutosTranscurridos, cruzoMedianoche, fechaSalidaISO,
      operadorSalida: currentUser?.nombre || 'Operador de Turno', operadorEmail: currentUser?.email,
    }).then(() => parkFlowApi.getStatus().then(setBackendStatus)).catch(() => {});
    return { ok: true, completedLog };
  };

  const handleShiftEntryTimeForMidnightTest = (logId: string, hoursBack: number) => {
    setLogs(prev => prev.map(l => {
      if (l.id !== logId) return l;
      return { ...l, fechaIngreso: new Date(new Date(l.fechaIngreso).getTime() - hoursBack * 3600000).toISOString(), cruzoMedianoche: true };
    }));
    appendAuditLog('MIDNIGHT_CROSSING_SIMULATION', 'TARIFAS', `Ajuste -${hoursBack}h en registro ${logId}`, 'OK');
    parkFlowApi.shiftEntryTimeForMidnight(logId, hoursBack, currentUser?.email).catch(() => {});
  };

  const handleUpdateRate = (updated: RateConfig) => {
    setRates(prev => prev.map(r => r.id === updated.id ? updated : r));
    appendAuditLog('RATE_UPDATED', 'TARIFAS', `Tarifa ${updated.tipoVehiculo}: ${formatCOP(updated.tarifaPorHora)}/h`, 'OK');
    parkFlowApi.updateRate(updated).catch(() => {});
  };

  const handleToggleSpotMaintenance = (spotId: string) => {
    const target = spots.find(s => s.id === spotId);
    if (!target || target.estado === 'OCUPADO') return;
    const nextState = target.estado === 'BLOQUEADO' ? 'DISPONIBLE' : 'BLOQUEADO';
    setSpots(prev => prev.map(s => s.id === spotId ? { ...s, estado: nextState } : s));
    appendAuditLog('SPOT_STATUS_CHANGED', 'ESPACIOS', `Bahia ${target.codigo} -> ${nextState}`, 'OK');
    parkFlowApi.toggleSpotMaintenance(spotId).catch(() => {});
  };

  const handleCreateUser = (newUser: Omit<UserAccount, 'id' | 'ultimoAcceso'>): { ok: boolean; error?: string } => {
    if (!newUser.nombre || newUser.nombre.length < 3) return { ok: false, error: 'Nombre debe tener al menos 3 caracteres.' };
    if (!newUser.email || !newUser.email.includes('@')) return { ok: false, error: 'Correo invalido.' };
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase()))
      return { ok: false, error: 'Restriccion UNIQUE: correo ya registrado.' };
    const created: UserAccount = { ...newUser, id: `USR-00${users.length + 1}`, ultimoAcceso: 'Recien creado' };
    setUsers(prev => [created, ...prev]);
    appendAuditLog('USER_CREATED', 'USUARIOS', `Nuevo usuario ${created.email} (${created.rol})`, 'OK');
    parkFlowApi.createUser(newUser, currentUser?.email).then(() => parkFlowApi.getStatus().then(setBackendStatus)).catch(() => {});
    return { ok: true };
  };

  const handleUpdateUserRole = (userId: string, newRole: RoleType) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, rol: newRole } : u));
    if (currentUser && currentUser.id === userId) setCurrentUser(prev => prev ? { ...prev, rol: newRole } : null);
    appendAuditLog('USER_ROLE_UPDATED', 'USUARIOS', `Rol ${userId} -> ${newRole}`, 'OK');
    parkFlowApi.updateUserRole(userId, newRole).catch(() => {});
  };

  const handleToggleUserActive = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, activo: !u.activo } : u));
    appendAuditLog('USER_STATUS_TOGGLED', 'USUARIOS', `Cambio activo/inactivo: ${userId}`, 'OK');
    parkFlowApi.toggleUserActive(userId).catch(() => {});
  };

  if (!currentUser) {
    return (
      <>
        <LoginView
          users={users} onLoginSuccess={handleLoginSuccess}
          unauthorizedRedirectMsg={unauthorizedRedirectMsg}
          totalSpots={spots.length} availableSpots={availableSpotsCount}
          backendStatus={backendStatus} onOpenDbModal={() => setShowDbModal(true)}
        />
        <XamppStatusModal isOpen={showDbModal} onClose={() => setShowDbModal(false)}
          status={backendStatus} onRefresh={refreshBackendData} />
      </>
    );
  }

  const occupancyPct = Math.round((occupiedSpotsCount / spots.length) * 100);
  const viewLabel: Record<ActiveModuleView, string> = {
    DASHBOARD: 'Dashboard',
    PANEL_OPERATIVO: 'Panel Operativo',
    PANEL_ADMINISTRATIVO: 'Administracion',
    PORTAL_CLIENTE: 'Portal Cliente',
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Car size={20} color="#060912" />
          </div>
          <span className="sidebar-brand-text">Park<span>Flow</span></span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Principal</div>

          {(currentUser.rol === 'Administrador' || currentUser.rol === 'Operador') && (
            <button type="button"
              onClick={() => handleNavigateModule('DASHBOARD')}
              className={`sidebar-nav-item ${activeView === 'DASHBOARD' ? 'active' : ''}`}>
              <LayoutDashboard className="nav-icon" />
              <span className="nav-label">Dashboard</span>
            </button>
          )}

          {(currentUser.rol === 'Administrador' || currentUser.rol === 'Operador') && (
            <button type="button"
              onClick={() => handleNavigateModule('PANEL_OPERATIVO')}
              className={`sidebar-nav-item ${activeView === 'PANEL_OPERATIVO' ? 'active' : ''}`}>
              <Car className="nav-icon" />
              <span className="nav-label">Panel Operativo</span>
              {activeTickets > 0 && <span className="nav-badge">{activeTickets}</span>}
            </button>
          )}

          {currentUser.rol === 'Administrador' && (
            <button type="button"
              onClick={() => handleNavigateModule('PANEL_ADMINISTRATIVO')}
              className={`sidebar-nav-item ${activeView === 'PANEL_ADMINISTRATIVO' ? 'active' : ''}`}>
              <Settings className="nav-icon" />
              <span className="nav-label">Administracion</span>
            </button>
          )}

          <button type="button"
            onClick={() => handleNavigateModule('PORTAL_CLIENTE')}
            className={`sidebar-nav-item ${activeView === 'PORTAL_CLIENTE' ? 'active' : ''}`}>
            <Users className="nav-icon" />
            <span className="nav-label">Portal Cliente</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '12px' }}>Sistema</div>

          <button type="button" onClick={() => setShowDbModal(true)} className="sidebar-nav-item">
            <Database className="nav-icon" />
            <span className="nav-label">Estado MySQL</span>
            <span className="pulse-dot"
              style={{ background: backendStatus?.connected ? '#34d399' : '#f87171' }} />
          </button>

          <button type="button" className="sidebar-nav-item">
            <ShieldCheck className="nav-icon" />
            <span className="nav-label">Auditoria</span>
            <span className="nav-badge">{auditLogs.length}</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '12px' }}>Rol Activo</div>
          <div style={{ padding: '4px 10px' }}>
            <select
              aria-label="Cambiar Rol RBAC"
              value={currentUser.rol}
              onChange={e => handleQuickSwitchRole(e.target.value as RoleType)}
              className="form-input form-select"
              style={{ fontSize: '12px', padding: '8px 32px 8px 10px' }}>
              <option value="Operador">Operador</option>
              <option value="Administrador">Administrador</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'var(--color-bg-hover)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,212,170,0.3)', flexShrink: 0 }}>
              {!avatarFailed ? (
                <img src={operatorAvatarImg} alt={currentUser.nombre}
                  onError={() => setAvatarFailed(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', fontWeight: 700, fontSize: '14px' }}>
                  {currentUser.nombre.charAt(0)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.nombre}
              </div>
              <div style={{ fontSize: '11px', color: '#00d4aa' }}>{currentUser.rol}</div>
            </div>
            <button type="button" onClick={handleLogout} title="Cerrar sesion"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div className="sidebar-overlay show"
          onClick={() => setMobileSidebarOpen(false)}
          style={{ display: 'block' }} />
      )}

      {/* MAIN AREA */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" id="mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(v => !v)}
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}>
              <Menu size={18} />
            </button>
            <style>{`@media(max-width:1024px){#mobile-menu-btn{display:flex !important}}`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>ParkFlow</span>
              <span style={{ color: 'var(--color-text-muted)' }}>/</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{viewLabel[activeView]}</span>
            </div>
          </div>
          <div className="topbar-right">
            <button type="button" onClick={refreshBackendData} disabled={isSyncing}
              className="btn btn-ghost btn-sm" title="Sincronizar con MySQL">
              <RefreshCw size={13} />
              <span style={{ fontSize: '12px' }}>{isSyncing ? 'Sync...' : 'Sync'}</span>
            </button>
            <button type="button" onClick={() => setShowDbModal(true)}
              className={`btn btn-sm ${backendStatus?.connected ? 'btn-ghost' : 'btn-danger'}`}
              style={{ gap: '6px', fontSize: '12px' }}>
              <Database size={13} />
              <span>{backendStatus?.connected ? 'MySQL OK' : 'Offline'}</span>
              <span className="pulse-dot"
                style={{ background: backendStatus?.connected ? '#34d399' : '#f87171' }} />
            </button>
            <button type="button" className="btn btn-ghost btn-icon" title="Notificaciones">
              <Bell size={16} />
            </button>
          </div>
        </header>

        {/* RBAC 403 Banner */}
        {rbacForbiddenBanner && (
          <div style={{ margin: '16px 28px 0' }}>
            <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <ShieldAlert size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
                    HTTP 403 FORBIDDEN — Violacion de RBAC
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                    Rol <strong style={{ color: 'var(--color-text-primary)' }}>{currentUser.rol}</strong> no tiene acceso a{' '}
                    <strong style={{ color: 'var(--color-text-primary)' }}>{rbacForbiddenBanner.attemptedView}</strong>{' '}
                    (requiere <strong style={{ color: '#fbbf24' }}>{rbacForbiddenBanner.requiredRole}</strong>).
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button type="button"
                  onClick={() => handleQuickSwitchRole(rbacForbiddenBanner.requiredRole)}
                  className="btn btn-sm"
                  style={{ background: '#00d4aa', color: '#060912', fontWeight: 600 }}>
                  <UserCheck size={13} /> Cambiar a {rbacForbiddenBanner.requiredRole}
                </button>
                <button type="button" onClick={() => setRbacForbiddenBanner(null)}
                  className="btn btn-ghost btn-sm btn-icon">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="page-container page-enter">
          {/* DASHBOARD HOME */}
          {activeView === 'DASHBOARD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    Bienvenido, {currentUser.nombre.split(' ')[0]} 👋
                  </h1>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                    Resumen en tiempo real del sistema ParkFlow — {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button type="button" onClick={() => handleNavigateModule('PANEL_OPERATIVO')}
                  className="btn btn-primary">
                  <Car size={15} /> Panel Operativo
                </button>
              </div>

              {/* KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                <div className="stat-card accent-teal">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Espacios Disponibles</div>
                      <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {availableSpotsCount}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>de {spots.length} totales</div>
                    </div>
                    <div className="stat-icon teal"><MapPin size={22} /></div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{ width: `${(availableSpotsCount/spots.length)*100}%`, background: 'linear-gradient(90deg,#00d4aa,#00b8ff)' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    {Math.round((availableSpotsCount/spots.length)*100)}% disponibilidad
                  </div>
                </div>

                <div className="stat-card accent-amber">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehiculos en Parqueo</div>
                      <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {occupiedSpotsCount}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Ocupacion: {occupancyPct}%</div>
                    </div>
                    <div className="stat-icon amber"><Car size={22} /></div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{ width: `${occupancyPct}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>{occupancyPct}% de capacidad en uso</div>
                </div>

                <div className="stat-card accent-blue">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets Activos</div>
                      <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {activeTickets}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>estancias en curso</div>
                    </div>
                    <div className="stat-icon blue"><Activity size={22} /></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '22px' }}>
                    <span className="pulse-dot" style={{ background: '#3b82f6' }} />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Actualizacion en tiempo real</span>
                  </div>
                </div>

                <div className="stat-card accent-green">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos Hoy</div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                        {formatCOP(todayRevenue)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>COP cobrados</div>
                    </div>
                    <div className="stat-icon green"><DollarSign size={22} /></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '22px' }}>
                    <TrendingUp size={13} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '11px', color: '#10b981' }}>Sincronizado con MySQL</span>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '14px' }}>Acciones Rapidas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button type="button" onClick={() => handleNavigateModule('PANEL_OPERATIVO')} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                      <Car size={15} style={{ color: '#00d4aa' }} /> Registrar Entrada/Salida
                    </button>
                    {currentUser.rol === 'Administrador' && (
                      <>
                        <button type="button" onClick={() => handleNavigateModule('PANEL_ADMINISTRATIVO')} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                          <BarChart3 size={15} style={{ color: '#3b82f6' }} /> Reportes y Tarifas
                        </button>
                        <button type="button" onClick={() => handleNavigateModule('PANEL_ADMINISTRATIVO')} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                          <Users size={15} style={{ color: '#8b5cf6' }} /> Gestionar Usuarios RBAC
                        </button>
                      </>
                    )}
                    <button type="button" onClick={refreshBackendData} disabled={isSyncing} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                      <RefreshCw size={15} style={{ color: '#f59e0b' }} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar con MySQL'}
                    </button>
                  </div>
                  <div className="divider" />
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>MySQL:</span>
                      <span style={{ color: backendStatus?.connected ? '#34d399' : '#f87171' }}>
                        {backendStatus?.connected ? 'Conectado' : 'Offline'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tickets en DB:</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{backendStatus?.totalTickets ?? '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Usuarios activos:</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{users.filter(u => u.activo).length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Logs auditoria:</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{auditLogs.length}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Actividad Reciente</div>
                    <span className="badge badge-teal">{auditLogs.length} eventos</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Evento</th>
                          <th>Modulo</th>
                          <th>Usuario</th>
                          <th>Estado</th>
                          <th>Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.slice(0, 9).map(log => (
                          <tr key={log.id}>
                            <td className="primary-cell" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                              {log.accion.replace(/_/g, ' ')}
                            </td>
                            <td><span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 8px' }}>{log.modulo}</span></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{log.usuarioEmail.split('@')[0]}</td>
                            <td>
                              <span className={`badge ${log.resultado === 'OK' ? 'badge-green' : log.resultado === 'ALERTA' ? 'badge-amber' : 'badge-red'}`}>
                                {log.resultado}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {log.timestamp.split(',')[1]?.trim() || log.timestamp}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Spot Map */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Mapa de Bahias en Tiempo Real
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(16,185,129,0.5)', display: 'inline-block' }} />
                      Disponible ({availableSpotsCount})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(239,68,68,0.5)', display: 'inline-block' }} />
                      Ocupado ({occupiedSpotsCount})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(245,158,11,0.5)', display: 'inline-block' }} />
                      Bloqueado ({spots.filter(s => s.estado === 'BLOQUEADO').length})
                    </span>
                  </div>
                </div>
                <div className="spot-grid">
                  {spots.map(spot => (
                    <div
                      key={spot.id}
                      className={`spot-cell ${spot.estado.toLowerCase()}`}
                      title={`${spot.codigo} — ${spot.estado}${spot.placaActual ? ` — ${spot.placaActual}` : ''}`}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 700 }}>{spot.codigo}</span>
                      {spot.placaActual && (
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>{spot.placaActual.slice(-3)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'PANEL_OPERATIVO' && (
            <OperatorWorkspace
              currentUser={currentUser} spots={spots} logs={logs} rates={rates}
              onRegisterEntry={handleRegisterEntry} onRegisterExit={handleRegisterExit}
              onShiftEntryTimeForMidnightTest={handleShiftEntryTimeForMidnightTest}
              onLogAuditEvent={(accion, modulo, detalle, resultado) =>
                appendAuditLog(accion, modulo, detalle, resultado)
              }
            />
          )}

          {activeView === 'PANEL_ADMINISTRATIVO' && (
            <AdminDashboard
              spots={spots} logs={logs} rates={rates} users={users} auditLogs={auditLogs}
              onUpdateRate={handleUpdateRate} onToggleSpotMaintenance={handleToggleSpotMaintenance}
              onCreateUser={handleCreateUser} onUpdateUserRole={handleUpdateUserRole}
              onToggleUserActive={handleToggleUserActive}
            />
          )}

          {activeView === 'PORTAL_CLIENTE' && (
            <ClientPortal
              currentUser={currentUser} spots={spots} logs={logs} rates={rates}
              onTriggerRbac403={route =>
                appendAuditLog('RBAC_403_FORBIDDEN', 'RBAC_SECURITY',
                  `Bloqueo 403 - Cliente intento ruta ${route}`, 'BLOQUEADO_403')
              }
            />
          )}
        </div>
      </div>

      <XamppStatusModal isOpen={showDbModal} onClose={() => setShowDbModal(false)}
        status={backendStatus} onRefresh={refreshBackendData} />
    </div>
  );
}
