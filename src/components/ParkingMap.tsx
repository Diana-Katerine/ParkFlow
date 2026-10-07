import React, { useState } from 'react';
import {
  Search,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Car,
  Bike,
  Zap,
  Truck,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import type { ParkingSpot, RoleName, VehicleType, Ticket, ParkingLog } from '../types';

interface ParkingMapProps {
  spots: ParkingSpot[];
  selectedSpotId: string;
  userRole: RoleName;
  tickets?: Ticket[];
  logs?: ParkingLog[];
  filterVehicleType?: VehicleType | 'TODOS';
  onSelectSpot?: (spot: ParkingSpot) => void;
  onToggleMaintenance?: (spot: ParkingSpot) => void;
  onSelectOccupiedForExit?: (placa: string) => void;
  onInspectTicket?: (ticket: Ticket, log: ParkingLog) => void;
}

export const ParkingMap: React.FC<ParkingMapProps> = ({
  spots,
  selectedSpotId,
  userRole,
  tickets = [],
  logs = [],
  onSelectSpot,
  onToggleMaintenance,
  onSelectOccupiedForExit,
  onInspectTicket,
}) => {
  const [zoneFilter, setZoneFilter] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  const zones = Array.from(new Set(spots.map((s) => s.zona)));

  const filteredSpots = spots.filter((spot) => {
    if (zoneFilter !== 'TODAS' && spot.zona !== zoneFilter) return false;
    if (statusFilter !== 'TODOS' && spot.estado !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toUpperCase();
      const matchCode = spot.codigo_espacio.toUpperCase().includes(q);
      const matchPlate = spot.placa_actual?.toUpperCase().includes(q) || false;
      const matchTicket = spot.ticket_actual?.toUpperCase().includes(q) || false;
      if (!matchCode && !matchPlate && !matchTicket) return false;
    }
    return true;
  });

  const getElapsedMinutes = (iso?: string | null) => {
    if (!iso) return 0;
    const diff = Date.now() - new Date(iso).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  };

  const formatElapsed = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderVehicleIcon = (tipo: VehicleType, className = 'w-4 h-4') => {
    switch (tipo) {
      case 'MOTOCICLETA':
        return <Bike className={className} />;
      case 'ELECTRICO':
        return <Zap className={className} />;
      case 'CAMIONETA':
        return <Truck className={className} />;
      default:
        return <Car className={className} />;
    }
  };

  const availableCount = spots.filter((s) => s.estado === 'DISPONIBLE').length;
  const occupiedCount = spots.filter((s) => s.estado === 'OCUPADO').length;
  const maintenanceCount = spots.filter((s) => s.estado === 'MANTENIMIENTO').length;

  return (
    <div className="space-y-5">
      {/* Barra de controles interactivos del mapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        {/* Selector de Estado */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['TODOS', 'DISPONIBLE', 'OCUPADO', 'MANTENIMIENTO'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'TODOS'
                ? `Todos (${spots.length})`
                : status === 'DISPONIBLE'
                ? `Disponibles (${availableCount})`
                : status === 'OCUPADO'
                ? `Ocupados (${occupiedCount})`
                : `Mantenimiento (${maintenanceCount})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtro por Zona */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="TODAS">Todas las Zonas (Plano Completo)</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          {/* Buscador rápido por código, placa o ticket */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Espacio, placa o ticket..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 w-48"
            />
          </div>
        </div>
      </div>

      {/* Carril de Circulación e Indicadores de Acceso del Plano Arquitectónico */}
      <div className="bg-slate-900 text-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-emerald-400">
            <ArrowDownRight className="w-4 h-4" />
            ENTRADA PRINCIPAL (BARRERA #1)
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 hidden sm:inline">
            Carril Central de Circulación Bidireccional
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Libre ({availableCount})
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <Car className="w-3.5 h-3.5" /> Ocupado ({occupiedCount})
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Wrench className="w-3.5 h-3.5" /> Mantenimiento ({maintenanceCount})
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
            SALIDA Y CAJA
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Plano de Bahías de Estacionamiento Agrupado por Zonas */}
      {filteredSpots.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-300 rounded-xl">
          <p className="text-sm font-medium text-slate-700">Sin resultados en el plano del parqueadero</p>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste los filtros de zona o estado para visualizar todas las bahías.
          </p>
          <button
            type="button"
            onClick={() => {
              setZoneFilter('TODAS');
              setStatusFilter('TODOS');
              setSearchQuery('');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Restablecer Vista del Mapa
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {zones.map((zoneName) => {
            const zoneSpots = filteredSpots.filter((s) => s.zona === zoneName);
            if (zoneSpots.length === 0) return null;

            const zoneTotal = spots.filter((s) => s.zona === zoneName).length;
            const zoneFree = spots.filter((s) => s.zona === zoneName && s.estado === 'DISPONIBLE').length;
            const zoneOccupied = spots.filter((s) => s.zona === zoneName && s.estado === 'OCUPADO').length;

            const zoneColorTheme = zoneName.startsWith('Zona A')
              ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50'
              : zoneName.startsWith('Zona B')
              ? 'border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-slate-50'
              : zoneName.startsWith('Zona M')
              ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50'
              : 'border-cyan-200 bg-gradient-to-br from-cyan-50/70 via-white to-slate-50';

            return (
              <div
                key={zoneName}
                className={`border-2 rounded-2xl p-4 space-y-3 shadow-xs ${zoneColorTheme}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-display">
                      {zoneName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-700">
                    <span className="text-emerald-700 font-bold">{zoneFree} libres</span>
                    <span>·</span>
                    <span className="text-amber-700 font-bold">{zoneOccupied} ocupados</span>
                    <span>·</span>
                    <span>Total: {zoneTotal} bahías</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {zoneSpots.map((spot) => {
                    const isAvailable = spot.estado === 'DISPONIBLE';
                    const isOccupied = spot.estado === 'OCUPADO';
                    const isMaintenance = spot.estado === 'MANTENIMIENTO';
                    const isSelected = selectedSpotId === spot.id;
                    const elapsedMins = isOccupied ? getElapsedMinutes(spot.hora_ingreso_actual) : 0;

                    const activeTicket = isOccupied
                      ? tickets.find(
                          (t) =>
                            t.numero_ticket === spot.ticket_actual ||
                            (t.placa === spot.placa_actual && t.estado !== 'PAGADO')
                        )
                      : undefined;
                    const activeLog = isOccupied
                      ? logs.find(
                          (l) =>
                            l.estado_registro === 'ACTIVO' &&
                            (l.placa === spot.placa_actual || l.ticket_numero === spot.ticket_actual)
                        )
                      : undefined;
                    const isOverdueAlert = activeTicket?.estado === 'ALERTA_TIEMPO';

                    return (
                      <div
                        key={spot.id}
                        onClick={() => {
                          if (isAvailable && onSelectSpot) {
                            onSelectSpot(spot);
                          } else if (isOccupied && onSelectOccupiedForExit && spot.placa_actual) {
                            onSelectOccupiedForExit(spot.placa_actual);
                          }
                        }}
                        className={`group relative rounded-xl p-3.5 border-2 transition-all text-left flex flex-col justify-between min-h-[142px] ${
                          isSelected
                            ? 'border-slate-900 ring-2 ring-slate-900/20 bg-emerald-50/90 cursor-pointer shadow-sm'
                            : isAvailable
                            ? 'border-emerald-300 border-dashed bg-white hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer'
                            : isOccupied
                            ? isOverdueAlert
                              ? 'border-amber-500 bg-amber-50/70 hover:border-amber-600 cursor-pointer shadow-xs'
                              : 'border-slate-800 bg-white hover:border-slate-950 cursor-pointer shadow-xs'
                            : 'border-slate-200 bg-slate-100/90 text-slate-400'
                        }`}
                      >
                        {/* Líneas de demarcación de bahía superior */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                                {spot.codigo_espacio}
                              </span>
                              <span className="text-slate-400">
                                {renderVehicleIcon(spot.tipo_permitido, 'w-3.5 h-3.5')}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono uppercase text-slate-500">
                              {spot.tipo_permitido}
                            </p>
                          </div>

                          {/* Estado explícito de la bahía */}
                          <div className="flex items-center gap-1 text-[11px] font-semibold">
                            {isAvailable && (
                              <span className="text-emerald-700 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                LIBRE
                              </span>
                            )}
                            {isOccupied && (
                              <span
                                className={`flex items-center gap-0.5 ${
                                  isOverdueAlert ? 'text-amber-800' : 'text-slate-900'
                                }`}
                              >
                                <AlertTriangle
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isOverdueAlert ? 'text-amber-600' : 'text-amber-500'
                                  }`}
                                />
                                {isOverdueAlert ? 'ALERTA SMS' : 'OCUPADO'}
                              </span>
                            )}
                            {isMaintenance && (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                <Wrench className="w-3.5 h-3.5 shrink-0" />
                                INACTIVO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Representación visual del vehículo o bahía libre */}
                        {isOccupied ? (
                          <div className="my-2 p-2 rounded-lg bg-slate-900 text-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold tracking-wider text-amber-300 tabular-nums">
                                {spot.placa_actual}
                              </span>
                              <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                                {formatElapsed(elapsedMins)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                              <span>{spot.ticket_actual || activeTicket?.numero_ticket || 'TCK'}</span>
                              {activeTicket && (
                                <span
                                  className={
                                    activeTicket.estado === 'ALERTA_TIEMPO'
                                      ? 'text-amber-300 font-semibold'
                                      : 'text-emerald-300'
                                  }
                                >
                                  {activeTicket.estado}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : isAvailable ? (
                          <div className="my-2 py-2.5 px-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 text-center">
                            <span className="text-[11px] font-medium text-emerald-800">
                              {isSelected ? '✓ Bahía Seleccionada' : '+ Clic para Asignar Entrada'}
                            </span>
                          </div>
                        ) : (
                          <div className="my-2 py-2.5 px-2 rounded-lg bg-slate-200/70 text-center">
                            <span className="text-[11px] text-slate-600">Bahía bloqueada por obras</span>
                          </div>
                        )}

                        {/* Pie de la bahía con acciones directas (Ver Ticket / Cobrar / Mantenimiento) */}
                        <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                          {isOccupied ? (
                            <>
                              {activeTicket && activeLog && onInspectTicket ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectTicket(activeTicket, activeLog);
                                  }}
                                  className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950 underline"
                                >
                                  <Receipt className="w-3 h-3" />
                                  Ver Ticket
                                </button>
                              ) : (
                                <span className="font-mono text-slate-500">{spot.ticket_actual}</span>
                              )}

                              {onSelectOccupiedForExit && spot.placa_actual && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectOccupiedForExit(spot.placa_actual!);
                                  }}
                                  className="font-semibold text-emerald-700 hover:text-emerald-900 ml-auto"
                                >
                                  Cobrar Salida →
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-500">
                              {isAvailable ? 'Espacio verificado' : 'Fuera de servicio'}
                            </span>
                          )}

                          {userRole === 'Administrador' && !isOccupied && onToggleMaintenance && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleMaintenance(spot);
                              }}
                              className="text-[11px] text-slate-600 hover:text-slate-900 underline ml-auto"
                            >
                              {isMaintenance ? 'Habilitar' : 'Mantenimiento'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
