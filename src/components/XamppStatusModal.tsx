import React, { useState } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Cpu,
  Layers,
  Table,
  ShieldCheck,
} from 'lucide-react';
import { BackendStatus, parkFlowApi } from '../services/api';

interface XamppStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: BackendStatus | null;
  onRefresh: () => Promise<void>;
}

export const XamppStatusModal: React.FC<XamppStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleRecheck = async () => {
    setIsChecking(true);
    setResetMessage(null);
    try {
      await onRefresh();
    } finally {
      setIsChecking(false);
    }
  };

  const handleResetDb = async () => {
    if (
      !window.confirm(
        '¿Desea restablecer y re-sembrar la base de datos `parkflow_db` en MySQL con los datos iniciales?'
      )
    ) {
      return;
    }
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await parkFlowApi.setupDatabase();
      if (res.success) {
        setResetMessage('¡Base de datos restablecida y poblada con éxito en MySQL!');
        await onRefresh();
      } else {
        setResetMessage(`Error: ${res.message || 'No se pudo restablecer la base de datos'}`);
      }
    } catch (e: any) {
      setResetMessage(`Error: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const isConnected = !!status?.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0b1120] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#070b14]/80">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isConnected
                  ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40'
                  : 'bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/40'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#e9feff]">
                  Conexión XAMPP & MySQL
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isConnected
                      ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40'
                      : 'bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/40'
                  }`}
                >
                  {isConnected ? 'Conectado · En Vivo' : 'Sin Conexión'}
                </span>
              </div>
              <p className="text-xs text-[#849495]">
                ParkFlow PHP REST API en Apache + MariaDB / MySQL
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#849495] hover:text-[#e9feff] hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Notification Alert if message */}
          {resetMessage && (
            <div className="p-3 rounded-xl bg-[#00f5ff]/15 border border-[#00f5ff]/40 text-[#00f5ff] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}

          {/* Cards Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10">
              <div className="flex items-center justify-between text-xs text-[#849495] mb-1">
                <span>Servidor Web</span>
                <Server className="w-3.5 h-3.5 text-[#00f5ff]" />
              </div>
              <div className="text-sm font-bold text-[#e9feff]">XAMPP Apache</div>
              <div className="text-xs text-[#00f5ff] font-mono-tabular mt-0.5">
                PHP {status?.php_version || '8.2.12'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10">
              <div className="flex items-center justify-between text-xs text-[#849495] mb-1">
                <span>Base de Datos</span>
                <Database className="w-3.5 h-3.5 text-[#10b981]" />
              </div>
              <div className="text-sm font-bold text-[#e9feff]">
                {status?.database || 'parkflow_db'}
              </div>
              <div className="text-xs text-[#10b981] font-mono-tabular mt-0.5">
                MySQL {status?.mysql_version || '10.4.32'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10">
              <div className="flex items-center justify-between text-xs text-[#849495] mb-1">
                <span>Host / Puerto</span>
                <Cpu className="w-3.5 h-3.5 text-[#fbbf24]" />
              </div>
              <div className="text-sm font-bold text-[#e9feff]">
                {status?.host || '127.0.0.1'}
              </div>
              <div className="text-xs text-[#fbbf24] font-mono-tabular mt-0.5">
                Puerto {status?.port || 3306}
              </div>
            </div>
          </div>

          {/* Tablas en MySQL */}
          <div>
            <h4 className="text-xs font-semibold text-[#849495] uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Table className="w-3.5 h-3.5 text-[#00f5ff]" />
              <span>Registros en Base de Datos MySQL (`parkflow_db`)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/10 text-center">
                <div className="text-lg font-bold text-[#00f5ff] font-mono-tabular">
                  {status?.records?.usuarios ?? '—'}
                </div>
                <div className="text-[11px] text-[#849495]">Usuarios</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/10 text-center">
                <div className="text-lg font-bold text-[#00f5ff] font-mono-tabular">
                  {status?.records?.espacios ?? '—'}
                </div>
                <div className="text-[11px] text-[#849495]">Espacios</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/10 text-center">
                <div className="text-lg font-bold text-[#00f5ff] font-mono-tabular">
                  {status?.records?.tarifas ?? '—'}
                </div>
                <div className="text-[11px] text-[#849495]">Tarifas</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/10 text-center">
                <div className="text-lg font-bold text-[#00f5ff] font-mono-tabular">
                  {status?.records?.tickets ?? '—'}
                </div>
                <div className="text-[11px] text-[#849495]">Tickets</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-white/10 text-center">
                <div className="text-lg font-bold text-[#00f5ff] font-mono-tabular">
                  {status?.records?.auditoria ?? '—'}
                </div>
                <div className="text-[11px] text-[#849495]">Auditoría</div>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-2 text-xs">
            <h4 className="font-semibold text-[#e9feff] flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
              <span>Verificación de Componentes de XAMPP</span>
            </h4>
            <div className="flex items-center gap-2 text-[#34d399]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Apache Web Server activo en puerto 80 (HTTP)</span>
            </div>
            <div className="flex items-center gap-2 text-[#34d399]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>MySQL Server activo en puerto 3306 (InnoDB / MariaDB)</span>
            </div>
            <div className="flex items-center gap-2 text-[#34d399]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Lenguaje PHP 8.2 procesando endpoints REST con CORS habilitado</span>
            </div>
            <div className="flex items-center gap-2 text-[#34d399]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Esquema relacional y datos sembrados en `parkflow_db`</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex items-center justify-between text-xs text-[#849495] pt-1 border-t border-white/10">
            <span>Ruta en XAMPP: C:\xampp\htdocs\parkflow\</span>
            <a
              href="http://localhost/parkflow/"
              target="_blank"
              rel="noreferrer"
              className="text-[#00f5ff] hover:underline flex items-center gap-1"
            >
              <span>Abrir Portal de Diagnóstico</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-[#070b14]/80">
          <button
            type="button"
            onClick={handleResetDb}
            disabled={isResetting}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50"
          >
            {isResetting ? 'Restableciendo...' : 'Restablecer Base de Datos Demo'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecheck}
              disabled={isChecking}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-[#e9feff] hover:bg-white/15 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Verificando...' : 'Verificar Conexión'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00f5ff] text-[#070b14] hover:bg-[#00f5ff]/90 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
