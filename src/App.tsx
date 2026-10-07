import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { OperatorWorkspace } from './components/OperatorWorkspace';
import { AdminWorkspace } from './components/AdminWorkspace';
import { ClientWorkspace } from './components/ClientWorkspace';
import type {
  User,
  ParkingSpot,
  ParkingLog,
  Ticket,
  Rate,
  SmsNotification,
  SmsAlertConfig,
} from './types';

type AppView =
  | 'OPERATIVO'
  | 'ADMIN_REPORTES'
  | 'ADMIN_TARIFAS'
  | 'ADMIN_USUARIOS'
  | 'ADMIN_AUDITORIA'
  | 'ADMIN_SMS'
  | 'CLIENTE';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('OPERATIVO');
  const [forbiddenAlert, setForbiddenAlert] = useState<string | null>(null);

  // Estado compartido de base de datos en tiempo real
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [logs, setLogs] = useState<ParkingLog[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [smsNotifications, setSmsNotifications] = useState<SmsNotification[]>([]);
  const [smsConfig, setSmsConfig] = useState<SmsAlertConfig>({
    umbralMinutos: 120,
    autoEnvioActivo: true,
    remitenteNombre: 'ParkFlow Alertas',
    updatedAt: new Date().toISOString(),
  });
  const [dataLoading, setDataLoading] = useState(false);

  // Redirección automática por rol (Sección 1 del Flujo de Navegación)
  const applyRoleRedirect = useCallback((loggedUser: User) => {
    setForbiddenAlert(null);
    if (loggedUser.rol === 'Administrador') {
      setCurrentView('ADMIN_REPORTES');
      window.history.replaceState({}, '', '/admin/reportes');
    } else if (loggedUser.rol === 'Operador') {
      setCurrentView('OPERATIVO');
      window.history.replaceState({}, '', '/operador/mapa');
    } else {
      setCurrentView('CLIENTE');
      window.history.replaceState({}, '', '/cliente/panel');
    }
  }, []);

  const fetchAllOperationalData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [spotsRes, logsRes, ratesRes] = await Promise.all([
        fetch('/api/spots'),
        fetch('/api/logs'),
        fetch('/api/rates'),
      ]);

      if (spotsRes.ok) {
        const sData = await spotsRes.json();
        setSpots(sData.spots || []);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData.logs || []);
        setTickets(lData.tickets || []);
        if (lData.smsNotifications) setSmsNotifications(lData.smsNotifications);
        if (lData.smsConfig) setSmsConfig(lData.smsConfig);
      }
      if (ratesRes.ok) {
        const rData = await ratesRes.json();
        setRates(rData.rates || []);
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Verificar sesión activa o redirigir a /login si es usuario anónimo
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          applyRoleRedirect(data.user);
          await fetchAllOperationalData();
        } else {
          // Auto-iniciar sesión demostrativa en Rol Operador para mostrar de inmediato el Mapa Visual, Espacios y Tickets Simulados
          const demoRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'operador@parkcontrol.co', password: 'Operador123!' }),
          });
          if (demoRes.ok) {
            const demoData = await demoRes.json();
            setUser(demoData.user);
            applyRoleRedirect(demoData.user);
            await fetchAllOperationalData();
            return;
          }
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            setRedirectNotice(
              `Redirección automática a /login: Debe iniciar sesión para acceder a la ruta protegida (${window.location.pathname}).`
            );
          }
          window.history.replaceState({}, '', '/login');
        }
      } catch {
        window.history.replaceState({}, '', '/login');
      } finally {
        setAuthChecking(false);
      }
    };
    checkSession();
  }, [applyRoleRedirect, fetchAllOperationalData]);

  const handleLoginSuccess = async (loggedUser: User) => {
    setUser(loggedUser);
    setRedirectNotice(null);
    applyRoleRedirect(loggedUser);
    await fetchAllOperationalData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setForbiddenAlert(null);
    window.history.replaceState({}, '', '/login');
  };

  const handleNavigate = (targetView: AppView) => {
    if (!user) return;
    setForbiddenAlert(null);

    // Validación RBAC en navegación Frontend + Backend
    if (targetView.startsWith('ADMIN_') && user.rol !== 'Administrador') {
      setForbiddenAlert(
        `Acceso Bloqueado (HTTP 403 Forbidden): El rol ${user.rol} no tiene permisos para acceder a módulos de Administración.`
      );
      return;
    }

    if (targetView === 'OPERATIVO' && user.rol === 'Cliente') {
      setForbiddenAlert(
        `Acceso Bloqueado (HTTP 403 Forbidden): El rol Cliente no tiene permisos para registrar entradas o procesar cobros operativos.`
      );
      return;
    }

    setCurrentView(targetView);
  };

  const handleToggleSpotMaintenance = async (spot: ParkingSpot) => {
    const nuevoEstado = spot.estado === 'MANTENIMIENTO' ? 'DISPONIBLE' : 'MANTENIMIENTO';
    const res = await fetch(`/api/spots/${spot.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      await fetchAllOperationalData();
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold font-display tracking-tight">ParkFlow</p>
          <p className="text-xs font-mono text-slate-400">Verificando sesión JWT y permisos RBAC...</p>
        </div>
      </div>
    );
  }

  // Punto de partida: Pantalla de Login directo (/login)
  if (!user) {
    return <LoginView redirectNotice={redirectNotice} onLoginSuccess={handleLoginSuccess} />;
  }

  const occupiedCount = spots.filter((s) => s.estado === 'OCUPADO').length;
  const availableCount = spots.filter((s) => s.estado === 'DISPONIBLE').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Exactamente 3 zonas en una sola fila */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 lg:px-10 py-3.5 flex items-center justify-between gap-4">
        {/* Zona 1: Brand Title (único elemento de texto) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            applyRoleRedirect(user);
          }}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          ParkFlow
        </a>

        {/* Zona 2: 4-5 Enlaces de Navegación Limpios según Rol */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          {user.rol === 'Administrador' && (
            <>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_REPORTES')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'ADMIN_REPORTES'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Panel Reportes
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('OPERATIVO')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'OPERATIVO'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Mapa y Flujo Vehicular
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_TARIFAS')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'ADMIN_TARIFAS'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Tarifas
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_USUARIOS')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'ADMIN_USUARIOS'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Usuarios RBAC
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_AUDITORIA')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'ADMIN_AUDITORIA'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Audit Logs
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_SMS')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'ADMIN_SMS'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Alertas SMS / Email
              </button>
            </>
          )}

          {user.rol === 'Operador' && (
            <>
              <button
                type="button"
                onClick={() => handleNavigate('OPERATIVO')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'OPERATIVO'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Panel Operativo (Mapa y Accesos)
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('CLIENTE')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'CLIENTE'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Vista Consulta Cliente
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('ADMIN_REPORTES')}
                className="text-slate-400 hover:text-slate-700 transition-colors whitespace-nowrap py-1"
              >
                Reportes Admin (Restringido)
              </button>
            </>
          )}

          {user.rol === 'Cliente' && (
            <>
              <button
                type="button"
                onClick={() => handleNavigate('CLIENTE')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 ${
                  currentView === 'CLIENTE'
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Disponibilidad y Mis Tickets
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('OPERATIVO')}
                className="text-slate-400 hover:text-slate-700 transition-colors whitespace-nowrap py-1"
              >
                Panel Operador (Restringido)
              </button>
            </>
          )}
        </nav>

        {/* Zona 3: 1-2 Acciones Primarias */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAllOperationalData}
            disabled={dataLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
            Sincronizar ({availableCount} libres)
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Sub-barra de Contexto de Usuario Autenticado y Selector Rápido de Rol en Vivo */}
      <div className="bg-slate-900 text-slate-200 px-6 lg:px-10 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">{user.nombre}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>Rol activo: <strong className="text-emerald-400 font-semibold">{user.rol}</strong></span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-400">Cambiar vista simulada:</span>
            {[
              { label: 'Mapa Operador', email: 'operador@parkcontrol.co', pass: 'Operador123!', rol: 'Operador', view: 'OPERATIVO' as AppView },
              { label: 'Admin (Reportes/D3)', email: 'admin@parkcontrol.co', pass: 'Admin123!', rol: 'Administrador', view: 'ADMIN_REPORTES' as AppView },
              { label: 'Admin (Config SMS/Email)', email: 'admin@parkcontrol.co', pass: 'Admin123!', rol: 'Administrador', view: 'ADMIN_SMS' as AppView },
              { label: 'Cliente', email: 'cliente@parkcontrol.co', pass: 'Cliente123!', rol: 'Cliente', view: 'CLIENTE' as AppView },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: item.email, password: item.pass }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setRedirectNotice(null);
                    setForbiddenAlert(null);
                    setCurrentView(item.view);
                    await fetchAllOperationalData();
                  }
                }}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  user.rol === item.rol && currentView === item.view
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <span>Capacidad Total: {spots.length} espacios</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-emerald-400">Disponibles: {availableCount}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-amber-300">Ocupados: {occupiedCount}</span>
        </div>
      </div>

      {/* Contenido Principal por Rol */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 lg:px-10 py-8 space-y-6">
        {forbiddenAlert && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4 text-xs text-red-900"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-medium">{forbiddenAlert}</span>
            </div>
            <button
              type="button"
              onClick={() => setForbiddenAlert(null)}
              className="text-red-700 hover:text-red-900 font-semibold underline"
            >
              Entendido
            </button>
          </div>
        )}

        {currentView === 'OPERATIVO' && (
          <OperatorWorkspace
            userRole={user.rol}
            spots={spots}
            logs={logs}
            tickets={tickets}
            rates={rates}
            smsNotifications={smsNotifications}
            smsConfig={smsConfig}
            onRefresh={fetchAllOperationalData}
            onToggleSpotMaintenance={user.rol === 'Administrador' ? handleToggleSpotMaintenance : undefined}
          />
        )}

        {currentView.startsWith('ADMIN_') && user.rol === 'Administrador' && (
          <AdminWorkspace
            initialSection={
              currentView === 'ADMIN_TARIFAS'
                ? 'TARIFAS'
                : currentView === 'ADMIN_USUARIOS'
                ? 'USUARIOS'
                : currentView === 'ADMIN_AUDITORIA'
                ? 'AUDITORIA'
                : currentView === 'ADMIN_SMS'
                ? 'SMS'
                : 'REPORTES'
            }
            rates={rates}
            tickets={tickets}
            logs={logs}
            smsNotifications={smsNotifications}
            smsConfig={smsConfig}
            onRefreshGlobal={fetchAllOperationalData}
          />
        )}

        {currentView === 'CLIENTE' && (
          <ClientWorkspace
            user={user}
            spots={spots}
            logs={logs}
            tickets={tickets}
            rates={rates}
            smsNotifications={smsNotifications}
            smsConfig={smsConfig}
          />
        )}
      </main>

      {/* Footer limpio */}
      <footer className="bg-white border-t border-slate-200 px-6 lg:px-10 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <span>ParkFlow — Sistema Inteligente de Parqueadero</span>
        <div className="flex items-center gap-3">
          <span>Control RBAC Activo</span>
          <span aria-hidden="true">·</span>
          <span>Sincronización de Espacios en Tiempo Real</span>
        </div>
      </footer>
    </div>
  );
}
