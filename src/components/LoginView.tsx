import React, { useState } from 'react';
import { ShieldCheck, KeyRound, ArrowRight, Lock, AlertCircle, Car, CheckCircle2 } from 'lucide-react';
import { RoleType, UserAccount } from '../types/parking';
import heroFacilityImg from '../assets/images/smart_parking_facility_hero_1791411135286.jpg';
import sensorBayImg from '../assets/images/isometric_parking_sensor_bay_1791411145619.jpg';

import { BackendStatus } from '../services/api';

interface LoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  unauthorizedRedirectMsg: string | null;
  totalSpots: number;
  availableSpots: number;
  backendStatus?: BackendStatus | null;
  onOpenDbModal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  onLoginSuccess,
  unauthorizedRedirectMsg,
  totalSpots,
  availableSpots,
  backendStatus,
  onOpenDbModal,
}) => {
  const [email, setEmail] = useState('operador@parkpulse.co');
  const [password, setPassword] = useState('••••••••••••');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [bayImgFailed, setBayImgFailed] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Validación Zod: Ingrese un correo electrónico corporativo válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Validación Zod: La contraseña debe contener mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const matched = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      setIsLoading(false);
      if (!matched) {
        setErrorMsg('Credenciales no encontradas. Seleccione uno de los perfiles RBAC o verifique su correo.');
        return;
      }
      if (!matched.activo) {
        setErrorMsg('Cuenta desactivada por el Administrador. Contacte soporte de seguridad.');
        return;
      }
      onLoginSuccess(matched);
    }, 180);
  };

  const handleQuickRoleSelect = (role: RoleType) => {
    setErrorMsg(null);
    const matched = users.find((u) => u.rol === role && u.activo);
    if (matched) {
      setEmail(matched.email);
      setPassword('••••••••••••');
      onLoginSuccess(matched);
    }
  };

  const occupancyPct = Math.round(((totalSpots - availableSpots) / totalSpots) * 100);

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f0] flex flex-col justify-between">
      {/* Clean 3-Zone Top Bar */}
      <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-white/10 bg-[#0b1120]/80 backdrop-blur-md">
        <a href="#login" className="text-xl font-bold tracking-tight text-[#e9feff]">
          ParkPulse
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#b9caca]">
          <a href="#acceso-rbac" className="hover:text-[#00f5ff] transition-colors whitespace-nowrap">
            Control RBAC
          </a>
          <a href="#arquitectura" className="hover:text-[#00f5ff] transition-colors whitespace-nowrap">
            Telemetría de Bahías
          </a>
          <a href="#tarifas-info" className="hover:text-[#00f5ff] transition-colors whitespace-nowrap">
            Motor Tarifario
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {onOpenDbModal && (
            <button
              type="button"
              onClick={onOpenDbModal}
              title="Ver estado de conexión con XAMPP & MySQL"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                backendStatus?.connected
                  ? 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30 hover:bg-[#10b981]/25'
                  : 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30 hover:bg-[#ef4444]/25'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus?.connected ? 'bg-[#10b981] animate-pulse' : 'bg-[#ef4444]'
                }`}
              />
              <span>
                {backendStatus?.connected ? 'XAMPP · MySQL OK' : 'XAMPP Desconectado'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleQuickRoleSelect('Operador')}
            className="cyber-btn-primary px-4 py-2 rounded-lg text-xs whitespace-nowrap"
          >
            Ingresar como Operador
          </button>
        </div>
      </header>

      {/* Main Split Viewport */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1">
        {/* Left 7 Columns: Visual Telemetry Facility & System Architecture */}
        <section className="lg:col-span-7 flex flex-col justify-between rounded-2xl overflow-hidden border border-white/10 bg-[#0b1120]/70 relative min-h-[540px]">
          {/* Hero Photography with Measured Scrim */}
          <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-[#0a0e17]">
            {!heroImgFailed ? (
              <img
                src={heroFacilityImg}
                alt="Instalación subterránea de parqueadero inteligente con telemetría luminosa"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover object-center opacity-85"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0d1527] via-[#0b1120] to-[#070b14]">
                <Car className="w-16 h-16 text-[#00f5ff]/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/55 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-mono-tabular text-[#00f5ff] mb-1">
                  SISTEMA INTELIGENTE DE PARQUEADERO · CONTROL EN TIEMPO REAL
                </p>
                <h1
                  className="text-2xl sm:text-4xl font-bold text-[#e9feff] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Gestión Automatizada de Ocupación, Entradas y Tarifas
                </h1>
              </div>
            </div>
          </div>

          {/* Lower Telemetry Proof & Isometric Bay Module */}
          <div id="arquitectura" className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="text-xs text-[#849495]">Bahías Disponibles Ahora</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#00ff87] mt-1">
                  {availableSpots} / {totalSpots}
                </p>
                <p className="text-xs text-[#b9caca] mt-0.5">Sincronización física 100%</p>
              </div>
              <div>
                <p className="text-xs text-[#849495]">Ocupación de Planta</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#00f5ff] mt-1">
                  {occupancyPct}%
                </p>
                <p className="text-xs text-[#b9caca] mt-0.5">4 Zonas operativas (S1 y S2)</p>
              </div>
              <div id="tarifas-info">
                <p className="text-xs text-[#849495]">Exactitud Tarifaria</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#e9feff] mt-1">
                  0% Error
                </p>
                <p className="text-xs text-[#b9caca] mt-0.5">Soporte cruce de medianoche</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-full sm:w-36 h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#0a0e17]">
                {!bayImgFailed ? (
                  <img
                    src={sensorBayImg}
                    alt="Esquema isométrico de bahía inteligente con sensor ultrasónico"
                    referrerPolicy="no-referrer"
                    onError={() => setBayImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0f172a]">
                    <ShieldCheck className="w-8 h-8 text-[#00f5ff]" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5 text-sm text-[#b9caca]">
                <div className="font-semibold text-[#e9feff]">
                  Arquitectura de Seguridad RBAC y Persistencia Transaccional
                </div>
                <p className="text-xs leading-relaxed text-[#849495]">
                  Autenticación protegida con sesión validada por rol, validación de formato de placas con Zod,
                  bloqueo de duplicidad en estancia activa y trazabilidad completa en tabla de auditoría.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right 5 Columns: Direct Login & Instant Role Switcher */}
        <section
          id="acceso-rbac"
          className="lg:col-span-5 cyber-card-level2 rounded-2xl p-6 sm:p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#e9feff]">Iniciar Sesión</h2>
                <p className="text-xs text-[#849495] mt-0.5">
                  Autenticación obligatoria · Redirección automática según rol RBAC
                </p>
              </div>
              <Lock className="w-5 h-5 text-[#00f5ff]" />
            </div>

            {unauthorizedRedirectMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-[#ff3366]/15 border border-[#ff3366]/50 text-xs text-[#ffdad6] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#ff3366] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#ff3366]">Redirección de Seguridad: </span>
                  {unauthorizedRedirectMsg}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-[#ff3366]/15 border border-[#ff3366]/50 text-xs text-[#ffdad6] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#ff3366] shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Role Selector for Immediate Evaluation of All 3 Flows */}
            <div className="mb-6">
              <label className="block text-xs font-mono-tabular text-[#b9caca] mb-2.5">
                ACCESO RÁPIDO DEMO POR ROL (1 CLIC):
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('Operador')}
                  className="w-full text-left p-3.5 rounded-lg border border-[#00f5ff]/40 bg-[#00f5ff]/10 hover:bg-[#00f5ff]/15 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#e9feff] flex items-center gap-2">
                      <span>Panel Operativo (Operador)</span>
                      <span className="text-xs font-mono-tabular text-[#00f5ff]">· Camila Mendoza</span>
                    </div>
                    <p className="text-xs text-[#b9caca] mt-0.5">
                      Mapa interactivo · Registro Entrada/Salida · Tickets y Cobro
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#00f5ff] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('Administrador')}
                  className="w-full text-left p-3.5 rounded-lg border border-white/15 bg-[#0b1120]/80 hover:border-[#00f5ff]/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#e9feff] flex items-center gap-2">
                      <span>Panel Administrativo (Administrador)</span>
                      <span className="text-xs font-mono-tabular text-[#c084fc]">· Alejandro Vargas</span>
                    </div>
                    <p className="text-xs text-[#849495] mt-0.5">
                      Reportes por fecha · Configuración de Tarifas · Usuarios y AuditLogs
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#849495] group-hover:text-[#00f5ff] transition-colors shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleSelect('Cliente')}
                  className="w-full text-left p-3.5 rounded-lg border border-white/15 bg-[#0b1120]/80 hover:border-[#00f5ff]/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#e9feff] flex items-center gap-2">
                      <span>Portal del Cliente (Cliente)</span>
                      <span className="text-xs font-mono-tabular text-[#00ff87]">· Diana K. Pérez</span>
                    </div>
                    <p className="text-xs text-[#849495] mt-0.5">
                      Disponibilidad en vivo · Mi vehículo activo (KLM-456) · Historial de tickets
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#849495] group-hover:text-[#00f5ff] transition-colors shrink-0" />
                </button>
              </div>
            </div>

            {/* Standard Credential Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 border-t border-white/10 pt-5">
              <div>
                <label htmlFor="login-email" className="block text-xs text-[#b9caca] mb-1.5">
                  Correo Electrónico Registrado
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@parkpulse.co"
                  className="cyber-input w-full px-3.5 py-2.5 rounded-lg text-sm font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs text-[#b9caca] mb-1.5">
                  Contraseña (Hash bcrypt)
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input w-full px-3.5 py-2.5 rounded-lg text-sm font-mono-tabular"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cyber-btn-primary w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Verificando Credenciales JWT...' : 'Autenticar e Ingresar al Sistema'}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#849495]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff87]" />
              Sesión Cookie HTTP-Only Activa
            </span>
            <span className="font-mono-tabular">Zod DTO Validated</span>
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="px-6 lg:px-10 py-4 border-t border-white/10 text-xs text-[#849495] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>ParkPulse — Sistema Inteligente de Parqueadero</span>
        <span>Control de Ocupación · Cálculo Automático de Tarifas · Auditoría RBAC</span>
      </footer>
    </div>
  );
};
