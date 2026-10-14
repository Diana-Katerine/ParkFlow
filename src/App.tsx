/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogOut, ShieldAlert, CheckCircle2, X, UserCheck } from 'lucide-react';
import {
  AuditLog,
  ParkingLog,
  ParkingSpot,
  PaymentMethod,
  RateConfig,
  RoleType,
  UserAccount,
  VehicleType,
} from './types/parking';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_RATES,
  INITIAL_SPOTS,
  INITIAL_USERS,
  INITIAL_LOGS,
} from './data/initialData';
import { LoginView } from './components/LoginView';
import { OperatorWorkspace } from './components/OperatorWorkspace';
import { ClientPortal } from './components/ClientPortal';
import { AdminDashboard } from './components/AdminDashboard';
import operatorAvatarImg from './assets/images/operator_profile_avatar_1791411155955.jpg';

type ActiveModuleView = 'PANEL_OPERATIVO' | 'PANEL_ADMINISTRATIVO' | 'PORTAL_CLIENTE';

export default function App() {
  // Application State (Persisted in memory with realistic initial telemetry)
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [spots, setSpots] = useState<ParkingSpot[]>(INITIAL_SPOTS);
  const [rates, setRates] = useState<RateConfig[]>(INITIAL_RATES);
  const [logs, setLogs] = useState<ParkingLog[]>(INITIAL_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Auth & RBAC State: Starts on LoginView as mandated by User Flow Section 1
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeView, setActiveView] = useState<ActiveModuleView>('PANEL_OPERATIVO');
  const [unauthorizedRedirectMsg, setUnauthorizedRedirectMsg] = useState<string | null>(null);
  const [rbacForbiddenBanner, setRbacForbiddenBanner] = useState<{
    attemptedView: string;
    requiredRole: RoleType;
  } | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const appendAuditLog = (
    accion: string,
    modulo: AuditLog['modulo'],
    detalle: string,
    resultado: AuditLog['resultado'],
    overrideUser?: UserAccount
  ) => {
    const actor = overrideUser || currentUser;
    const newEntry: AuditLog = {
      id: `AUD-${9005 + auditLogs.length}`,
      usuarioEmail: actor ? actor.email : 'anonimo@visitante.co',
      rol: actor ? actor.rol : 'Cliente',
      accion,
      modulo,
      detalle,
      timestamp: new Date().toLocaleString('es-CO'),
      resultado,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Login & Role-based Automatic Redirect (User Flow 1)
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setUnauthorizedRedirectMsg(null);
    setRbacForbiddenBanner(null);

    if (user.rol === 'Cliente') {
      setActiveView('PORTAL_CLIENTE');
    } else if (user.rol === 'Operador') {
      setActiveView('PANEL_OPERATIVO');
    } else {
      setActiveView('PANEL_ADMINISTRATIVO');
    }

    appendAuditLog(
      'AUTH_LOGIN_SUCCESS',
      'AUTH',
      `Inicio de sesión exitoso y redirección automática al módulo de ${user.rol}`,
      'OK',
      user
    );
  };

  const handleLogout = () => {
    if (currentUser) {
      appendAuditLog(
        'AUTH_LOGOUT',
        'AUTH',
        `Cierre de sesión voluntario de ${currentUser.email}`,
        'OK'
      );
    }
    setCurrentUser(null);
    setRbacForbiddenBanner(null);
  };

  // RBAC Navigation Enforcement (PRD Section 2.2 & Case #7: 403 Forbidden)
  const handleNavigateModule = (target: ActiveModuleView) => {
    if (!currentUser) {
      setUnauthorizedRedirectMsg('Debe iniciar sesión para acceder a rutas protegidas.');
      return;
    }

    if (target === 'PANEL_ADMINISTRATIVO' && currentUser.rol !== 'Administrador') {
      setRbacForbiddenBanner({
        attemptedView: 'Panel Administrativo (Reportes, Tarifas, Usuarios)',
        requiredRole: 'Administrador',
      });
      appendAuditLog(
        'RBAC_403_FORBIDDEN',
        'RBAC_SECURITY',
        `Bloqueo HTTP 403: Rol "${currentUser.rol}" intentó acceder al Panel Administrativo`,
        'BLOQUEADO_403'
      );
      return;
    }

    if (target === 'PANEL_OPERATIVO' && currentUser.rol === 'Cliente') {
      setRbacForbiddenBanner({
        attemptedView: 'Panel Operativo (Registro Entradas/Salidas y Cobros)',
        requiredRole: 'Operador',
      });
      appendAuditLog(
        'RBAC_403_FORBIDDEN',
        'RBAC_SECURITY',
        `Bloqueo HTTP 403: Rol "Cliente" intentó acceder al Panel Operativo`,
        'BLOQUEADO_403'
      );
      return;
    }

    setRbacForbiddenBanner(null);
    setActiveView(target);
  };

  // Instant Role Switcher for Evaluator Convenience
  const handleQuickSwitchRole = (role: RoleType) => {
    const matched = users.find((u) => u.rol === role && u.activo) || users[0];
    handleLoginSuccess(matched);
  };

  // 1. Register Vehicle Entry (PRD 3.2 + Case #1 Duplicate Active Stay)
  const handleRegisterEntry = ({
    placa,
    tipoVehiculo,
    spotCodigo,
    propietarioNombre,
  }: {
    placa: string;
    tipoVehiculo: VehicleType;
    spotCodigo: string;
    propietarioNombre?: string;
  }): { ok: boolean; error?: string; createdLog?: ParkingLog } => {
    // Check if plate is already in an active stay (Case #1)
    const existingActive = logs.find(
      (l) => l.estado === 'ACTIVO' && l.placa.toUpperCase() === placa.toUpperCase()
    );
    if (existingActive) {
      appendAuditLog(
        'DUPLICATE_ACTIVE_PLATE_REJECTED',
        'FLUJO_VEHICULAR',
        `Rechazo de ingreso duplicado: Placa ${placa} ya está en la bahía ${existingActive.spotCodigo}`,
        'ALERTA'
      );
      return {
        ok: false,
        error: `Vehículo dentro del parqueadero: La placa ${placa} ya registra una estancia activa en la bahía ${existingActive.spotCodigo} (Ticket ${existingActive.ticketCodigo}).`,
      };
    }

    // Check spot availability
    const targetSpot = spots.find((s) => s.codigo === spotCodigo);
    if (!targetSpot || targetSpot.estado !== 'DISPONIBLE') {
      return {
        ok: false,
        error: `La bahía ${spotCodigo} no se encuentra disponible.`,
      };
    }

    const ticketNumber = 8846 + logs.length;
    const createdLog: ParkingLog = {
      id: `LOG-${1008 + logs.length}`,
      ticketCodigo: `TCK-2026-${ticketNumber}`,
      placa,
      tipoVehiculo,
      spotCodigo,
      fechaIngreso: new Date().toISOString(),
      estado: 'ACTIVO',
      operadorEntrada: currentUser?.nombre || 'Operador de Turno',
      cruzoMedianoche: false,
      propietarioNombre,
    };

    // Update Spot to OCUPADO immediately
    setSpots((prev) =>
      prev.map((s) =>
        s.codigo === spotCodigo
          ? {
              ...s,
              estado: 'OCUPADO',
              placaActual: placa,
              ticketActualId: createdLog.ticketCodigo,
            }
          : s
      )
    );

    setLogs((prev) => [createdLog, ...prev]);

    appendAuditLog(
      'VEHICLE_ENTRY_REGISTERED',
      'FLUJO_VEHICULAR',
      `Ingreso de ${placa} (${tipoVehiculo}) en bahía ${spotCodigo} · Ticket ${createdLog.ticketCodigo}`,
      'OK'
    );

    return { ok: true, createdLog };
  };

  // 2. Register Vehicle Exit & Release Spot (PRD 3.4)
  const handleRegisterExit = ({
    logId,
    metodoPago,
    valorPagado,
    minutosTranscurridos,
    cruzoMedianoche,
    fechaSalidaISO,
  }: {
    logId: string;
    metodoPago: PaymentMethod;
    valorPagado: number;
    minutosTranscurridos: number;
    cruzoMedianoche: boolean;
    fechaSalidaISO: string;
  }): { ok: boolean; error?: string; completedLog?: ParkingLog } => {
    const targetLog = logs.find((l) => l.id === logId && l.estado === 'ACTIVO');
    if (!targetLog) {
      return { ok: false, error: 'Registro activo no encontrado.' };
    }

    const completedLog: ParkingLog = {
      ...targetLog,
      fechaSalida: fechaSalidaISO,
      minutosTranscurridos,
      valorPagado,
      metodoPago,
      estado: 'FINALIZADO',
      operadorSalida: currentUser?.nombre || 'Operador de Turno',
      cruzoMedianoche,
    };

    // Immediately change assigned spot back to DISPONIBLE
    setSpots((prev) =>
      prev.map((s) =>
        s.codigo === targetLog.spotCodigo
          ? {
              ...s,
              estado: 'DISPONIBLE',
              placaActual: undefined,
              ticketActualId: undefined,
            }
          : s
      )
    );

    setLogs((prev) => prev.map((l) => (l.id === logId ? completedLog : l)));

    appendAuditLog(
      'VEHICLE_EXIT_AND_PAYMENT',
      'FLUJO_VEHICULAR',
      `Salida de ${targetLog.placa} · Bahía ${targetLog.spotCodigo} liberada · Cobro $${valorPagado.toLocaleString('es-CO')} (${metodoPago})`,
      'OK'
    );

    return { ok: true, completedLog };
  };

  // Shift entry time backward to test Midnight Crossing (PRD Case #5)
  const handleShiftEntryTimeForMidnightTest = (logId: string, hoursBack: number) => {
    setLogs((prev) =>
      prev.map((l) => {
        if (l.id !== logId) return l;
        const shifted = new Date(
          new Date(l.fechaIngreso).getTime() - hoursBack * 60 * 60 * 1000
        ).toISOString();
        return { ...l, fechaIngreso: shifted, cruzoMedianoche: true };
      })
    );
    appendAuditLog(
      'MIDNIGHT_CROSSING_SIMULATION',
      'TARIFAS',
      `Ajuste de marca temporal (-${hoursBack}h) en registro ${logId} para validación de cruce de medianoche`,
      'OK'
    );
  };

  // Admin: Update Rate
  const handleUpdateRate = (updated: RateConfig) => {
    setRates((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    appendAuditLog(
      'RATE_UPDATED',
      'TARIFAS',
      `Tarifa actualizada para ${updated.tipoVehiculo}: $${updated.tarifaPorHora}/h · $${updated.tarifaPorMinuto}/min`,
      'OK'
    );
  };

  // Admin: Toggle Spot Maintenance
  const handleToggleSpotMaintenance = (spotId: string) => {
    const target = spots.find((s) => s.id === spotId);
    if (!target || target.estado === 'OCUPADO') return;
    const nextState = target.estado === 'BLOQUEADO' ? 'DISPONIBLE' : 'BLOQUEADO';
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, estado: nextState } : s))
    );
    appendAuditLog(
      'SPOT_STATUS_CHANGED',
      'ESPACIOS',
      `Bahía ${target.codigo} cambiada a estado ${nextState} por el Administrador`,
      'OK'
    );
  };

  // Admin: Create User
  const handleCreateUser = (
    newUser: Omit<UserAccount, 'id' | 'ultimoAcceso'>
  ): { ok: boolean; error?: string } => {
    if (!newUser.nombre || newUser.nombre.length < 3) {
      return { ok: false, error: 'El nombre debe tener al menos 3 caracteres.' };
    }
    if (!newUser.email || !newUser.email.includes('@')) {
      return { ok: false, error: 'Ingrese un correo electrónico válido.' };
    }
    if (users.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      return {
        ok: false,
        error: 'Restricción UNIQUE: Ya existe un usuario registrado con ese correo.',
      };
    }

    const created: UserAccount = {
      ...newUser,
      id: `USR-00${users.length + 1}`,
      ultimoAcceso: 'Recién creado',
    };
    setUsers((prev) => [created, ...prev]);
    appendAuditLog(
      'USER_CREATED',
      'USUARIOS',
      `Nuevo usuario ${created.email} creado con rol ${created.rol}`,
      'OK'
    );
    return { ok: true };
  };

  const handleUpdateUserRole = (userId: string, newRole: RoleType) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
    );
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, rol: newRole } : null));
    }
    appendAuditLog(
      'USER_ROLE_UPDATED',
      'USUARIOS',
      `Rol del usuario ${userId} actualizado a ${newRole}`,
      'OK'
    );
  };

  const handleToggleUserActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, activo: !u.activo } : u))
    );
    appendAuditLog(
      'USER_STATUS_TOGGLED',
      'USUARIOS',
      `Cambio de estado activo/inactivo para cuenta ${userId}`,
      'OK'
    );
  };

  const availableSpotsCount = spots.filter((s) => s.estado === 'DISPONIBLE').length;

  // If no user is authenticated, render Direct Login Screen (/login)
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        onLoginSuccess={handleLoginSuccess}
        unauthorizedRedirectMsg={unauthorizedRedirectMsg}
        totalSpots={spots.length}
        availableSpots={availableSpotsCount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f0] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/10 bg-[#0b1120]/90 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setRbacForbiddenBanner(null);
          }}
          className="text-lg font-bold tracking-tight text-[#e9feff] whitespace-nowrap"
        >
          ParkPulse
        </a>

        {/* Zone 2: Clean text navigation links for modules */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#b9caca]">
          <button
            type="button"
            onClick={() => handleNavigateModule('PANEL_OPERATIVO')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeView === 'PANEL_OPERATIVO'
                ? 'text-[#00f5ff] border-[#00f5ff]'
                : 'border-transparent hover:text-[#e9feff]'
            }`}
          >
            Panel Operativo
          </button>

          <button
            type="button"
            onClick={() => handleNavigateModule('PANEL_ADMINISTRATIVO')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeView === 'PANEL_ADMINISTRATIVO'
                ? 'text-[#00f5ff] border-[#00f5ff]'
                : 'border-transparent hover:text-[#e9feff]'
            }`}
          >
            Panel Administrativo
          </button>

          <button
            type="button"
            onClick={() => handleNavigateModule('PORTAL_CLIENTE')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeView === 'PORTAL_CLIENTE'
                ? 'text-[#00f5ff] border-[#00f5ff]'
                : 'border-transparent hover:text-[#e9feff]'
            }`}
          >
            Portal del Cliente
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions (Role Switcher + Logout) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-[#00f5ff]/40 bg-[#0f172a] shrink-0">
              {!avatarFailed ? (
                <img
                  src={operatorAvatarImg}
                  alt={currentUser.nombre}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#00f5ff]">
                  {currentUser.nombre.charAt(0)}
                </div>
              )}
            </div>
            <select
              aria-label="Cambiar Rol RBAC en Vivo"
              value={currentUser.rol}
              onChange={(e) => handleQuickSwitchRole(e.target.value as RoleType)}
              className="cyber-input px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular"
            >
              <option value="Operador" className="bg-[#0b1120]">
                Rol: Operador ({currentUser.rol === 'Operador' ? 'Activo' : 'Cambiar'})
              </option>
              <option value="Administrador" className="bg-[#0b1120]">
                Rol: Administrador ({currentUser.rol === 'Administrador' ? 'Activo' : 'Cambiar'})
              </option>
              <option value="Cliente" className="bg-[#0b1120]">
                Rol: Cliente ({currentUser.rol === 'Cliente' ? 'Activo' : 'Cambiar'})
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="cyber-btn-ghost px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-b border-white/10 bg-[#0b1120] px-2 py-2 text-xs">
        <button
          type="button"
          onClick={() => handleNavigateModule('PANEL_OPERATIVO')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeView === 'PANEL_OPERATIVO' ? 'text-[#00f5ff] font-bold' : 'text-[#849495]'
          }`}
        >
          Operativo
        </button>
        <button
          type="button"
          onClick={() => handleNavigateModule('PANEL_ADMINISTRATIVO')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeView === 'PANEL_ADMINISTRATIVO' ? 'text-[#00f5ff] font-bold' : 'text-[#849495]'
          }`}
        >
          Administración
        </button>
        <button
          type="button"
          onClick={() => handleNavigateModule('PORTAL_CLIENTE')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeView === 'PORTAL_CLIENTE' ? 'text-[#00f5ff] font-bold' : 'text-[#849495]'
          }`}
        >
          Portal Cliente
        </button>
      </div>

      {/* Main Content Container (1440px Desktop Presence) */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 flex-1 space-y-6">
        {/* RBAC HTTP 403 Forbidden Banner (if user clicked a module restricted for their current role) */}
        {rbacForbiddenBanner && (
          <div className="p-4 rounded-xl bg-[#ff3366]/15 border border-[#ff3366] text-[#ffdad6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-[#ff3366]">
                  BLOQUEO HTTP 403 FORBIDDEN — VIOLACIÓN DE MATRIZ RBAC DETECTADA
                </h2>
                <p className="text-xs mt-1">
                  Su sesión actual tiene el rol <strong>{currentUser.rol}</strong> y no cuenta con privilegios
                  para acceder a <strong>{rbacForbiddenBanner.attemptedView}</strong> (requiere rol{' '}
                  <strong>{rbacForbiddenBanner.requiredRole}</strong>). El evento fue registrado en{' '}
                  <code className="font-mono-tabular">AuditLogs</code>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickSwitchRole(rbacForbiddenBanner.requiredRole)}
                className="px-3.5 py-2 rounded-lg bg-[#00f5ff] text-[#070b14] font-semibold text-xs whitespace-nowrap flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Cambiar a Rol {rbacForbiddenBanner.requiredRole}</span>
              </button>
              <button
                type="button"
                onClick={() => setRbacForbiddenBanner(null)}
                className="p-1.5 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Render Active Role Workspace */}
        {activeView === 'PANEL_OPERATIVO' && (
          <OperatorWorkspace
            currentUser={currentUser}
            spots={spots}
            logs={logs}
            rates={rates}
            onRegisterEntry={handleRegisterEntry}
            onRegisterExit={handleRegisterExit}
            onShiftEntryTimeForMidnightTest={handleShiftEntryTimeForMidnightTest}
            onLogAuditEvent={(accion, modulo, detalle, resultado) =>
              appendAuditLog(accion, modulo, detalle, resultado)
            }
          />
        )}

        {activeView === 'PANEL_ADMINISTRATIVO' && (
          <AdminDashboard
            spots={spots}
            logs={logs}
            rates={rates}
            users={users}
            auditLogs={auditLogs}
            onUpdateRate={handleUpdateRate}
            onToggleSpotMaintenance={handleToggleSpotMaintenance}
            onCreateUser={handleCreateUser}
            onUpdateUserRole={handleUpdateUserRole}
            onToggleUserActive={handleToggleUserActive}
          />
        )}

        {activeView === 'PORTAL_CLIENTE' && (
          <ClientPortal
            currentUser={currentUser}
            spots={spots}
            logs={logs}
            rates={rates}
            onTriggerRbac403={(route) =>
              appendAuditLog(
                'RBAC_403_FORBIDDEN',
                'RBAC_SECURITY',
                `Bloqueo HTTP 403 al intentar petición de Cliente hacia ruta restringida ${route}`,
                'BLOQUEADO_403'
              )
            }
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="px-6 lg:px-10 py-4 border-t border-white/10 text-xs text-[#849495] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          ParkPulse — Sistema Inteligente de Parqueadero · Sesión activa: {currentUser.nombre} (
          {currentUser.rol})
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => handleQuickSwitchRole('Operador')}
            className="hover:text-[#00f5ff] transition-colors"
          >
            Vista Operador
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => handleQuickSwitchRole('Administrador')}
            className="hover:text-[#00f5ff] transition-colors"
          >
            Vista Administrador
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => handleQuickSwitchRole('Cliente')}
            className="hover:text-[#00f5ff] transition-colors"
          >
            Vista Cliente
          </button>
        </div>
      </footer>
    </div>
  );
}
