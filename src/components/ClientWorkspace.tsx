import React, { useState, useMemo } from 'react';
import {
  Search,
  ShieldAlert,
  Receipt,
  Clock,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react';
import { ParkingMap } from './ParkingMap';
import { TicketModal } from './TicketModal';
import type {
  User,
  ParkingSpot,
  ParkingLog,
  Ticket,
  Rate,
  FeeCalculationBreakdown,
  SmsNotification,
  SmsAlertConfig,
  PaymentMethod,
} from '../types';

interface ClientWorkspaceProps {
  user: User;
  spots: ParkingSpot[];
  logs: ParkingLog[];
  tickets: Ticket[];
  rates: Rate[];
  smsNotifications: SmsNotification[];
  smsConfig: SmsAlertConfig;
}

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({
  user,
  spots,
  logs,
  tickets,
  rates,
  smsNotifications,
  smsConfig,
}) => {
  const [searchPlate, setSearchPlate] = useState(user.placaCliente || 'ABC123');
  const [liveQuote, setLiveQuote] = useState<{
    log: ParkingLog;
    ticket?: Ticket;
    fechaCorte: string;
    calculation: FeeCalculationBreakdown;
  } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [rbacAlert, setRbacAlert] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    mode: 'ENTRY' | 'EXIT';
    ticket: Ticket;
    log: ParkingLog;
  } | null>(null);

  // Estados para la sección "Historial de Pagos" (Tabla paginada + Filtros + Descarga CSV)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'TODOS' | PaymentMethod>('TODOS');
  const [paymentPage, setPaymentPage] = useState<number>(1);
  const [paymentPageSize, setPaymentPageSize] = useState<number>(5);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);

  const availableCount = spots.filter((s) => s.estado === 'DISPONIBLE').length;
  const occupiedCount = spots.filter((s) => s.estado === 'OCUPADO').length;

  const clientLogs = useMemo(() => {
    return logs.filter((l) => {
      if (!searchPlate.trim()) return true;
      const q = searchPlate.trim().toUpperCase();
      return l.placa.toUpperCase().includes(q) || l.ticket_numero.toUpperCase().includes(q);
    });
  }, [logs, searchPlate]);

  // Tickets finalizados del usuario para el Historial de Pagos
  const finalizedPaymentLogs = useMemo(() => {
    return clientLogs
      .filter((l) => l.estado_registro === 'FINALIZADO' && l.valor_pagado !== null)
      .filter((l) => (paymentMethodFilter === 'TODOS' ? true : l.metodo_pago === paymentMethodFilter))
      .sort((a, b) => {
        const dateA = new Date(a.fecha_salida || a.fecha_ingreso).getTime();
        const dateB = new Date(b.fecha_salida || b.fecha_ingreso).getTime();
        return dateB - dateA;
      });
  }, [clientLogs, paymentMethodFilter]);

  const totalPaymentPages = Math.max(1, Math.ceil(finalizedPaymentLogs.length / paymentPageSize));
  const safeCurrentPage = Math.min(paymentPage, totalPaymentPages);

  const paginatedPaymentLogs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * paymentPageSize;
    return finalizedPaymentLogs.slice(startIndex, startIndex + paymentPageSize);
  }, [finalizedPaymentLogs, safeCurrentPage, paymentPageSize]);

  const totalPaidAmount = useMemo(() => {
    return finalizedPaymentLogs.reduce((acc, item) => acc + (item.valor_pagado || 0), 0);
  }, [finalizedPaymentLogs]);

  const totalStayMinutes = useMemo(() => {
    return finalizedPaymentLogs.reduce((acc, item) => acc + (item.minutos_totales || 0), 0);
  }, [finalizedPaymentLogs]);

  const handleCheckActiveBalance = async (placaOrTicket: string) => {
    setQuoteError(null);
    try {
      const res = await fetch(
        `/api/logs/quote/${encodeURIComponent(placaOrTicket.trim().toUpperCase())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLiveQuote(null);
        setQuoteError(data.error || 'No se encontró estancia activa para este vehículo.');
        return;
      }
      setLiveQuote(data);
    } catch {
      setQuoteError('Error de conexión al consultar el estado de cuenta.');
    }
  };

  // Caso Crítico #7: Prueba de violación RBAC (Petición de Cliente a ruta de Administrador -> HTTP 403 Forbidden)
  const handleTestRBACProtection = async () => {
    setRbacAlert(null);
    const res = await fetch('/api/reports');
    const data = await res.json();
    if (res.status === 403) {
      setRbacAlert(`HTTP 403 Forbidden verificado: ${data.error}`);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const formatDurationHuman = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '—';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs}h (${minutes} min)`;
    return `${hrs}h ${mins}m (${minutes} min)`;
  };

  const formatPaymentMethodLabel = (method: PaymentMethod | null) => {
    switch (method) {
      case 'EFECTIVO':
        return 'Efectivo en Caja';
      case 'TARJETA_CREDITO':
        return 'Tarjeta de Crédito';
      case 'TARJETA_DEBITO':
        return 'Tarjeta Débito';
      case 'TRANSFERENCIA_QR':
        return 'Transferencia QR / PSE';
      default:
        return 'No especificado';
    }
  };

  // Descargar comprobante individual en formato CSV
  const handleDownloadSingleReceiptCSV = (log: ParkingLog) => {
    const tck = tickets.find((t) => t.parking_log_id === log.id);
    const headers = [
      'Comprobante_Ticket',
      'Codigo_Verificacion',
      'Cliente',
      'Placa_Vehiculo',
      'Tipo_Vehiculo',
      'Espacio_Asignado',
      'Zona',
      'Fecha_Ingreso',
      'Fecha_Salida_Pago',
      'Tiempo_Total_Permanencia_Minutos',
      'Tiempo_Formateado',
      'Tarifa_Hora_COP',
      'Monto_Pagado_COP',
      'Metodo_Pago',
      'Estado_Ticket',
      'Operador_Salida',
    ];

    const row = [
      log.ticket_numero,
      tck?.codigo_verificacion || `VER-${log.placa}-${log.ticket_numero.slice(-4)}`,
      user.nombre,
      log.placa,
      log.tipo_vehiculo,
      log.codigo_espacio,
      log.zona,
      new Date(log.fecha_ingreso).toLocaleString('es-CO'),
      log.fecha_salida ? new Date(log.fecha_salida).toLocaleString('es-CO') : '',
      String(log.minutos_totales ?? 0),
      formatDurationHuman(log.minutos_totales),
      String(tck?.tarifa_por_hora ?? ''),
      String(log.valor_pagado ?? 0),
      formatPaymentMethodLabel(log.metodo_pago),
      tck?.estado || 'PAGADO',
      log.operador_salida || 'Sistema ParkFlow',
    ];

    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent =
      '\uFEFF' + headers.map(escapeCsv).join(',') + '\n' + row.map(escapeCsv).join(',');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante-pago-${log.ticket_numero}-${log.placa}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvNotice(
      `Comprobante individual descargado: comprobante-pago-${log.ticket_numero}-${log.placa}.csv`
    );
    setTimeout(() => setCsvNotice(null), 5000);
  };

  // Descargar todos los comprobantes filtrados del Historial de Pagos en CSV
  const handleDownloadAllPaymentsCSV = () => {
    if (finalizedPaymentLogs.length === 0) return;

    const headers = [
      'Comprobante_Ticket',
      'Codigo_Verificacion',
      'Cliente',
      'Placa_Vehiculo',
      'Tipo_Vehiculo',
      'Espacio_Asignado',
      'Zona',
      'Fecha_Ingreso',
      'Fecha_Salida_Pago',
      'Tiempo_Total_Permanencia_Minutos',
      'Tiempo_Formateado',
      'Monto_Pagado_COP',
      'Metodo_Pago',
      'Estado_Ticket',
    ];

    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = finalizedPaymentLogs.map((log) => {
      const tck = tickets.find((t) => t.parking_log_id === log.id);
      return [
        log.ticket_numero,
        tck?.codigo_verificacion || `VER-${log.placa}-${log.ticket_numero.slice(-4)}`,
        user.nombre,
        log.placa,
        log.tipo_vehiculo,
        log.codigo_espacio,
        log.zona,
        new Date(log.fecha_ingreso).toLocaleString('es-CO'),
        log.fecha_salida ? new Date(log.fecha_salida).toLocaleString('es-CO') : '',
        String(log.minutos_totales ?? 0),
        formatDurationHuman(log.minutos_totales),
        String(log.valor_pagado ?? 0),
        formatPaymentMethodLabel(log.metodo_pago),
        tck?.estado || 'PAGADO',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const plateSlug = searchPlate.trim() ? searchPlate.trim().toUpperCase() : 'TODOS';
    link.download = `historial-pagos-parkflow-${plateSlug}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvNotice(
      `Historial consolidado descargado (${finalizedPaymentLogs.length} comprobantes en CSV).`
    );
    setTimeout(() => setCsvNotice(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Resumen de Disponibilidad en Tiempo Real y Tarifas Vigentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                01. Disponibilidad de Espacios en Tiempo Real
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte las zonas con cupos libres antes de ingresar al parqueadero.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-700 tabular-nums">
              <span className="text-emerald-700 font-semibold">{availableCount} Libres</span>
              <span className="mx-1.5">·</span>
              <span className="text-amber-700 font-semibold">{occupiedCount} Ocupados</span>
            </div>
          </div>

          <ParkingMap
            spots={spots}
            selectedSpotId=""
            userRole={user.rol}
            tickets={tickets}
            logs={logs}
            onInspectTicket={(tck, logItem) =>
              setSelectedReceipt({ mode: 'ENTRY', ticket: tck, log: logItem })
            }
          />
        </div>

        {/* Columna Lateral: Consulta de Estado de Cuenta / Mis Tickets y Tarifas */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                02. Consultar Estancia Activa y Tarifa Acumulada
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingrese su placa o número de ticket para verificar el valor acumulado al minuto y filtrar su historial de pagos.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPlate}
                  onChange={(e) => {
                    setSearchPlate(e.target.value.toUpperCase());
                    setPaymentPage(1);
                  }}
                  placeholder="Placa o Ticket (ej. ABC123)"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono font-semibold uppercase bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCheckActiveBalance(searchPlate)}
                className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                Consultar
              </button>
            </div>

            {/* Botones rápidos de filtro por placa para pruebas inmediatas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">Consulta rápida:</span>
              {['ABC123', 'EVX800', 'JQP512', 'KLM987', ''].map((plateItem) => (
                <button
                  key={plateItem || 'TODAS'}
                  type="button"
                  onClick={() => {
                    setSearchPlate(plateItem);
                    setPaymentPage(1);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                    searchPlate === plateItem
                      ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {plateItem || 'Todas las placas'}
                </button>
              ))}
            </div>

            {quoteError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                {quoteError}
              </div>
            )}

            {liveQuote && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-mono font-semibold text-sm text-slate-900 tabular-nums">
                    {liveQuote.log.placa} · Espacio {liveQuote.log.codigo_espacio}
                  </span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {liveQuote.log.ticket_numero}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tiempo de permanencia:</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {liveQuote.calculation.minutosTranscurridos} min
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Valor Acumulado Hoy:</span>
                  <span className="text-lg font-mono font-semibold text-emerald-700 tabular-nums">
                    {formatCurrency(liveQuote.calculation.totalPagar)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabla Informativa de Tarifas Vigentes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900">Tarifas Oficiales Vigentes</h3>
            <div className="divide-y divide-slate-200 text-xs">
              {rates.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.tipo_vehiculo}</p>
                    <p className="text-[11px] text-slate-500">Gracia: {r.tiempo_gracia_minutos} min</p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(r.valor_por_hora)} / hora
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatCurrency(r.valor_por_minuto)} / min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verificador de Seguridad RBAC (Caso Crítico #7 de la Matriz de Validaciones) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">Seguridad de Rol (RBAC)</h3>
              <span className="text-[11px] font-mono text-slate-500">Rol: {user.rol}</span>
            </div>
            <p className="text-xs text-slate-500">
              Su cuenta de Cliente tiene acceso de lectura a disponibilidad y tickets propios. Las rutas administrativas están protegidas.
            </p>
            <button
              type="button"
              onClick={handleTestRBACProtection}
              className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Probar Acceso a Ruta de Administrador (Verificar 403)
            </button>
            {rbacAlert && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-900">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{rbacAlert}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NUEVA SECCIÓN: 03. Historial de Pagos (Tabla Paginada de Tickets Finalizados + Descarga CSV) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                03. Historial de Pagos y Comprobantes Finalizados
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registro paginado de todos los tickets finalizados del usuario ({searchPlate || 'Todas las placas'}), con fecha de liquidación, tiempo total de permanencia, monto pagado y descarga de comprobante en formato CSV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadAllPaymentsCSV}
              disabled={finalizedPaymentLogs.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Todo el Historial ({finalizedPaymentLogs.length}) en CSV
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen del Historial de Pagos del Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 to-white border border-indigo-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Tickets Finalizados
              </p>
              <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                {finalizedPaymentLogs.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Placa: <strong className="font-mono text-slate-700">{searchPlate || 'Todas'}</strong>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/90 to-white border border-emerald-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Monto Total Pagado
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-800 tabular-nums mt-0.5">
                {formatCurrency(totalPaidAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pagos verificados en ParkFlow
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/90 to-white border border-amber-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Tiempo Total Acumulado
              </p>
              <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                {formatDurationHuman(totalStayMinutes)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Promedio:{' '}
                {finalizedPaymentLogs.length > 0
                  ? `${Math.round(totalStayMinutes / finalizedPaymentLogs.length)} min / visita`
                  : '0 min'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Selector de Filas por Página */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Método de Pago:
            </span>
            {(
              [
                { id: 'TODOS', label: 'Todos' },
                { id: 'EFECTIVO', label: 'Efectivo' },
                { id: 'TARJETA_CREDITO', label: 'T. Crédito' },
                { id: 'TARJETA_DEBITO', label: 'T. Débito' },
                { id: 'TRANSFERENCIA_QR', label: 'Transferencia QR' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPaymentMethodFilter(m.id);
                  setPaymentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  paymentMethodFilter === m.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="page-size-select" className="text-slate-600 font-medium">
              Filas por página:
            </label>
            <select
              id="page-size-select"
              value={paymentPageSize}
              onChange={(e) => {
                setPaymentPageSize(Number(e.target.value));
                setPaymentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-mono font-semibold text-slate-800"
            >
              <option value={3}>3 registros</option>
              <option value={5}>5 registros</option>
              <option value={10}>10 registros</option>
            </select>
          </div>
        </div>

        {csvNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{csvNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setCsvNotice(null)}
              className="text-emerald-800 underline font-semibold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tabla Paginada de Tickets Finalizados */}
        {finalizedPaymentLogs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-700">
              No se encontraron pagos finalizados para el filtro seleccionado
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Pruebe seleccionando &quot;Todas las placas&quot; o cambiando el filtro de método de pago.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3.5">Ticket / Código</th>
                    <th className="py-3 px-3.5">Placa / Espacio</th>
                    <th className="py-3 px-3.5">Fecha de Pago (Salida)</th>
                    <th className="py-3 px-3.5">Tiempo Total Permanencia</th>
                    <th className="py-3 px-3.5">Método de Pago</th>
                    <th className="py-3 px-3.5 text-right">Monto Pagado</th>
                    <th className="py-3 px-3.5 text-right">Acciones / Comprobante CSV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {paginatedPaymentLogs.map((log) => {
                    const tck = tickets.find((t) => t.parking_log_id === log.id);
                    return (
                      <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {log.ticket_numero}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {tck?.codigo_verificacion || `VER-${log.placa}-${log.ticket_numero.slice(-4)}`}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-semibold text-indigo-950 tabular-nums">
                            {log.placa} · <span className="text-slate-600">{log.tipo_vehiculo}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Bahía {log.codigo_espacio} ({log.zona})
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono tabular-nums text-slate-700">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>
                              {log.fecha_salida
                                ? new Date(log.fecha_salida).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Ingreso: {new Date(log.fecha_ingreso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}{' '}
                            → Salida:{' '}
                            {log.fecha_salida
                              ? new Date(log.fecha_salida).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {formatDurationHuman(log.minutos_totales)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-medium text-slate-800">
                            {formatPaymentMethodLabel(log.metodo_pago)}
                          </span>
                          <div className="text-[11px] text-emerald-700 font-mono font-semibold">
                            PAGADO VERIFICADO
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                          <span className="text-sm font-bold text-emerald-700">
                            {log.valor_pagado !== null ? formatCurrency(log.valor_pagado) : '$0'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleReceiptCSV(log)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md transition-colors"
                              title="Descargar comprobante de pago en formato CSV"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar CSV
                            </button>
                            {tck && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedReceipt({
                                    mode: 'EXIT',
                                    ticket: tck,
                                    log,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium rounded-md transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Ver Recibo
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

            {/* Controles de Paginación de la Tabla */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-600">
              <div className="font-mono tabular-nums">
                Mostrando{' '}
                <strong className="text-slate-900">
                  {(safeCurrentPage - 1) * paymentPageSize + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-900">
                  {Math.min(safeCurrentPage * paymentPageSize, finalizedPaymentLogs.length)}
                </strong>{' '}
                de <strong className="text-slate-900">{finalizedPaymentLogs.length}</strong> tickets
                finalizados
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPaymentPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPaymentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-semibold transition-colors ${
                        pageNum === safeCurrentPage
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentPage((p) => Math.min(totalPaymentPages, p + 1))}
                  disabled={safeCurrentPage >= totalPaymentPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-medium transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Movimientos Generales (Estancias Activas + Finalizadas) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              04. Estado General de Ingresos y Tickets en Curso
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vista combinada de estancias activas y finalizadas asociadas a la placa consultada ({searchPlate || 'Todas'})
            </p>
          </div>
        </div>

        {clientLogs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-700">Sin registros para la placa indicada</p>
            <p className="text-xs text-slate-500 mt-1">
              Ingrese otra placa en el buscador superior para consultar su historial.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3">Espacio</th>
                  <th className="py-2.5 px-3">Ingreso</th>
                  <th className="py-2.5 px-3">Salida</th>
                  <th className="py-2.5 px-3 text-right">Valor Pagado</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {clientLogs.map((log) => {
                  const tck = tickets.find((t) => t.parking_log_id === log.id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 tabular-nums">
                        {log.ticket_numero}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                        {log.placa}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800 tabular-nums">
                        {log.codigo_espacio}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {new Date(log.fecha_ingreso).toLocaleString('es-CO')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {log.fecha_salida
                          ? new Date(log.fecha_salida).toLocaleString('es-CO')
                          : 'En estancia'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {log.valor_pagado !== null ? formatCurrency(log.valor_pagado) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        <div
                          className={`font-mono font-semibold ${
                            tck?.estado === 'ALERTA_TIEMPO'
                              ? 'text-amber-700'
                              : tck?.estado === 'PAGADO'
                              ? 'text-emerald-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {tck ? tck.estado : log.estado_registro}
                        </div>
                        {tck?.sms_alerta_enviado && (
                          <div className="text-[11px] font-mono text-amber-700">
                            Aviso SMS recibido (&gt;{smsConfig?.umbralMinutos || 120}m)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {tck && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReceipt({
                                mode: log.estado_registro === 'ACTIVO' ? 'ENTRY' : 'EXIT',
                                ticket: tck,
                                log,
                              })
                            }
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium underline"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Ver Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Avisos SMS Recibidos por Tiempo Excedido sin Pago */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              05. Avisos Automáticos SMS / Email Recibidos ({searchPlate || 'Mi Vehículo'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Notificaciones enviadas cuando la estancia supera los {smsConfig?.umbralMinutos || 120} minutos sin pago registrado
            </p>
          </div>
        </div>

        {smsNotifications.filter(
          (s) => !searchPlate.trim() || s.placa.toUpperCase().includes(searchPlate.trim().toUpperCase())
        ).length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            No registra alertas por exceso de tiempo para la placa consultada.
          </div>
        ) : (
          <div className="space-y-3">
            {smsNotifications
              .filter(
                (s) =>
                  !searchPlate.trim() || s.placa.toUpperCase().includes(searchPlate.trim().toUpperCase())
              )
              .map((sms) => (
                <div
                  key={sms.id}
                  className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-wrap items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2 font-mono font-semibold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Alerta enviada a {sms.telefono_destino}</span>
                      <span>·</span>
                      <span>
                        Ticket {sms.numero_ticket} ({sms.estado_ticket_resultante})
                      </span>
                    </div>
                    <p className="font-mono text-slate-800 bg-white/90 p-2.5 rounded border border-amber-200/80">
                      {sms.mensaje}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums text-slate-600">
                    <div>{new Date(sms.timestamp).toLocaleString('es-CO')}</div>
                    <div className="font-semibold text-slate-900 mt-1">
                      Saldo reportado: {formatCurrency(sms.saldo_pendiente_cop)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {selectedReceipt && (
        <TicketModal
          mode={selectedReceipt.mode}
          ticket={selectedReceipt.ticket}
          log={selectedReceipt.log}
          onClose={() => setSelectedReceipt(null)}
          onReturnToMap={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
