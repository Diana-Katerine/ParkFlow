import React, { useState, useMemo } from 'react';
import {
  Car,
  Clock,
  Receipt,
  ShieldAlert,
  CheckCircle2,
  Zap,
  Search,
  Lock,
  Eye,
  X,
} from 'lucide-react';
import {
  ParkingLog,
  ParkingSpot,
  RateConfig,
  UserAccount,
  VehicleType,
} from '../types/parking';
import { calculateStayBilling, formatCOP } from '../data/initialData';

interface ClientPortalProps {
  currentUser: UserAccount;
  spots: ParkingSpot[];
  logs: ParkingLog[];
  rates: RateConfig[];
  onTriggerRbac403: (attemptedRoute: string) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  currentUser,
  spots,
  logs,
  rates,
  onTriggerRbac403,
}) => {
  const [plateFilter, setPlateFilter] = useState<string>(currentUser.placaAsociada || 'KLM-456');
  const [selectedZone, setSelectedZone] = useState<string>('TODAS');
  const [selectedTicketModal, setSelectedTicketModal] = useState<ParkingLog | null>(null);
  const [rbac403Alert, setRbac403Alert] = useState<string | null>(null);

  const availableSpots = useMemo(
    () => spots.filter((s) => s.estado === 'DISPONIBLE'),
    [spots]
  );

  // Availability by Vehicle Type
  const availabilityByType = useMemo(() => {
    const types: VehicleType[] = ['Automóvil', 'Eléctrico EV', 'Motocicleta', 'Camioneta'];
    return types.map((t) => {
      const total = spots.filter((s) => s.tipoPermitido === t).length;
      const free = spots.filter((s) => s.tipoPermitido === t && s.estado === 'DISPONIBLE').length;
      const rate = rates.find((r) => r.tipoVehiculo === t);
      return { tipo: t, total, free, rate };
    });
  }, [spots, rates]);

  // Client's logs (matching plateFilter or client name)
  const clientLogs = useMemo(() => {
    const q = plateFilter.trim().toUpperCase();
    return logs.filter(
      (l) =>
        !q ||
        l.placa.toUpperCase().includes(q) ||
        l.ticketCodigo.toUpperCase().includes(q) ||
        (l.propietarioNombre &&
          l.propietarioNombre.toLowerCase().includes(currentUser.nombre.toLowerCase()))
    );
  }, [logs, plateFilter, currentUser.nombre]);

  const activeClientStay = useMemo(
    () => clientLogs.find((l) => l.estado === 'ACTIVO') || null,
    [clientLogs]
  );

  const activeClientBilling = useMemo(() => {
    if (!activeClientStay) return null;
    const rate =
      rates.find((r) => r.tipoVehiculo === activeClientStay.tipoVehiculo) || rates[0];
    return calculateStayBilling(activeClientStay.fechaIngreso, new Date().toISOString(), rate);
  }, [activeClientStay, rates]);

  const filteredSpots = useMemo(() => {
    return spots.filter((s) => selectedZone === 'TODAS' || s.zona === selectedZone);
  }, [spots, selectedZone]);

  const handleRbacTest = (route: string) => {
    setRbac403Alert(
      `HTTP 403 FORBIDDEN — Acceso Denegado: El rol autenticado ("${currentUser.rol}") no posee permisos en la matriz RBAC para acceder a "${route}". El intento fue registrado en AuditLogs.`
    );
    onTriggerRbac403(route);
  };

  return (
    <div className="space-y-6">
      {/* Top Client Banner + RBAC Case #7 Security Validator */}
      <div className="cyber-panel-level1 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono-tabular text-[#00ff87]">
            PORTAL DE AUTOGESTIÓN DEL CLIENTE · ACCESO DE LECTURA VERIFICADO
          </div>
          <h1 className="text-2xl font-bold text-[#e9feff] mt-0.5">
            Hola, {currentUser.nombre} ({currentUser.placaAsociada || 'KLM-456'})
          </h1>
          <p className="text-xs text-[#849495] mt-0.5">
            Consulte la disponibilidad de espacios en tiempo real, su estancia activa y el historial de sus tickets.
          </p>
        </div>

        {/* Interactive Test for PRD Case #7: Violación de RBAC (403 Forbidden) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono-tabular text-[#849495]">
            PROBAR CASO CRÍTICO #7 (RBAC):
          </span>
          <button
            type="button"
            onClick={() => handleRbacTest('/admin/configuracion-tarifas')}
            className="px-3 py-2 rounded-lg border border-[#ff3366]/50 bg-[#ff3366]/10 text-[#ff3366] hover:bg-[#ff3366]/20 text-xs font-mono-tabular transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Intentar Ruta /admin/tarifas (403)</span>
          </button>
        </div>
      </div>

      {/* RBAC 403 Forbidden Alert Banner */}
      {rbac403Alert && (
        <div className="p-4 rounded-xl bg-[#ff3366]/15 border border-[#ff3366] text-[#ffdad6] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[#ff3366]">
                BLOQUEO DE SEGURIDAD RBAC — HTTP 403 FORBIDDEN
              </h3>
              <p className="text-xs mt-1">{rbac403Alert}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRbac403Alert(null)}
            className="p-1 rounded hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Availability Summary Cards by Vehicle Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {availabilityByType.map((item) => (
          <div key={item.tipo} className="cyber-panel-level1 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#b9caca]">
              <span className="font-semibold text-[#e9feff]">{item.tipo}</span>
              <span className="font-mono-tabular text-[#00ff87]">
                {item.free > 0 ? 'DISPONIBLE' : 'LLENO'}
              </span>
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono-tabular text-[#00f5ff]">
                {item.free}
              </span>
              <span className="text-xs font-mono-tabular text-[#849495]">
                de {item.total} bahías libres
              </span>
            </div>
            {item.rate && (
              <div className="pt-2 border-t border-white/10 text-[11px] font-mono-tabular text-[#849495] flex justify-between">
                <span>Hora: {formatCOP(item.rate.tarifaPorHora)}</span>
                <span>Min: {formatCOP(item.rate.tarifaPorMinuto)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Split: Left 5 Cols My Active Stay + My Tickets / Right 7 Cols Live Availability Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Active Vehicle Telemetry & Ticket History */}
        <section className="lg:col-span-5 space-y-6">
          {/* Active Stay Card */}
          <div className="cyber-card-level2 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-mono-tabular text-[#00f5ff]">
                  ESTANCIA EN CURSO
                </span>
                <h2 className="text-lg font-bold text-[#e9feff]">
                  Estado de Mi Vehículo Actual
                </h2>
              </div>
              <Car className="w-5 h-5 text-[#00f5ff]" />
            </div>

            {activeClientStay && activeClientBilling ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#070b14]/90 border border-[#00f5ff]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono-tabular text-[#849495]">
                      {activeClientStay.ticketCodigo}
                    </div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#e9feff] mt-0.5">
                      {activeClientStay.placa}
                    </div>
                    <div className="text-xs text-[#b9caca] mt-0.5">
                      {activeClientStay.tipoVehiculo} · Ubicado en Bahía{' '}
                      <span className="font-mono-tabular font-bold text-[#00ff87]">
                        {activeClientStay.spotCodigo}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#849495]">Valor Acumulado</div>
                    <div className="text-2xl font-bold font-mono-tabular text-[#00ff87]">
                      {formatCOP(activeClientBilling.totalPagar)}
                    </div>
                    <div className="text-xs font-mono-tabular text-[#00f5ff] mt-0.5">
                      {activeClientBilling.formatoTiempo}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono-tabular text-[#b9caca]">
                  <div className="p-3 rounded-lg bg-[#0b1120] border border-white/10">
                    <span className="text-[#849495] block">Hora de Ingreso</span>
                    <span className="text-[#e9feff]">
                      {new Date(activeClientStay.fechaIngreso).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0b1120] border border-white/10">
                    <span className="text-[#849495] block">Tarifa Aplicada</span>
                    <span className="text-[#e9feff]">{activeClientBilling.tarifaAplicadaDesc}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#849495]">
                No registra ningún vehículo en estancia activa para la placa consultada.
              </div>
            )}
          </div>

          {/* Client Ticket History Table */}
          <div className="cyber-panel-level1 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#e9feff]">
                  Historial de Mis Ingresos, Salidas y Tickets
                </h3>
                <p className="text-xs text-[#849495]">
                  Consulte sus tickets digitales por placa o código
                </p>
              </div>
              <div className="relative w-full sm:w-44">
                <Search className="w-3.5 h-3.5 text-[#849495] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={plateFilter}
                  onChange={(e) => setPlateFilter(e.target.value.toUpperCase())}
                  placeholder="Filtrar placa..."
                  className="cyber-input w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs font-mono-tabular"
                />
              </div>
            </div>

            {clientLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#849495]">
                Sin resultados en el historial para "{plateFilter}".
              </div>
            ) : (
              <div className="space-y-2.5">
                {clientLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#070b14]/80 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-tabular">
                        <span className="font-bold text-[#e9feff]">{log.placa}</span>
                        <span>·</span>
                        <span className="text-[#00f5ff]">{log.ticketCodigo}</span>
                        <span>·</span>
                        <span className="text-[#849495]">Bahía {log.spotCodigo}</span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[#849495] mt-1">
                        Ingreso: {new Date(log.fechaIngreso).toLocaleString('es-CO')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono-tabular">
                        <div
                          className={`text-xs font-bold ${
                            log.estado === 'ACTIVO' ? 'text-[#00ff87]' : 'text-[#dfe2f0]'
                          }`}
                        >
                          {log.estado === 'ACTIVO'
                            ? 'EN ESTANCIA'
                            : formatCOP(log.valorPagado || 0)}
                        </div>
                        <div className="text-[11px] text-[#849495]">
                          {log.estado === 'ACTIVO'
                            ? 'Activo'
                            : `${log.minutosTranscurridos} min`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTicketModal(log)}
                        className="p-2 rounded-lg border border-white/10 hover:border-[#00f5ff] text-[#00f5ff] transition-colors"
                        title="Ver Ticket Digital"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right 7 Columns: Real-Time Availability Map (Read-Only for Client) */}
        <section className="lg:col-span-7 cyber-panel-level1 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono-tabular text-[#00ff87]">
                MAPA DE DISPONIBILIDAD EN VIVO · {availableSpots.length} ESPACIOS LIBRES
              </div>
              <h2 className="text-lg font-bold text-[#e9feff] mt-0.5">
                Ubicación de Bahías Disponibles por Nivel y Zona
              </h2>
            </div>

            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="cyber-input px-3 py-2 rounded-lg text-xs font-mono-tabular"
            >
              <option value="TODAS" className="bg-[#0b1120]">
                Todas las Zonas (S1 y S2)
              </option>
              <option value="Zona A · Estándar" className="bg-[#0b1120]">
                Zona A · Estándar
              </option>
              <option value="Zona B · EV & VIP" className="bg-[#0b1120]">
                Zona B · EV & VIP
              </option>
              <option value="Zona C · Motos" className="bg-[#0b1120]">
                Zona C · Motos
              </option>
              <option value="Zona D · Camionetas" className="bg-[#0b1120]">
                Zona D · Camionetas
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredSpots.map((spot) => {
              const isMySpot = spot.placaActual === (currentUser.placaAsociada || 'KLM-456');
              const isFree = spot.estado === 'DISPONIBLE';
              return (
                <div
                  key={spot.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[104px] ${
                    isMySpot
                      ? 'bg-[#00f5ff]/15 border-[#00f5ff] ring-1 ring-[#00f5ff]'
                      : isFree
                      ? 'bg-[#0b1120]/90 border-[#00ff87]/40'
                      : 'bg-[#0b1120]/40 border-white/10 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono-tabular">
                    <span className="text-sm font-bold text-[#e9feff]">{spot.codigo}</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        isMySpot
                          ? 'text-[#00f5ff]'
                          : isFree
                          ? 'text-[#00ff87]'
                          : 'text-[#849495]'
                      }`}
                    >
                      {isMySpot ? 'MI VEHÍCULO' : spot.estado}
                    </span>
                  </div>

                  <div className="my-2 text-xs">
                    {isMySpot ? (
                      <span className="font-mono-tabular font-bold text-[#00f5ff]">
                        {spot.placaActual}
                      </span>
                    ) : (
                      <span className="text-[#b9caca]">{spot.tipoPermitido}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#849495] border-t border-white/5 pt-1">
                    <span>{spot.nivel}</span>
                    {spot.potenciaEVKw ? (
                      <span className="text-[#00f5ff] flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />
                        {spot.potenciaEVKw}kW
                      </span>
                    ) : (
                      <span>{spot.zona.split(' · ')[0]}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="cyber-modal-level3 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#00f5ff]" />
                <h3 className="text-base font-bold text-[#e9feff]">
                  Resumen Digital de Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketModal(null)}
                className="p-1 text-[#849495] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5 font-mono-tabular text-xs">
              <div className="flex justify-between">
                <span className="text-[#849495]">CÓDIGO TICKET</span>
                <span className="text-[#00f5ff] font-bold">{selectedTicketModal.ticketCodigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">PLACA / ESPACIO</span>
                <span className="text-[#e9feff] font-bold">
                  {selectedTicketModal.placa} · Bahía {selectedTicketModal.spotCodigo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">ENTRADA</span>
                <span className="text-[#dfe2f0]">
                  {new Date(selectedTicketModal.fechaIngreso).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">ESTADO</span>
                <span className="text-[#00ff87] font-bold">{selectedTicketModal.estado}</span>
              </div>
              {selectedTicketModal.valorPagado !== undefined && (
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-[#849495]">VALOR PAGADO</span>
                  <span className="text-[#00ff87] font-bold">
                    {formatCOP(selectedTicketModal.valorPagado)} ({selectedTicketModal.metodoPago})
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicketModal(null)}
              className="cyber-btn-primary w-full py-2.5 rounded-lg text-xs"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
