import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { User } from '../types';

interface LoginViewProps {
  redirectNotice?: string | null;
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ redirectNotice, onLoginSuccess }) => {
  const [email, setEmail] = useState('operador@parkcontrol.co');
  const [password, setPassword] = useState('Operador123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error de autenticación.');
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setError('Falla de conexión con el servidor de autenticación. Reintente.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillRole = async (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: rolePass }),
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Error de autenticación.');
      }
    } catch {
      setError('Falla de conexión con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Cabecera limpia de 3 zonas */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-5 border-b border-slate-800/80">
        <a href="/login" className="text-xl font-bold tracking-tight text-white font-display">
          ParkFlow
        </a>
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <span>Control de Ocupación en Tiempo Real</span>
          <span>Liquidación Exacta al Minuto</span>
          <span>Seguridad RBAC & Auditoría</span>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 tabular-nums">Acceso Seguro JWT</span>
        </div>
      </header>

      {/* Contenedor Principal de Login */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Columna Editorial de Propuesta de Valor */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-mono text-emerald-400 tracking-wide">
              Sistema Inteligente de Gestión de Parqueaderos
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display leading-tight text-balance">
              Control operativo de acceso vehicular, mapa de ocupación en vivo y liquidación tarifaria sin errores.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Automatice el flujo de entrada y salida de vehículos con validación estandarizada de placas, asignación instantánea de cupos disponibles, cálculo multimoneda/multidía con cruce de medianoche y trazabilidad administrativa completa.
            </p>

            {/* Matriz de Accesos Rápidos por Rol (Redirección Automática RBAC) */}
            <div className="pt-2 space-y-3">
              <p className="text-xs font-semibold text-slate-300">
                Seleccione un perfil demostrativo para autocompletar credenciales (Redirección por Rol):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => quickFillRole('operador@parkcontrol.co', 'Operador123!')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    email === 'operador@parkcontrol.co'
                      ? 'border-emerald-500 bg-slate-900 text-white'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Rol Operador</span>
                    {email === 'operador@parkcontrol.co' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Redirige al Panel Operativo: Mapa en vivo, entradas, tickets y salidas.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-400 mt-2">operador@parkcontrol.co</p>
                </button>

                <button
                  type="button"
                  onClick={() => quickFillRole('admin@parkcontrol.co', 'Admin123!')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    email === 'admin@parkcontrol.co'
                      ? 'border-emerald-500 bg-slate-900 text-white'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Rol Administrador</span>
                    {email === 'admin@parkcontrol.co' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Redirige al Panel Administrativo: Reportes, tarifas, usuarios y auditoría.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-400 mt-2">admin@parkcontrol.co</p>
                </button>

                <button
                  type="button"
                  onClick={() => quickFillRole('cliente@parkcontrol.co', 'Cliente123!')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    email === 'cliente@parkcontrol.co'
                      ? 'border-emerald-500 bg-slate-900 text-white'
                      : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Rol Cliente</span>
                    {email === 'cliente@parkcontrol.co' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Redirige al Panel del Cliente: Disponibilidad en vivo y mis tickets.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-400 mt-2">cliente@parkcontrol.co</p>
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta de Formulario de Inicio de Sesión */}
          <div className="lg:col-span-5 bg-white text-slate-900 rounded-2xl p-7 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">Iniciar Sesión</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Autenticación con cookie protegida HTTP-Only y control RBAC
                </p>
              </div>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>

            {redirectNotice && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                {redirectNotice}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo Electrónico Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@parkcontrol.co"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? 'Validando credenciales y rol...' : 'Ingresar al Sistema'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Protección bcrypt + Zod DTO</span>
              <span className="font-mono">Ruta inicial: /login</span>
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página limpio */}
      <footer className="px-6 lg:px-12 py-4 border-t border-slate-900 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>© 2026 ParkFlow — Sistema Inteligente de Parqueadero</span>
        <span>Arquitectura SPA + API REST con Control de Acceso Basado en Roles (RBAC)</span>
      </footer>
    </div>
  );
};
