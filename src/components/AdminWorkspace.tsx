import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Filter,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ZoneHeatmap } from './ZoneHeatmap';
import { SmsNotificationCenter } from './SmsNotificationCenter';
import type {
  Rate,
  User,
  RoleName,
  ReportSummary,
  AuditLog,
  VehicleType,
  Ticket,
  ParkingLog,
  SmsNotification,
  SmsAlertConfig,
} from '../types';

interface AdminWorkspaceProps {
  initialSection?: 'REPORTES' | 'TARIFAS' | 'USUARIOS' | 'AUDITORIA' | 'SMS';
  rates: Rate[];
  tickets: Ticket[];
  logs: ParkingLog[];
  smsNotifications: SmsNotification[];
  smsConfig: SmsAlertConfig;
  onRefreshGlobal: () => Promise<void>;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  initialSection = 'REPORTES',
  rates,
  tickets,
  logs,
  smsNotifications,
  smsConfig,
  onRefreshGlobal,
}) => {
  const [activeSection, setActiveSection] = useState<'REPORTES' | 'TARIFAS' | 'USUARIOS' | 'AUDITORIA' | 'SMS'>(
    initialSection
  );

  // Sincronizar cuando la navegación superior cambia la sub-sección
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // --- Estado de Reportes (2.3 Happy Path) ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // --- Estado de Tarifas ---
  const [editableRates, setEditableRates] = useState<Record<string, Rate>>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);
  const [rateFeedback, setRateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Estado de Usuarios ---
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRol, setNewUserRol] = useState<RoleName>('Operador');
  const [newUserPlaca, setNewUserPlaca] = useState('');
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Estado de Auditoría ---
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('TODOS');
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    const map: Record<string, Rate> = {};
    rates.forEach((r) => {
      map[r.id] = { ...r };
    });
    setEditableRates(map);
  }, [rates]);

  const fetchReports = async () => {
    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'REPORTES') fetchReports();
    if (activeSection === 'USUARIOS') fetchUsers();
    if (activeSection === 'AUDITORIA') fetchAuditLogs();
  }, [activeSection]);

  const handleSaveRate = async (rateId: string) => {
    const edited = editableRates[rateId];
    if (!edited) return;
    setSavingRateId(rateId);
    setRateFeedback(null);

    try {
      const res = await fetch(`/api/rates/${rateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor_por_minuto: Number(edited.valor_por_minuto),
          valor_por_hora: Number(edited.valor_por_hora),
          tarifa_plena_dia: Number(edited.tarifa_plena_dia),
          tiempo_gracia_minutos: Number(edited.tiempo_gracia_minutos),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRateFeedback({ type: 'error', message: data.error || 'Error al actualizar tarifa' });
        return;
      }
      await onRefreshGlobal();
      setRateFeedback({
        type: 'success',
        message: `Tarifa de ${edited.tipo_vehiculo} actualizada correctamente en el motor de liquidación.`,
      });
    } catch {
      setRateFeedback({ type: 'error', message: 'Falla de conexión al guardar la tarifa.' });
    } finally {
      setSavingRateId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFeedback(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newUserNombre,
          email: newUserEmail,
          password: newUserPassword,
          rol: newUserRol,
          placaCliente: newUserPlaca || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserFeedback({ type: 'error', message: data.error || 'No se pudo crear el usuario.' });
        return;
      }
      setNewUserNombre('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPlaca('');
      setUserFeedback({
        type: 'success',
        message: `Cuenta creada para ${data.user.nombre} con rol ${data.user.rol}.`,
      });
      await fetchUsers();
    } catch {
      setUserFeedback({ type: 'error', message: 'Error de red al crear usuario.' });
    }
  };

  const handleUpdateUser = async (userId: string, patch: { rol?: RoleName; activo?: boolean }) => {
    setUserFeedback(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserFeedback({ type: 'error', message: data.error || 'No se pudo actualizar el usuario.' });
        return;
      }
      await fetchUsers();
      setUserFeedback({
        type: 'success',
        message: `Permisos de ${data.user.nombre} actualizados (${data.user.rol} · ${
          data.user.activo ? 'Activo' : 'Inactivo'
        }).`,
      });
    } catch {
      setUserFeedback({ type: 'error', message: 'Error al actualizar el estado del usuario.' });
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const headers = [
      'Ticket',
      'Placa',
      'TipoVehiculo',
      'Espacio',
      'FechaIngreso',
      'FechaSalida',
      'MinutosTotales',
      'ValorPagadoCOP',
      'MetodoPago',
      'Estado',
    ];
    const rows = reportData.registrosPeriodo.map((r) => [
      r.ticket_numero,
      r.placa,
      r.tipo_vehiculo,
      r.codigo_espacio,
      r.fecha_ingreso,
      r.fecha_salida || '',
      r.minutos_totales ?? '',
      r.valor_pagado ?? 0,
      r.metodo_pago || '',
      r.estado_registro,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-parkflow-${startDate}-a-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const generatedAt = new Date().toLocaleString('es-CO');

    // Encabezado Institucional de Auditoría
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ParkFlow — Reporte Detallado de Auditoria', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Periodo auditado: ${reportData.rangoInicio} a ${reportData.rangoFin}   |   Generado: ${generatedAt}`,
      14,
      23
    );

    // 1. Resumen Ejecutivo de Indicadores Clave (KPIs)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. Indicadores Clave de Rendimiento y Recaudacion', 14, 42);

    autoTable(doc, {
      startY: 45,
      head: [['Indicador Operativo', 'Valor Auditado']],
      body: [
        ['Recaudacion Total Confirmada (COP)', formatCurrency(reportData.recaudacionTotal)],
        ['Ticket Promedio por Salida', formatCurrency(reportData.ticketPromedio)],
        ['Total Vehiculos Atendidos en el Periodo', `${reportData.totalVehiculosAtendidos} vehiculos`],
        [
          'Estado de Estancias',
          `${reportData.vehiculosFinalizadosPeriodo} finalizadas / ${reportData.vehiculosActivosAhora} activas`,
        ],
        [
          'Ocupacion Actual del Parqueadero',
          `${reportData.porcentajeOcupacionActual}% (${reportData.espaciosOcupados} ocupados de ${reportData.totalEspacios} totales)`,
        ],
        ['Tiempo Promedio de Permanencia', `${reportData.estanciaPromedioMinutos} minutos`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 95 },
        1: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    const afterKpiY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 95;

    // 2. Serie Visualizada en Recharts: Curva de Ocupación Horaria (06:00 - 22:00)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. Curva de Ocupacion a lo Largo del Dia (Datos Recharts 06:00 - 22:00)', 14, afterKpiY + 9);

    autoTable(doc, {
      startY: afterKpiY + 12,
      head: [['Franja Horaria', 'Espacios Ocupados', 'Espacios Disponibles', '% Ocupacion']],
      body: (reportData.ocupacionPorHora || []).map((row) => [
        row.hora,
        `${row.ocupados} cupos`,
        `${row.disponibles} libres`,
        `${row.porcentaje}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    const afterOccupancyY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 180;

    // 3. Serie Visualizada en Recharts: Evolución de Recaudación Histórica Diaria
    if (afterOccupancyY > 230) {
      doc.addPage();
    }
    const revStartY = afterOccupancyY > 230 ? 20 : afterOccupancyY + 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. Evolucion de Recaudacion Historica Diaria (Datos Recharts)', 14, revStartY);

    autoTable(doc, {
      startY: revStartY + 3,
      head: [['Fecha Calendario', 'Etiqueta Grafico', 'Salidas Liquidadas', 'Recaudacion del Dia (COP)']],
      body: (reportData.recaudacionHistorica || []).map((item) => [
        item.fecha,
        item.etiqueta,
        `${item.vehiculos} vehiculo(s)`,
        formatCurrency(item.recaudacion),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    const afterRevY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;

    // 4. Desglose por Categoría de Vehículo y Medio de Pago
    const catStartY = afterRevY > 230 ? (doc.addPage(), 20) : afterRevY + 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. Consolidado por Categoria Vehicular y Medio de Pago', 14, catStartY);

    const categoryRows = (['AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'ELECTRICO'] as VehicleType[]).map(
      (tipo) => {
        const entry = reportData.recaudacionPorTipo[tipo] || { cantidad: 0, total: 0 };
        return [tipo, `${entry.cantidad} salida(s)`, formatCurrency(entry.total)];
      }
    );

    autoTable(doc, {
      startY: catStartY + 3,
      head: [['Categoria de Vehiculo', 'Volumen Liquidado', 'Total Recaudado (COP)']],
      body: categoryRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    // Pie de página de firma de auditoría
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `ParkFlow — Documento Oficial de Auditoria Financiera y de Ocupacion | Pagina ${i} de ${pageCount}`,
        14,
        288
      );
    }

    doc.save(`auditoria-parkflow-${startDate}-a-${endDate}.pdf`);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const filteredAudit = auditLogs.filter(
    (a) => auditModuleFilter === 'TODOS' || a.modulo === auditModuleFilter
  );

  return (
    <div className="space-y-6">
      {/* Sub-navegación de Módulos Administrativos */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'REPORTES', label: '01. Reportes y Recaudación' },
              { id: 'TARIFAS', label: '02. Matriz de Tarifas' },
              { id: 'USUARIOS', label: '03. Usuarios y Roles (RBAC)' },
              { id: 'AUDITORIA', label: '04. Logs de Auditoría' },
              {
                id: 'SMS',
                label: `05. Alertas Automáticas SMS / Email (${tickets.filter((t) => t.estado === 'ALERTA_TIEMPO').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection === 'REPORTES' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!reportData}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Exportar Auditoría PDF
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!reportData}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 1: PANEL DE REPORTES Y MÉTRICAS FINANCIERAS */}
      {activeSection === 'REPORTES' && (
        <div className="space-y-6">
          {/* Barra de Filtro por Rango de Fechas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Consolidado Operativo y Recaudación por Período
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtre por rango de fechas para auditar ingresos liquidados, ocupación y rotación vehicular.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={fetchReports}
                disabled={reportLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Filter className="w-3.5 h-3.5" />
                {reportLoading ? 'Consultando...' : 'Aplicar Rango'}
              </button>
            </div>
          </div>

          {/* KPIs Consolidados */}
          {reportData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                    Recaudación Total Confirmada
                  </p>
                  <p className="text-2xl font-mono font-bold tabular-nums mt-1">
                    {formatCurrency(reportData.recaudacionTotal)}
                  </p>
                  <p className="text-xs text-emerald-100 mt-2">
                    Ticket promedio: <span className="font-mono font-semibold tabular-nums">{formatCurrency(reportData.ticketPromedio)}</span>
                  </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
                    Total Vehículos Atendidos
                  </p>
                  <p className="text-2xl font-mono font-bold tabular-nums mt-1">
                    {reportData.totalVehiculosAtendidos}
                  </p>
                  <p className="text-xs text-indigo-100 mt-2 font-mono tabular-nums">
                    Finalizados: {reportData.vehiculosFinalizadosPeriodo} · Activos: {reportData.vehiculosActivosAhora}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                    Porcentaje de Ocupación Actual
                  </p>
                  <p className="text-2xl font-mono font-bold tabular-nums mt-1">
                    {reportData.porcentajeOcupacionActual}%
                  </p>
                  <p className="text-xs text-amber-100 mt-2 font-mono tabular-nums">
                    {reportData.espaciosOcupados} ocupados / {reportData.totalEspacios} totales
                  </p>
                </div>

                <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-2xl p-5 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
                    Tiempo Promedio de Permanencia
                  </p>
                  <p className="text-2xl font-mono font-bold tabular-nums mt-1">
                    {reportData.estanciaPromedioMinutos} min
                  </p>
                  <p className="text-xs text-cyan-100 mt-2">
                    Cálculo exacto al minuto verificado
                  </p>
                </div>
              </div>

              {/* Tarjeta de Resumen Destacada (Recharts LineChart): Ocupación en Tiempo Real vs Capacidad Máxima (Últimas 24 Horas) */}
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white">
                        <Activity className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Resumen de Ocupación en Tiempo Real vs. Capacidad Máxima (Últimas 24 Horas)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Comparativa horaria continua mediante gráfico de líneas (Recharts) entre los vehículos estacionados en tiempo real, los cupos libres y el techo de aforo máximo ({reportData.totalEspacios} bahías).
                    </p>
                  </div>

                  {/* Mini-indicadores de la tarjeta de resumen */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                    <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-700 block font-sans font-semibold">
                        Ocupación Ahora
                      </span>
                      <span className="text-sm font-bold text-indigo-950">
                        {reportData.espaciosOcupados} / {reportData.totalEspacios} ({reportData.porcentajeOcupacionActual}%)
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] uppercase tracking-wider text-amber-800 block font-sans font-semibold">
                        Pico Últimas 24h
                      </span>
                      <span className="text-sm font-bold text-amber-950">
                        {Math.max(...(reportData.ocupacionUltimas24h?.map((d) => d.ocupados) || [reportData.espaciosOcupados]))} cupos
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-800 block font-sans font-semibold">
                        Margen Disponible
                      </span>
                      <span className="text-sm font-bold text-emerald-900">
                        {reportData.espaciosDisponibles} bahías libres
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Líneas Comparativo (Recharts LineChart) */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={reportData.ocupacionUltimas24h || reportData.ocupacionPorHora || []}
                      margin={{ top: 12, right: 20, left: -12, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="hora"
                        tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        domain={[0, Math.max(24, reportData.totalEspacios + 2)]}
                        tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '10px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        formatter={(value: unknown, name: unknown) => {
                          const num = Number(value) || 0;
                          if (name === 'Ocupación en Tiempo Real') {
                            const pct =
                              reportData.totalEspacios > 0
                                ? Math.round((num / reportData.totalEspacios) * 100)
                                : 0;
                            return [`${num} vehículos (${pct}% del aforo)`, String(name)];
                          }
                          if (name === 'Capacidad Máxima') {
                            return [`${num} espacios totales (100% límite)`, String(name)];
                          }
                          return [`${num} espacios libres`, String(name)];
                        }}
                        labelFormatter={(label) => `Corte Horario (24h): ${label}`}
                      />
                      <Legend
                        verticalAlign="top"
                        height={32}
                        wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                      />
                      <ReferenceLine
                        y={reportData.totalEspacios}
                        stroke="#EF4444"
                        strokeDasharray="6 4"
                        label={{
                          value: `Límite Aforo Máximo (${reportData.totalEspacios})`,
                          position: 'insideTopRight',
                          fill: '#DC2626',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                      <Line
                        type="monotone"
                        name="Capacidad Máxima"
                        dataKey="capacidadMaxima"
                        stroke="#EF4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 4, fill: '#EF4444' }}
                      />
                      <Line
                        type="monotone"
                        name="Ocupación en Tiempo Real"
                        dataKey="ocupados"
                        stroke="#4F46E5"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#4F46E5', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#4F46E5', stroke: '#E0E7FF', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        name="Cupos Disponibles"
                        dataKey="disponibles"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
                  <span>
                    Ventana de monitoreo: <strong>Últimas 24 horas continuas</strong> (actualización automática en cada ingreso/salida)
                  </span>
                  <span className="text-indigo-700 font-semibold">
                    Brecha actual frente a capacidad máxima: {reportData.totalEspacios - reportData.espaciosOcupados} cupos disponibles
                  </span>
                </div>
              </div>

              {/* Visualización de Datos Interactiva con Recharts: Ocupación Intradía y Recaudación Histórica */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Gráfico 1: Ocupación del Parqueadero a lo largo del día */}
                <div className="lg:col-span-6 bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Curva de Ocupación a lo Largo del Día (06:00 – 22:00)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Evolución horaria de cupos ocupados frente a la capacidad total ({reportData.totalEspacios} espacios)
                      </p>
                    </div>
                    <div className="text-xs font-mono text-indigo-700 font-semibold tabular-nums">
                      <span>Pico: {Math.max(...(reportData.ocupacionPorHora?.map((d) => d.ocupados) || [0]))} cupos</span>
                      <span className="mx-1.5">·</span>
                      <span>Capacidad: {reportData.totalEspacios}</span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={reportData.ocupacionPorHora || []}
                        margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="ocupacionFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="hora"
                          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={{ stroke: '#CBD5E1' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, reportData.totalEspacios]}
                          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: '#1E293B',
                            borderRadius: '8px',
                            color: '#F8FAFC',
                            fontSize: '12px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                          itemStyle={{ color: '#38BDF8' }}
                          formatter={(value: unknown, name: unknown) => {
                            const num = Number(value) || 0;
                            if (name === 'ocupados') {
                              return [`${num} espacios (${Math.round((num / reportData.totalEspacios) * 100)}%)`, 'Ocupados'];
                            }
                            return [`${num} espacios`, 'Disponibles'];
                          }}
                          labelFormatter={(label) => `Franja Horaria: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="ocupados"
                          stroke="#4F46E5"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#ocupacionFill)"
                          activeDot={{ r: 5, fill: '#4F46E5' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>Franja valle matutina: 06:00 – 08:00</span>
                    <span className="text-indigo-700 font-semibold">Hora pico operativa: 12:00 – 14:00</span>
                  </div>
                </div>

                {/* Gráfico 2: Recaudación Histórica Diaria */}
                <div className="lg:col-span-6 bg-white border-2 border-emerald-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Evolución de Recaudación Histórica Diaria (COP)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ingresos consolidados por día según estancias finalizadas y cobradas en caja
                      </p>
                    </div>
                    <div className="text-xs font-mono text-emerald-700 font-bold tabular-nums">
                      Total período: {formatCurrency(reportData.recaudacionTotal)}
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportData.recaudacionHistorica || []}
                        margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#0D9488" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="etiqueta"
                          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={{ stroke: '#CBD5E1' }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) => `$${Math.round(Number(val) / 1000)}k`}
                          tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#ECFDF5' }}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: '#1E293B',
                            borderRadius: '8px',
                            color: '#F8FAFC',
                            fontSize: '12px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                          itemStyle={{ color: '#34D399' }}
                          formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Recaudación']}
                          labelFormatter={(label, payload) => {
                            const first = payload?.[0]?.payload as { fecha?: string; vehiculos?: number } | undefined;
                            return first
                              ? `Fecha: ${first.fecha} (${first.vehiculos} salidas cobradas)`
                              : `Fecha: ${label}`;
                          }}
                        />
                        <Bar
                          dataKey="recaudacion"
                          fill="url(#revenueBarGrad)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={46}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>Período: {reportData.rangoInicio} a {reportData.rangoFin}</span>
                    <span className="text-emerald-700 font-semibold">Salidas liquidadas: {reportData.vehiculosFinalizadosPeriodo}</span>
                  </div>
                </div>
              </div>

              {/* Widget de Mapa de Calor (D3.js): Densidad de Ocupación y Rotación por Zonas */}
              {reportData.densidadZonas && reportData.densidadZonas.length > 0 && (
                <ZoneHeatmap data={reportData.densidadZonas} />
              )}

              {/* Desglose Gráfico y Tabular por Categoría de Vehículo y Medio de Pago */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-violet-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Distribución de Ingresos por Categoría Vehicular
                  </h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Automóvil', value: reportData.recaudacionPorTipo.AUTOMOVIL?.total || 1, color: '#6366F1' },
                            { name: 'Camioneta', value: reportData.recaudacionPorTipo.CAMIONETA?.total || 1, color: '#10B981' },
                            { name: 'Motocicleta', value: reportData.recaudacionPorTipo.MOTOCICLETA?.total || 1, color: '#F59E0B' },
                            { name: 'Eléctrico', value: reportData.recaudacionPorTipo.ELECTRICO?.total || 1, color: '#06B6D4' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {[
                            { color: '#6366F1' },
                            { color: '#10B981' },
                            { color: '#F59E0B' },
                            { color: '#06B6D4' },
                          ].map((c, idx) => (
                            <Cell key={idx} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: unknown) => formatCurrency(Number(val) || 0)}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            border: 'none',
                            color: '#F8FAFC',
                            fontSize: '12px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y divide-slate-200 text-xs">
                    {(['AUTOMOVIL', 'CAMIONETA', 'MOTOCICLETA', 'ELECTRICO'] as VehicleType[]).map((tipo) => {
                      const item = reportData.recaudacionPorTipo[tipo] || { cantidad: 0, total: 0 };
                      return (
                        <div key={tipo} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{tipo}</span>
                            <span className="text-slate-400 mx-2">·</span>
                            <span className="font-mono text-slate-600 tabular-nums">
                              {item.cantidad} salida(s) cobrada(s)
                            </span>
                          </div>
                          <span className="font-mono font-bold text-indigo-700 tabular-nums">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Recaudación por Medio de Pago
                  </h3>
                  <div className="divide-y divide-slate-200 text-xs">
                    {Object.entries(reportData.recaudacionPorMetodo).map(([metodo, valor]) => (
                      <div key={metodo} className="py-3 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{metodo.replace('_', ' ')}</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SECCIÓN 2: CONFIGURACIÓN DE MATRIZ DE TARIFAS */}
      {activeSection === 'TARIFAS' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Configuración de Tarifas por Tipo de Vehículo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Los cambios se aplican inmediatamente al algoritmo de liquidación de salidas, incluyendo cruces de medianoche y tarifa plena diaria.
            </p>
          </div>

          {rateFeedback && (
            <div
              className={`p-3.5 rounded-lg border flex items-center gap-2.5 text-xs ${
                rateFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {rateFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{rateFeedback.message}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-3">Categoría Vehicular</th>
                  <th className="py-3 px-3">Valor por Minuto (COP)</th>
                  <th className="py-3 px-3">Valor por Hora (COP)</th>
                  <th className="py-3 px-3">Tarifa Plena 24h (COP)</th>
                  <th className="py-3 px-3">Gracia (Minutos)</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {rates.map((r) => {
                  const current = editableRates[r.id] || r;
                  return (
                    <tr key={r.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900">{r.tipo_vehiculo}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={current.valor_por_minuto}
                          onChange={(e) =>
                            setEditableRates({
                              ...editableRates,
                              [r.id]: { ...current, valor_por_minuto: Number(e.target.value) },
                            })
                          }
                          className="w-28 px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={current.valor_por_hora}
                          onChange={(e) =>
                            setEditableRates({
                              ...editableRates,
                              [r.id]: { ...current, valor_por_hora: Number(e.target.value) },
                            })
                          }
                          className="w-32 px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={current.tarifa_plena_dia}
                          onChange={(e) =>
                            setEditableRates({
                              ...editableRates,
                              [r.id]: { ...current, tarifa_plena_dia: Number(e.target.value) },
                            })
                          }
                          className="w-32 px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={current.tiempo_gracia_minutos}
                          onChange={(e) =>
                            setEditableRates({
                              ...editableRates,
                              [r.id]: { ...current, tiempo_gracia_minutos: Number(e.target.value) },
                            })
                          }
                          className="w-20 px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-md text-slate-900 tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={savingRateId === r.id}
                          onClick={() => handleSaveRate(r.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingRateId === r.id ? 'Guardando...' : 'Guardar Tarifa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: GESTIÓN DE USUARIOS Y MATRIZ RBAC */}
      {activeSection === 'USUARIOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulario Crear Nuevo Usuario */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-900">Registrar Nuevo Usuario</h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Asigne rol de acceso (Cliente, Operador o Administrador) con hash seguro bcrypt.
            </p>

            {userFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs mb-4 ${
                  userFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {userFeedback.message}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserNombre}
                  onChange={(e) => setNewUserNombre(e.target.value)}
                  placeholder="Ej. Laura Martínez"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@parkcontrol.co"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña Inicial *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rol RBAC Asignado *</label>
                <select
                  value={newUserRol}
                  onChange={(e) => setNewUserRol(e.target.value as RoleName)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Operador">Operador (Control de entradas, salidas y mapa)</option>
                  <option value="Cliente">Cliente (Consulta de disponibilidad y mis tickets)</option>
                  <option value="Administrador">Administrador (Control total y auditoría)</option>
                </select>
              </div>
              {newUserRol === 'Cliente' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa Asociada del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newUserPlaca}
                    onChange={(e) => setNewUserPlaca(e.target.value.toUpperCase())}
                    placeholder="Ej. ABC123"
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Cuenta de Usuario
              </button>
            </form>
          </div>

          {/* Lista de Usuarios Registrados */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Directorio de Usuarios y Control RBAC</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifique roles en caliente o active/desactive el acceso al sistema
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {usersLoading ? 'Cargando...' : `${users.length} cuentas registradas`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Nombre · Correo</th>
                    <th className="py-2.5 px-3">Rol Asignado</th>
                    <th className="py-2.5 px-3">Placa Cliente</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Control de Acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{u.nombre}</div>
                        <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.rol}
                          onChange={(e) => handleUpdateUser(u.id, { rol: e.target.value as RoleName })}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Operador">Operador</option>
                          <option value="Cliente">Cliente</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 tabular-nums">
                        {u.placaCliente || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-medium ${u.activo ? 'text-emerald-700' : 'text-red-700'}`}>
                          {u.activo ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(u.id, { activo: !u.activo })}
                          className="text-xs font-medium text-slate-700 hover:text-slate-900 underline"
                        >
                          {u.activo ? 'Desactivar Cuenta' : 'Reactivar Cuenta'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: LOGS DE AUDITORÍA Y TRAZABILIDAD */}
      {activeSection === 'AUDITORIA' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Bitácora de Auditoría de Acciones Críticas (AuditLogs)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Trazabilidad inmutable de inicios de sesión, entradas, cobros, cambios de tarifa y bloqueos RBAC.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="TODOS">Todos los Módulos</option>
                <option value="AUTH">Autenticación (AUTH)</option>
                <option value="ENTRADAS">Entradas Vehiculares</option>
                <option value="SALIDAS">Salidas y Cobros</option>
                <option value="ESPACIOS">Gestión de Espacios</option>
                <option value="TARIFAS">Configuración Tarifas</option>
                <option value="USUARIOS">Usuarios y Roles</option>
                <option value="NOTIFICACIONES_SMS">Notificaciones SMS</option>
                <option value="SISTEMA">Seguridad / RBAC</option>
              </select>

              <button
                type="button"
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Usuario · Rol</th>
                  <th className="py-2.5 px-3">Módulo</th>
                  <th className="py-2.5 px-3">Acción Ejecutada</th>
                  <th className="py-2.5 px-3">Detalle de Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredAudit.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('es-CO')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{item.usuario_nombre}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-600">{item.usuario_rol}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{item.modulo}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{item.accion}</td>
                    <td className="py-2.5 px-3 text-slate-700">{item.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN 5: SISTEMA DE NOTIFICACIONES SMS AUTOMÁTICAS Y ESTADO DE TICKETS */}
      {activeSection === 'SMS' && (
        <SmsNotificationCenter
          smsNotifications={smsNotifications}
          smsConfig={smsConfig}
          tickets={tickets}
          logs={logs}
          userRole="Administrador"
          onRefresh={onRefreshGlobal}
        />
      )}
    </div>
  );
};
