import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Receipt,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ParkingMap } from './ParkingMap';
import { TicketModal } from './TicketModal';
import { SmsNotificationCenter } from './SmsNotificationCenter';
import type {
  ParkingSpot,
  ParkingLog,
  Ticket,
  Rate,
  RoleName,
  VehicleType,
  PaymentMethod,
  FeeCalculationBreakdown,
  SmsNotification,
  SmsAlertConfig,
} from '../types';

interface OperatorWorkspaceProps {
  userRole: RoleName;
  spots: ParkingSpot[];
  logs: ParkingLog[];
  tickets: Ticket[];
  rates: Rate[];
  smsNotifications: SmsNotification[];
  smsConfig: SmsAlertConfig;
  onRefresh: () => Promise<void>;
  onToggleSpotMaintenance?: (spot: ParkingSpot) => Promise<void>;
}

export const OperatorWorkspace: React.FC<OperatorWorkspaceProps> = ({
  userRole,
  spots,
  logs,
  tickets,
  rates,
  smsNotifications,
  smsConfig,
  onRefresh,
  onToggleSpotMaintenance,
}) => {
  const [activeOperationTab, setActiveOperationTab] = useState<'ENTRADA' | 'SALIDA' | 'ESTANCIAS'>('ENTRADA');

  // --- Estado Formulario de Entrada (2.1 Happy Path) ---
  const [placaEntrada, setPlacaEntrada] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState<VehicleType>('AUTOMOVIL');
  const [selectedSpotId, setSelectedSpotId] = useState('');
  const [propietario, setPropietario] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [observacionesEntrada, setObservacionesEntrada] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // --- Estado Formulario de Salida y Cobro (2.2 Happy Path) ---
  const [searchExitQuery, setSearchExitQuery] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<{
    log: ParkingLog;
    ticket?: Ticket;
    fechaCorte: string;
    calculation: FeeCalculationBreakdown;
  } | null>(null);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('EFECTIVO');
  const [observacionesSalida, setObservacionesSalida] = useState('');
  const [exitProcessing, setExitProcessing] = useState(false);

  // --- Estado Modal de Éxito (Confirmación de Cierre) ---
  const [modalReceipt, setModalReceipt] = useState<{
    mode: 'ENTRY' | 'EXIT';
    ticket: Ticket;
    log: ParkingLog;
    calculation?: FeeCalculationBreakdown;
  } | null>(null);

  // --- Filtro de tabla de estancias ---
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ACTIVO' | 'FINALIZADO' | 'TODOS'>('ACTIVO');
  const [simulatingFull, setSimulatingFull] = useState(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const availableSpots = spots.filter((s) => s.estado === 'DISPONIBLE');
  const occupiedSpots = spots.filter((s) => s.estado === 'OCUPADO');
  const maintenanceSpots = spots.filter((s) => s.estado === 'MANTENIMIENTO');
  const isParkingFull = availableSpots.length === 0;
  const activeLogs = logs.filter((l) => l.estado_registro === 'ACTIVO');

  // Auto-seleccionar primer espacio compatible cuando cambia el tipo de vehículo
  useEffect(() => {
    const currentSelected = spots.find((s) => s.id === selectedSpotId);
    if (!currentSelected || currentSelected.estado !== 'DISPONIBLE') {
      const compatible = availableSpots.find((s) => s.tipo_permitido === tipoVehiculo) || availableSpots[0];
      setSelectedSpotId(compatible ? compatible.id : '');
    }
  }, [tipoVehiculo, spots]);

  const handleSelectSpotFromMap = (spot: ParkingSpot) => {
    setSelectedSpotId(spot.id);
    setTipoVehiculo(spot.tipo_permitido);
    setActiveOperationTab('ENTRADA');
    setEntryError(null);
  };

  const handleSelectOccupiedForExit = (placa: string) => {
    setActiveOperationTab('SALIDA');
    setSearchExitQuery(placa);
    handleFetchQuote(placa);
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    if (isParkingFull) {
      setEntryError('Parqueadero lleno: No hay espacios disponibles para asignar en este momento.');
      return;
    }

    const cleanPlaca = placaEntrada.toUpperCase().replace(/[\s-]/g, '');
    if (!cleanPlaca) {
      setEntryError('Por favor ingrese el número de placa del vehículo.');
      return;
    }

    if (!selectedSpotId) {
      setEntryError('Por favor seleccione un espacio disponible en el mapa o en la lista.');
      return;
    }

    setEntryLoading(true);
    try {
      const res = await fetch('/api/logs/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: cleanPlaca,
          tipo_vehiculo: tipoVehiculo,
          spot_id: selectedSpotId,
          propietario,
          telefono_cliente: telefonoCliente,
          observaciones: observacionesEntrada,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEntryError(data.error || 'Error al registrar la entrada del vehículo.');
        return;
      }

      await onRefresh();
      setPlacaEntrada('');
      setPropietario('');
      setTelefonoCliente('');
      setObservacionesEntrada('');
      setModalReceipt({
        mode: 'ENTRY',
        ticket: data.ticket,
        log: data.log,
      });
    } catch {
      setEntryError('Falla de conexión con el servidor. Se evitó guardar un registro incompleto. Reintente.');
    } finally {
      setEntryLoading(false);
    }
  };

  const handleFetchQuote = async (customQuery?: string) => {
    const q = (customQuery ?? searchExitQuery).trim().toUpperCase();
    setExitError(null);

    if (!q) {
      setExitError('Ingrese una placa o número de ticket para buscar la estancia activa.');
      return;
    }

    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/logs/quote/${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        setQuoteResult(null);
        setExitError(data.error || 'Registro no encontrado.');
        return;
      }

      setQuoteResult(data);
    } catch {
      setExitError('Error de conexión al consultar la tarifa. Por favor reintente.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmExitAndPayment = async () => {
    if (!quoteResult) return;
    setExitError(null);
    setExitProcessing(true);

    try {
      const res = await fetch('/api/logs/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificador: quoteResult.log.placa,
          metodo_pago: metodoPago,
          observaciones: observacionesSalida,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setExitError(data.error || 'No se pudo procesar la salida del vehículo.');
        return;
      }

      await onRefresh();
      const fallbackTicket: Ticket = data.ticket || {
        id: `tck-${data.log.id}`,
        numero_ticket: data.log.ticket_numero,
        parking_log_id: data.log.id,
        placa: data.log.placa,
        tipo_vehiculo: data.log.tipo_vehiculo,
        codigo_espacio: data.log.codigo_espacio,
        zona: data.log.zona,
        fecha_ingreso: data.log.fecha_ingreso,
        tarifa_por_minuto: data.calculation.tarifaAplicada.valor_por_minuto,
        tarifa_por_hora: data.calculation.tarifaAplicada.valor_por_hora,
        codigo_verificacion: `VER-${data.log.placa}`,
        estado: 'PAGADO',
      };

      setQuoteResult(null);
      setSearchExitQuery('');
      setObservacionesSalida('');

      setModalReceipt({
        mode: 'EXIT',
        ticket: fallbackTicket,
        log: data.log,
        calculation: data.calculation,
      });
    } catch {
      setExitError('Falla de conexión a BD: Se abortó la transacción para evitar inconsistencias. Reintente.');
    } finally {
      setExitProcessing(false);
    }
  };

  const handleSimulateFullParking = async (fillAll: boolean) => {
    setSimulatingFull(true);
    setSimFeedback(null);
    try {
      await fetch('/api/spots/simulate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fillAll }),
      });
      await onRefresh();
    } finally {
      setSimulatingFull(false);
    }
  };

  const handleSimulationAction = async (action: 'SIMULATE_ENTRY' | 'SIMULATE_EXIT' | 'RESET_DEMO') => {
    setSimulatingFull(true);
    setSimFeedback(null);
    try {
      const res = await fetch('/api/simulation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      await onRefresh();

      if (res.ok) {
        if (action === 'SIMULATE_ENTRY' && data.ticket && data.log) {
          setSimFeedback(
            `Simulación: Vehículo ${data.log.placa} ingresó al espacio ${data.log.codigo_espacio} y generó el ticket ${data.ticket.numero_ticket}.`
          );
          setModalReceipt({ mode: 'ENTRY', ticket: data.ticket, log: data.log });
        } else if (action === 'SIMULATE_EXIT' && data.log) {
          setSimFeedback(
            `Simulación: Vehículo ${data.log.placa} pagó ${formatCurrency(data.log.valor_pagado || 0)} y liberó el espacio ${data.log.codigo_espacio}.`
          );
        } else if (action === 'RESET_DEMO') {
          setSimFeedback('Escenario demostrativo restaurado con 9 vehículos ocupados, 13 disponibles y 2 en mantenimiento.');
        }
      }
    } finally {
      setSimulatingFull(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const filteredLogs = logs.filter((l) => {
    if (logStatusFilter !== 'TODOS' && l.estado_registro !== logStatusFilter) return false;
    if (logSearch.trim() !== '') {
      const q = logSearch.trim().toUpperCase();
      return (
        l.placa.toUpperCase().includes(q) ||
        l.ticket_numero.toUpperCase().includes(q) ||
        l.codigo_espacio.toUpperCase().includes(q)
      );
    }
    return true;
  });

  const currentRate = rates.find((r) => r.tipo_vehiculo === tipoVehiculo) || rates[0];

  return (
    <div className="space-y-8">
      {/* Banner Crítico de Aforo al 100% (Caso Crítico #2) */}
      {isParkingFull && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-300 rounded-xl flex flex-wrap items-center justify-between gap-4 text-red-900"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Alerta Operativa: Parqueadero Lleno (Aforo al 100%)</p>
              <p className="text-xs text-red-700 mt-0.5">
                Todos los espacios se encuentran ocupados o bloqueados. El registro de nuevas entradas está deshabilitado hasta liberar un espacio.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={simulatingFull}
            onClick={() => handleSimulateFullParking(false)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap"
          >
            Habilitar Espacios en Mantenimiento
          </button>
        </div>
      )}

      {/* Barra de Simulación Interactiva en Vivo (1 Clic para poblar/simular mapa y tickets) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Simulador Visual Interactivo en Tiempo Real — ParkFlow
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Controle en vivo las bahías disponibles ({availableSpots.length}), ocupadas ({occupiedSpots.length}), en mantenimiento ({maintenanceSpots.length}), gráficas y tickets digitales con un clic:
          </p>
          {simFeedback && (
            <p className="text-xs font-mono text-amber-300 mt-1.5 font-semibold">{simFeedback}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={simulatingFull || isParkingFull}
            onClick={() => handleSimulationAction('SIMULATE_ENTRY')}
            className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            + Simular Entrada y Ticket
          </button>
          <button
            type="button"
            disabled={simulatingFull || activeLogs.length === 0}
            onClick={() => handleSimulationAction('SIMULATE_EXIT')}
            className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-white rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            ✓ Simular Salida y Cobro
          </button>
          <button
            type="button"
            disabled={simulatingFull}
            onClick={() => handleSimulateFullParking(!isParkingFull)}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            {isParkingFull ? 'Liberar Aforo' : 'Simular Aforo 100% Lleno'}
          </button>
          <button
            type="button"
            disabled={simulatingFull}
            onClick={() => handleSimulationAction('RESET_DEMO')}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Restaurar Escenario Demo
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas con Colores Vibrantes + Panel de Gráficas en Tiempo Real */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Espacios Disponibles Ahora
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-mono font-bold tabular-nums">{availableSpots.length}</span>
              <span className="text-xs font-mono text-emerald-100">
                de {spots.length} bahías ({spots.length > 0 ? Math.round((availableSpots.length / spots.length) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 mt-2">Listos para asignación inmediata</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              Vehículos en Estancia Activa
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-mono font-bold tabular-nums">{occupiedSpots.length}</span>
              <span className="text-xs font-mono text-amber-100">
                Ocupación: {spots.length > 0 ? Math.round((occupiedSpots.length / spots.length) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-amber-100 mt-2">
              {tickets.filter((t) => t.estado === 'ALERTA_TIEMPO').length} en alerta de sobreestancia SMS
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
              Recaudación Acumulada
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-mono font-bold tabular-nums">
                {formatCurrency(
                  logs
                    .filter((l) => l.estado_registro === 'FINALIZADO')
                    .reduce((acc, item) => acc + (item.valor_pagado || 0), 0)
                )}
              </span>
            </div>
            <p className="text-[11px] text-indigo-100 mt-2">
              {logs.filter((l) => l.estado_registro === 'FINALIZADO').length} salidas liquidadas y pagadas
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-2xl p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Tickets Digitales Emitidos
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-mono font-bold tabular-nums">{tickets.length}</span>
              <span className="text-xs font-mono text-cyan-100">
                {activeLogs.length} activos · {tickets.filter((t) => t.estado === 'PAGADO').length} pagados
              </span>
            </div>
            <p className="text-[11px] text-cyan-100 mt-2">Trazabilidad QR y notificación SMS activa</p>
          </div>
        </div>

        {/* Fila de 3 Gráficas Interactivas en Vivo (Dona de Estado, Barras por Zona, Curva de Flujo) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfica 1: Distribución de Bahías (Dona Multicolor) */}
          <div className="lg:col-span-4 bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Distribución de Bahías en Vivo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proporción actual de espacios libres, ocupados e inactivos
              </p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Disponibles', value: availableSpots.length, color: '#10B981' },
                      { name: 'Ocupados', value: occupiedSpots.length, color: '#F59E0B' },
                      { name: 'Mantenimiento', value: maintenanceSpots.length, color: '#6366F1' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      { name: 'Disponibles', value: availableSpots.length, color: '#10B981' },
                      { name: 'Ocupados', value: occupiedSpots.length, color: '#F59E0B' },
                      { name: 'Mantenimiento', value: maintenanceSpots.length, color: '#6366F1' },
                    ].map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-around pt-2 border-t border-slate-100 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Libres: {availableSpots.length}
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Ocupados: {occupiedSpots.length}
              </span>
              <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Obras: {maintenanceSpots.length}
              </span>
            </div>
          </div>

          {/* Gráfica 2: Ocupación vs Disponibilidad por Zona del Parqueadero */}
          <div className="lg:col-span-4 bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Capacidad y Ocupación por Zona
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativa en tiempo real entre cupos ocupados y libres por categoría
              </p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      zona: 'Zona A (Autos)',
                      Ocupados: spots.filter((s) => s.zona.startsWith('Zona A') && s.estado === 'OCUPADO').length,
                      Disponibles: spots.filter((s) => s.zona.startsWith('Zona A') && s.estado === 'DISPONIBLE').length,
                    },
                    {
                      zona: 'Zona B (Camion.)',
                      Ocupados: spots.filter((s) => s.zona.startsWith('Zona B') && s.estado === 'OCUPADO').length,
                      Disponibles: spots.filter((s) => s.zona.startsWith('Zona B') && s.estado === 'DISPONIBLE').length,
                    },
                    {
                      zona: 'Zona M (Motos)',
                      Ocupados: spots.filter((s) => s.zona.startsWith('Zona M') && s.estado === 'OCUPADO').length,
                      Disponibles: spots.filter((s) => s.zona.startsWith('Zona M') && s.estado === 'DISPONIBLE').length,
                    },
                    {
                      zona: 'Zona E (Eléctr.)',
                      Ocupados: spots.filter((s) => s.zona.startsWith('Zona E') && s.estado === 'OCUPADO').length,
                      Disponibles: spots.filter((s) => s.zona.startsWith('Zona E') && s.estado === 'DISPONIBLE').length,
                    },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="zona"
                    tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Bar dataKey="Ocupados" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Disponibles" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono text-slate-600">
              <span className="text-amber-700 font-semibold">■ Ocupados ({occupiedSpots.length})</span>
              <span className="text-emerald-700 font-semibold">■ Disponibles ({availableSpots.length})</span>
            </div>
          </div>

          {/* Gráfica 3: Flujo Horario de Ingresos y Recaudación Intradía */}
          <div className="lg:col-span-4 bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Curva de Demanda y Flujo del Día
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tendencia horaria de ocupación vehicular en el parqueadero
              </p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { hora: '07:00', vehiculos: 4 },
                    { hora: '09:00', vehiculos: 11 },
                    { hora: '11:00', vehiculos: 16 },
                    { hora: '13:00', vehiculos: 20 },
                    { hora: '15:00', vehiculos: 17 },
                    { hora: '17:00', vehiculos: 19 },
                    { hora: '19:00', vehiculos: Math.max(9, occupiedSpots.length) },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFlujoOp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 24]}
                    tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vehiculos"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFlujoOp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono text-indigo-700 font-semibold">
              <span>Pico registrado: 20 bahías</span>
              <span>Ahora: {occupiedSpots.length} activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principal de 12 Columnas: Mapa de Ocupación (7 cols) + Consola de Flujo Vehicular (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Mapa Interactivo de Espacios en Tiempo Real */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                01. Mapa Visual de Espacios (Disponibles, Ocupados y Mantenimiento)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Haga clic en una bahía libre para asignar ingreso o en una bahía ocupada para ver su ticket / liquidar salida.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
              <span className="text-emerald-700 font-semibold">Libres: {availableSpots.length}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-800 font-semibold">Ocupados: {occupiedSpots.length}</span>
              <span aria-hidden="true">·</span>
              <span>Inactivos: {maintenanceSpots.length}</span>
            </div>
          </div>

          <ParkingMap
            spots={spots}
            selectedSpotId={selectedSpotId}
            userRole={userRole}
            tickets={tickets}
            logs={logs}
            onSelectSpot={handleSelectSpotFromMap}
            onToggleMaintenance={onToggleSpotMaintenance}
            onSelectOccupiedForExit={handleSelectOccupiedForExit}
            onInspectTicket={(tck, logItem) =>
              setModalReceipt({ mode: 'ENTRY', ticket: tck, log: logItem })
            }
          />
        </div>

        {/* Columna Derecha: Terminal de Control de Acceso (Entrada / Salida y Cobro) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {/* Selector de Flujo Operativo */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                02. Terminal de Flujo Vehicular
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de ingresos, generación de tickets y liquidación automática
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveOperationTab('ENTRADA');
                setEntryError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeOperationTab === 'ENTRADA'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registrar Entrada
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveOperationTab('SALIDA');
                setExitError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeOperationTab === 'SALIDA'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Salida y Cobro ({activeLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveOperationTab('ESTANCIAS')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeOperationTab === 'ESTANCIAS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estancias Activas
            </button>
          </div>

          {/* VISTA 2.1: REGISTRO DE ENTRADA (HAPPY PATH) */}
          {activeOperationTab === 'ENTRADA' && (
            <form onSubmit={handleRegisterEntry} className="space-y-4">
              {entryError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Validación de Ingreso Rechazada</p>
                    <p className="mt-0.5">{entryError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Placa del Vehículo (Formato Estandarizado) *
                </label>
                <input
                  type="text"
                  value={placaEntrada}
                  onChange={(e) => {
                    setPlacaEntrada(e.target.value.toUpperCase());
                    if (entryError) setEntryError(null);
                  }}
                  disabled={isParkingFull || entryLoading}
                  placeholder="Ej. ABC123 o XRT45D"
                  maxLength={7}
                  className="w-full px-3.5 py-2.5 text-base font-mono font-semibold uppercase tracking-wider bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sin caracteres especiales ni guiones. Verifica duplicidad en estancia activa automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Vehículo *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'ELECTRICO'] as VehicleType[]).map((tipo) => {
                    const r = rates.find((rate) => rate.tipo_vehiculo === tipo);
                    const selected = tipoVehiculo === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        disabled={isParkingFull}
                        onClick={() => {
                          setTipoVehiculo(tipo);
                          const matchSpot = availableSpots.find((s) => s.tipo_permitido === tipo);
                          if (matchSpot) setSelectedSpotId(matchSpot.id);
                        }}
                        className={`p-2.5 text-left border rounded-lg transition-colors ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-xs font-semibold">{tipo}</div>
                        {r && (
                          <div
                            className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                              selected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {formatCurrency(r.valor_por_hora)}/h · {formatCurrency(r.valor_por_minuto)}/m
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Espacio Disponible Asignado *
                  </label>
                  <select
                    value={selectedSpotId}
                    onChange={(e) => setSelectedSpotId(e.target.value)}
                    disabled={isParkingFull || entryLoading}
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                  >
                    {availableSpots.length === 0 ? (
                      <option value="">Parqueadero lleno (0 libres)</option>
                    ) : (
                      availableSpots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.codigo_espacio} — {s.tipo_permitido}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nombre Conductor / Cliente
                  </label>
                  <input
                    type="text"
                    value={propietario}
                    onChange={(e) => setPropietario(e.target.value)}
                    disabled={isParkingFull || entryLoading}
                    placeholder="Opcional (ej. Visitante)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Teléfono Móvil (Avisos SMS)
                  </label>
                  <input
                    type="tel"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    disabled={isParkingFull || entryLoading}
                    placeholder="Ej. +57 310 458 9210"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Observaciones de Ingreso
                  </label>
                  <input
                    type="text"
                    value={observacionesEntrada}
                    onChange={(e) => setObservacionesEntrada(e.target.value)}
                    disabled={isParkingFull || entryLoading}
                    placeholder="Ej. Casco en casillero..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Resumen previo de Tarifa Aplicable */}
              {currentRate && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
                  <span>Tarifa vigente ({tipoVehiculo})</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(currentRate.valor_por_hora)}/h · Plena día {formatCurrency(currentRate.tarifa_plena_dia)}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isParkingFull || entryLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {entryLoading ? (
                  'Procesando ingreso y asignando espacio...'
                ) : isParkingFull ? (
                  'Parqueadero Lleno — Asignación Bloqueada'
                ) : (
                  <>
                    Registrar Entrada y Generar Ticket Digital
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VISTA 2.2: REGISTRO DE SALIDA Y COBRO (HAPPY PATH) */}
          {activeOperationTab === 'SALIDA' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Buscar Estancia Activa por Placa o Número de Ticket
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchExitQuery}
                      onChange={(e) => {
                        setSearchExitQuery(e.target.value.toUpperCase());
                        if (exitError) setExitError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchQuote();
                        }
                      }}
                      placeholder="Ej. ABC123, KLM987 o TCK-2026-1001"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold uppercase bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={quoteLoading}
                    onClick={() => handleFetchQuote()}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {quoteLoading ? 'Calculando...' : 'Calcular Tarifa'}
                  </button>
                </div>
              </div>

              {/* Accesos rápidos a vehículos actualmente dentro del parqueadero */}
              {activeLogs.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Selección rápida de vehículos en estancia activa ({activeLogs.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLogs.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setSearchExitQuery(l.placa);
                          handleFetchQuote(l.placa);
                        }}
                        className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors tabular-nums"
                      >
                        {l.placa} ({l.codigo_espacio})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerta cuando Ticket / Placa no existe (Caso Crítico #4) */}
              {exitError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Alerta de Búsqueda</p>
                    <p className="mt-0.5">{exitError}</p>
                  </div>
                </div>
              )}

              {/* Tarjeta de Liquidación de Permanencia y Cobro */}
              {quoteResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs text-slate-500">Vehículo en Espacio {quoteResult.log.codigo_espacio}</span>
                      <p className="text-xl font-mono font-semibold text-slate-900 tabular-nums">
                        {quoteResult.log.placa} · {quoteResult.log.tipo_vehiculo}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Ticket Asociado</span>
                      <p className="text-xs font-mono font-semibold text-slate-800 tabular-nums">
                        {quoteResult.log.ticket_numero}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Hora de Ingreso</span>
                      <p className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                        {new Date(quoteResult.log.fecha_ingreso).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Hora de Liquidación</span>
                      <p className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                        {new Date(quoteResult.fechaCorte).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tiempo Transcurrido</span>
                      <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {quoteResult.calculation.minutosTranscurridos} min (
                        {quoteResult.calculation.horasCompletas}h {quoteResult.calculation.minutosRestantes}m)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Cruce de Medianoche</span>
                      <p className="font-medium text-slate-900 mt-0.5">
                        {quoteResult.calculation.cruzoMedianoche
                          ? 'Sí (Cálculo multi-día aplicado)'
                          : 'No (Mismo día calendario)'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Fórmula Tarifaria Aplicada</span>
                      <button
                        type="button"
                        onClick={() => handleFetchQuote(quoteResult.log.placa)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Actualizar reloj
                      </button>
                    </div>
                    <p className="text-xs font-mono text-slate-800 tabular-nums">
                      {quoteResult.calculation.explicacion}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-900">Valor Exacto a Pagar</span>
                      <span className="text-2xl font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(quoteResult.calculation.totalPagar)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Medio de Pago Recibido *
                      </label>
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="EFECTIVO">Efectivo en Caja</option>
                        <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                        <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                        <option value="TRANSFERENCIA_QR">Transferencia / Código QR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nota de Salida (Opcional)
                      </label>
                      <input
                        type="text"
                        value={observacionesSalida}
                        onChange={(e) => setObservacionesSalida(e.target.value)}
                        placeholder="Ej. Factura entregada"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={exitProcessing}
                    onClick={handleConfirmExitAndPayment}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {exitProcessing
                      ? 'Registrando pago y liberando espacio...'
                      : `Confirmar Pago (${formatCurrency(quoteResult.calculation.totalPagar)}) y Liberar Espacio ${quoteResult.log.codigo_espacio}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VISTA 2.3: LISTA RÁPIDA DE ESTANCIAS ACTIVAS */}
          {activeOperationTab === 'ESTANCIAS' && (
            <div className="space-y-3">
              {activeLogs.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-300 rounded-xl">
                  <p className="text-sm font-medium text-slate-700">No hay vehículos en el parqueadero</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Todos los espacios se encuentran libres en este momento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  {activeLogs.map((log) => {
                    const tck = tickets.find((t) => t.parking_log_id === log.id);
                    return (
                      <div key={log.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-sm text-slate-900 tabular-nums">
                              {log.placa}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-medium text-slate-700 tabular-nums">
                              Espacio {log.codigo_espacio}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500">{log.tipo_vehiculo}</span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                            {log.ticket_numero} · Ingreso: {new Date(log.fecha_ingreso).toLocaleTimeString('es-CO')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {tck && (
                            <button
                              type="button"
                              onClick={() => setModalReceipt({ mode: 'ENTRY', ticket: tck, log })}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              Ver Ticket
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectOccupiedForExit(log.placa)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                          >
                            Dar Salida
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Galería Visual de Tickets Digitales Activos y Emitidos */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              03. Talonario Visual de Tickets Digitales en Circulación ({activeLogs.length} activos)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Representación visual de cada ticket emitido con código de verificación, bahía asignada, tarifa y alerta SMS
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 tabular-nums">
            Total tickets emitidos: {tickets.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeLogs.map((log) => {
            const tck = tickets.find((t) => t.parking_log_id === log.id);
            if (!tck) return null;
            const elapsedMins = Math.max(
              1,
              Math.floor((Date.now() - new Date(log.fecha_ingreso).getTime()) / 60000)
            );
            const rate = rates.find((r) => r.tipo_vehiculo === log.tipo_vehiculo) || rates[0];
            const estimatedAmount = Math.min(
              rate.tarifa_plena_dia,
              Math.floor(elapsedMins / 60) * rate.valor_por_hora +
                Math.min(rate.valor_por_hora, (elapsedMins % 60) * rate.valor_por_minuto)
            );
            const isOverdue = tck.estado === 'ALERTA_TIEMPO';

            return (
              <div
                key={tck.id}
                className={`rounded-xl border-2 p-4 flex flex-col justify-between space-y-3 transition-all ${
                  isOverdue
                    ? 'border-amber-400 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2.5">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">Ticket Digital</span>
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {tck.numero_ticket}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-slate-500">Estado Ticket</span>
                      <p
                        className={`font-mono text-xs font-bold ${
                          isOverdue ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {tck.estado}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[11px] text-slate-500">Placa · Vehículo</span>
                      <p className="font-mono font-bold text-slate-900 tabular-nums">
                        {log.placa} ({log.tipo_vehiculo.slice(0, 4)})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Bahía Asignada</span>
                      <p className="font-mono font-bold text-slate-900 tabular-nums">
                        Espacio {log.codigo_espacio}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Hora Entrada</span>
                      <p className="font-mono text-slate-700 tabular-nums">
                        {new Date(log.fecha_ingreso).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({elapsedMins} min)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Saldo Estimado</span>
                      <p className="font-mono font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(estimatedAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-dashed border-slate-300 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setModalReceipt({ mode: 'ENTRY', ticket: tck, log })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 underline"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Abrir Comprobante
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectOccupiedForExit(log.placa)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Liquidar y Cobrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla Consolidada de Movimientos y Tickets Recientes */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              03. Registro de Movimientos y Trazabilidad de Tickets
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial en vivo de ingresos, salidas liquidadas y comprobantes digitales emitidos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ACTIVO', 'FINALIZADO', 'TODOS'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLogStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    logStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ACTIVO' ? 'En Estancia Activa' : st === 'FINALIZADO' ? 'Finalizados' : 'Todos'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filtrar por placa o ticket..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-52"
              />
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-700">Sin resultados en la búsqueda</p>
            <p className="text-xs text-slate-500 mt-1">
              No se encontraron registros que coincidan con el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Placa · Categoría</th>
                  <th className="py-2.5 px-3">Espacio</th>
                  <th className="py-2.5 px-3">Entrada</th>
                  <th className="py-2.5 px-3">Salida</th>
                  <th className="py-2.5 px-3 text-right">Tiempo</th>
                  <th className="py-2.5 px-3 text-right">Valor Pagado</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredLogs.map((log) => {
                  const associatedTicket = tickets.find((t) => t.parking_log_id === log.id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 tabular-nums">
                        {log.ticket_numero}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">{log.placa}</span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-slate-600">{log.tipo_vehiculo}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 tabular-nums">
                        {log.codigo_espacio}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {new Date(log.fecha_ingreso).toLocaleString('es-CO', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {log.fecha_salida
                          ? new Date(log.fecha_salida).toLocaleString('es-CO', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'En curso'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {log.minutos_totales ? `${log.minutos_totales} min` : 'Activo'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {log.valor_pagado !== null ? formatCurrency(log.valor_pagado) : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {associatedTicket ? associatedTicket.estado : log.estado_registro}
                        </div>
                        {associatedTicket?.sms_alerta_enviado && (
                          <div className="text-[11px] font-mono text-amber-700">
                            SMS enviado ({associatedTicket.telefono_cliente})
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {associatedTicket && (
                            <button
                              type="button"
                              onClick={() =>
                                setModalReceipt({
                                  mode: log.estado_registro === 'ACTIVO' ? 'ENTRY' : 'EXIT',
                                  ticket: associatedTicket,
                                  log,
                                })
                              }
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium underline"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Ticket
                            </button>
                          )}
                          {log.estado_registro === 'ACTIVO' && (
                            <button
                              type="button"
                              onClick={() => handleSelectOccupiedForExit(log.placa)}
                              className="px-2.5 py-1 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
                            >
                              Cobrar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Módulo 04: Centro de Notificaciones SMS Automáticas por Tiempo Excedido */}
      <SmsNotificationCenter
        smsNotifications={smsNotifications}
        smsConfig={smsConfig}
        tickets={tickets}
        logs={logs}
        userRole={userRole}
        onRefresh={onRefresh}
      />

      {/* Modal de Confirmación de Cierre (Success) */}
      {modalReceipt && (
        <TicketModal
          mode={modalReceipt.mode}
          ticket={modalReceipt.ticket}
          log={modalReceipt.log}
          calculation={modalReceipt.calculation}
          onClose={() => setModalReceipt(null)}
          onReturnToMap={() => {
            setModalReceipt(null);
            setActiveOperationTab('ENTRADA');
          }}
        />
      )}
    </div>
  );
};
