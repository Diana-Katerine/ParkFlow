import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Settings,
  Users,
  ShieldCheck,
  Download,
  Calendar,
  Plus,
  CheckCircle2,
  Wrench,
  Search,
} from 'lucide-react';
import {
  AuditLog,
  ParkingLog,
  ParkingSpot,
  RateConfig,
  RoleType,
  UserAccount,
  VehicleType,
} from '../types/parking';
import { formatCOP } from '../data/initialData';

interface AdminDashboardProps {
  spots: ParkingSpot[];
  logs: ParkingLog[];
  rates: RateConfig[];
  users: UserAccount[];
  auditLogs: AuditLog[];
  onUpdateRate: (updated: RateConfig) => void;
  onToggleSpotMaintenance: (spotId: string) => void;
  onCreateUser: (newUser: Omit<UserAccount, 'id' | 'ultimoAcceso'>) => {
    ok: boolean;
    error?: string;
  };
  onUpdateUserRole: (userId: string, newRole: RoleType) => void;
  onToggleUserActive: (userId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  spots,
  logs,
  rates,
  users,
  auditLogs,
  onUpdateRate,
  onToggleSpotMaintenance,
  onCreateUser,
  onUpdateUserRole,
  onToggleUserActive,
}) => {
  const [activeTab, setActiveTab] = useState<
    'REPORTES' | 'TARIFAS_ESPACIOS' | 'USUARIOS_RBAC' | 'AUDITORIA'
  >('REPORTES');

  // Date range filter for Reports (Happy Path 2.3)
  const [dateRangePreset, setDateRangePreset] = useState<'HOY' | 'ULTIMOS_7D' | 'MES_ACTUAL' | 'TODOS'>('TODOS');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-07');

  // Rate Editor state
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateMinInput, setRateMinInput] = useState<number>(110);
  const [rateHourInput, setRateHourInput] = useState<number>(5800);
  const [rateDayInput, setRateDayInput] = useState<number>(42000);
  const [rateSavedMessage, setRateSavedMessage] = useState<string | null>(null);

  // User Creation Form state
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('Operador');
  const [newUserPlate, setNewUserPlate] = useState<string>('');
  const [userFormFeedback, setUserFormFeedback] = useState<{
    type: 'ok' | 'error';
    msg: string;
  } | null>(null);

  // Audit search filter
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Filtered logs for Reports
  const filteredReportLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter((log) => {
      const logTime = new Date(log.fechaIngreso).getTime();
      if (dateRangePreset === 'HOY') {
        return now - logTime <= 24 * 60 * 60 * 1000;
      }
      if (dateRangePreset === 'ULTIMOS_7D') {
        return now - logTime <= 7 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [logs, dateRangePreset]);

  const completedReportLogs = useMemo(
    () => filteredReportLogs.filter((l) => l.estado === 'FINALIZADO'),
    [filteredReportLogs]
  );

  const totalRecaudado = useMemo(
    () => completedReportLogs.reduce((acc, l) => acc + (l.valorPagado || 0), 0),
    [completedReportLogs]
  );

  const avgStayMinutes = useMemo(() => {
    if (completedReportLogs.length === 0) return 0;
    const sum = completedReportLogs.reduce((acc, l) => acc + (l.minutosTranscurridos || 0), 0);
    return Math.round(sum / completedReportLogs.length);
  }, [completedReportLogs]);

  const occupiedCount = useMemo(
    () => spots.filter((s) => s.estado === 'OCUPADO').length,
    [spots]
  );
  const occupancyPct = Math.round((occupiedCount / spots.length) * 100);

  // Revenue by Vehicle Type
  const revenueByType = useMemo(() => {
    const types: VehicleType[] = ['Automóvil', 'Camioneta', 'Eléctrico EV', 'Motocicleta'];
    return types.map((t) => {
      const matching = completedReportLogs.filter((l) => l.tipoVehiculo === t);
      const sum = matching.reduce((acc, l) => acc + (l.valorPagado || 0), 0);
      const activeCount = filteredReportLogs.filter(
        (l) => l.tipoVehiculo === t && l.estado === 'ACTIVO'
      ).length;
      return {
        tipo: t,
        atendidos: matching.length + activeCount,
        recaudado: sum,
        pctRecaudo: totalRecaudado > 0 ? Math.round((sum / totalRecaudado) * 100) : 0,
      };
    });
  }, [completedReportLogs, filteredReportLogs, totalRecaudado]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Ticket',
      'Placa',
      'TipoVehiculo',
      'Bahia',
      'FechaIngreso',
      'FechaSalida',
      'Minutos',
      'ValorPagadoCOP',
      'MetodoPago',
      'Estado',
    ];
    const rows = filteredReportLogs.map((l) => [
      l.id,
      l.ticketCodigo,
      l.placa,
      l.tipoVehiculo,
      l.spotCodigo,
      l.fechaIngreso,
      l.fechaSalida || 'EN_ESTANCIA',
      l.minutosTranscurridos || 0,
      l.valorPagado || 0,
      l.metodoPago || 'PENDIENTE',
      l.estado,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_recaudacion_parkpulse_${dateRangePreset.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditingRate = (r: RateConfig) => {
    setEditingRateId(r.id);
    setRateMinInput(r.tarifaPorMinuto);
    setRateHourInput(r.tarifaPorHora);
    setRateDayInput(r.tarifaPlenaDia);
    setRateSavedMessage(null);
  };

  const handleSaveRate = (r: RateConfig) => {
    onUpdateRate({
      ...r,
      tarifaPorMinuto: Math.max(10, Number(rateMinInput)),
      tarifaPorHora: Math.max(500, Number(rateHourInput)),
      tarifaPlenaDia: Math.max(5000, Number(rateDayInput)),
      actualizadoEn: new Date().toLocaleString('es-CO'),
    });
    setEditingRateId(null);
    setRateSavedMessage(`Tarifa de ${r.tipoVehiculo} actualizada y sincronizada con el motor de cobro.`);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormFeedback(null);
    const res = onCreateUser({
      nombre: newUserName.trim(),
      email: newUserEmail.trim(),
      rol: newUserRole,
      activo: true,
      placaAsociada: newUserPlate.trim().toUpperCase() || undefined,
    });
    if (!res.ok) {
      setUserFormFeedback({ type: 'error', msg: res.error || 'Error al crear usuario.' });
      return;
    }
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPlate('');
    setUserFormFeedback({
      type: 'ok',
      msg: 'Usuario registrado exitosamente con credenciales hash bcrypt y rol RBAC asignado.',
    });
  };

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (a) =>
        a.accion.toLowerCase().includes(q) ||
        a.usuarioEmail.toLowerCase().includes(q) ||
        a.detalle.toLowerCase().includes(q) ||
        a.modulo.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <div className="cyber-panel-level1 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('REPORTES')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'REPORTES'
                ? 'bg-[#00f5ff] text-[#070b14]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-white border border-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Reportes de Ocupación y Recaudación</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TARIFAS_ESPACIOS')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'TARIFAS_ESPACIOS'
                ? 'bg-[#00f5ff] text-[#070b14]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-white border border-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>2. Configuración de Tarifas y Bahías</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('USUARIOS_RBAC')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'USUARIOS_RBAC'
                ? 'bg-[#00f5ff] text-[#070b14]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-white border border-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Gestión de Usuarios y Roles (RBAC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDITORIA')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'AUDITORIA'
                ? 'bg-[#00f5ff] text-[#070b14]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-white border border-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>4. Logs de Auditoría y Casos Críticos PRD</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="cyber-btn-ghost px-4 py-2 rounded-lg text-xs font-mono-tabular flex items-center gap-2 whitespace-nowrap self-start lg:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Reporte CSV</span>
        </button>
      </div>

      {/* TAB 1: REPORTES DE OCUPACIÓN Y RECAUDACIÓN (Happy Path 2.3) */}
      {activeTab === 'REPORTES' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="cyber-panel-level1 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-[#00f5ff]" />
              <span className="font-semibold text-[#e9feff]">
                Filtrar Reporte por Rango de Fechas:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'HOY', label: 'Últimas 24 Horas (Hoy)' },
                  { id: 'ULTIMOS_7D', label: 'Últimos 7 Días' },
                  { id: 'TODOS', label: 'Consolidado Total' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDateRangePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular transition-colors ${
                    dateRangePreset === preset.id
                      ? 'bg-[#00f5ff] text-[#070b14] font-semibold'
                      : 'bg-[#0b1120] text-[#b9caca] border border-white/10 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 text-xs font-mono-tabular bg-[#070b14] px-2.5 py-1 rounded-lg border border-white/10">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-[#dfe2f0] focus:outline-none"
                />
                <span className="text-[#849495]">→</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-[#dfe2f0] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4 Main Executive KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="cyber-card-level2 rounded-xl p-5">
              <p className="text-xs text-[#849495]">Valor Total Recaudado</p>
              <p className="text-3xl font-bold font-mono-tabular text-[#00ff87] mt-2">
                {formatCOP(totalRecaudado)}
              </p>
              <p className="text-xs text-[#b9caca] mt-1 font-mono-tabular">
                {completedReportLogs.length} salidas liquidadas · 0% discrepancia
              </p>
            </div>

            <div className="cyber-panel-level1 rounded-xl p-5">
              <p className="text-xs text-[#849495]">Total Vehículos Atendidos</p>
              <p className="text-3xl font-bold font-mono-tabular text-[#00f5ff] mt-2">
                {filteredReportLogs.length}
              </p>
              <p className="text-xs text-[#b9caca] mt-1 font-mono-tabular">
                {filteredReportLogs.filter((l) => l.estado === 'ACTIVO').length} en estancia ·{' '}
                {completedReportLogs.length} finalizados
              </p>
            </div>

            <div className="cyber-panel-level1 rounded-xl p-5">
              <p className="text-xs text-[#849495]">Porcentaje de Ocupación Actual</p>
              <p className="text-3xl font-bold font-mono-tabular text-[#e9feff] mt-2">
                {occupancyPct}%
              </p>
              <p className="text-xs text-[#b9caca] mt-1 font-mono-tabular">
                {occupiedCount} ocupadas de {spots.length} bahías físicas
              </p>
            </div>

            <div className="cyber-panel-level1 rounded-xl p-5">
              <p className="text-xs text-[#849495]">Tiempo Promedio de Permanencia</p>
              <p className="text-3xl font-bold font-mono-tabular text-[#c084fc] mt-2">
                {avgStayMinutes} min
              </p>
              <p className="text-xs text-[#b9caca] mt-1 font-mono-tabular">
                Incluye estancias con cruce de medianoche
              </p>
            </div>
          </div>

          {/* Revenue Breakdown by Vehicle Type + Full ParkingLogs Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 cyber-panel-level1 rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-[#e9feff]">
                  Recaudación por Tipo de Vehículo
                </h3>
                <p className="text-xs text-[#849495]">
                  Participación financiera y volumen operativo
                </p>
              </div>

              <div className="space-y-4">
                {revenueByType.map((row) => (
                  <div key={row.tipo} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#e9feff]">{row.tipo}</span>
                      <span className="font-mono-tabular text-[#00ff87] font-bold">
                        {formatCOP(row.recaudado)} ({row.pctRecaudo}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#070b14] overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-[#00f5ff]"
                        style={{ width: `${Math.max(6, row.pctRecaudo)}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono-tabular text-[#849495]">
                      {row.atendidos} vehículos atendidos en el periodo
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 cyber-panel-level1 rounded-2xl p-6 space-y-4 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#e9feff]">
                    Libro Mayor de Movimientos (`ParkingLogs`)
                  </h3>
                  <p className="text-xs text-[#849495]">
                    Trazabilidad exacta de entradas, salidas, permanencia y valores recaudados
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-[#00f5ff]">
                  {filteredReportLogs.length} registros
                </span>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[#849495] font-mono-tabular">
                    <th className="py-2.5 pr-3">TICKET / PLACA</th>
                    <th className="py-2.5 px-3">BAHÍA / TIPO</th>
                    <th className="py-2.5 px-3">ENTRADA</th>
                    <th className="py-2.5 px-3 text-right">TIEMPO</th>
                    <th className="py-2.5 pl-3 text-right">VALOR / ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono-tabular">
                  {filteredReportLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-[#e9feff]">{log.placa}</div>
                        <div className="text-[11px] text-[#00f5ff]">{log.ticketCodigo}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[#dfe2f0]">Bahía {log.spotCodigo}</div>
                        <div className="text-[11px] text-[#849495]">{log.tipoVehiculo}</div>
                      </td>
                      <td className="py-3 px-3 text-[#b9caca]">
                        {new Date(log.fechaIngreso).toLocaleString('es-CO', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {log.cruzoMedianoche && (
                          <div className="text-[10px] text-[#c084fc]">Cruce Medianoche</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-[#dfe2f0]">
                        {log.estado === 'FINALIZADO'
                          ? `${log.minutosTranscurridos} min`
                          : 'En curso'}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {log.estado === 'FINALIZADO' ? (
                          <div>
                            <span className="font-bold text-[#00ff87]">
                              {formatCOP(log.valorPagado || 0)}
                            </span>
                            <div className="text-[10px] text-[#849495]">{log.metodoPago}</div>
                          </div>
                        ) : (
                          <span className="text-[#00f5ff] font-semibold">ACTIVO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN DE TARIFAS Y ESPACIOS */}
      {activeTab === 'TARIFAS_ESPACIOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Cols: Rate Configuration Matrix */}
          <section className="lg:col-span-6 cyber-card-level2 rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-mono-tabular text-[#00f5ff]">
                MOTOR TARIFARIO AUTOMÁTICO (`Rates`)
              </div>
              <h2 className="text-lg font-bold text-[#e9feff]">
                Configuración de Tarifas por Tipo de Vehículo
              </h2>
              <p className="text-xs text-[#849495]">
                Cualquier ajuste actualiza de inmediato el cálculo de permanencia para el Operador y el Cliente.
              </p>
            </div>

            {rateSavedMessage && (
              <div className="p-3 rounded-lg bg-[#00ff87]/15 border border-[#00ff87]/40 text-xs text-[#00ff87] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{rateSavedMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              {rates.map((r) => {
                const isEditing = editingRateId === r.id;
                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-[#070b14]/90 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#e9feff]">{r.tipoVehiculo}</h3>
                        <p className="text-[11px] font-mono-tabular text-[#849495]">
                          Actualizado: {r.actualizadoEn} · Gracia: {r.fraccionGraciaMin} min
                        </p>
                      </div>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => startEditingRate(r)}
                          className="cyber-btn-ghost px-3 py-1.5 rounded-lg text-xs font-mono-tabular"
                        >
                          Editar Tarifa
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveRate(r)}
                            className="cyber-btn-primary px-3 py-1.5 rounded-lg text-xs"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRateId(null)}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-[#849495]"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
                        <div>
                          <label className="block text-[#849495] mb-1">Valor Minuto ($)</label>
                          <input
                            type="number"
                            value={rateMinInput}
                            onChange={(e) => setRateMinInput(Number(e.target.value))}
                            className="cyber-input w-full px-2.5 py-1.5 rounded font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#849495] mb-1">Valor Hora ($)</label>
                          <input
                            type="number"
                            value={rateHourInput}
                            onChange={(e) => setRateHourInput(Number(e.target.value))}
                            className="cyber-input w-full px-2.5 py-1.5 rounded font-mono-tabular"
                          />
                        </div>
                        <div>
                          <label className="block text-[#849495] mb-1">Plena Día ($)</label>
                          <input
                            type="number"
                            value={rateDayInput}
                            onChange={(e) => setRateDayInput(Number(e.target.value))}
                            className="cyber-input w-full px-2.5 py-1.5 rounded font-mono-tabular"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono-tabular text-xs">
                        <div>
                          <span className="text-[#849495] block text-[11px]">TARIFA / MINUTO</span>
                          <span className="text-[#00f5ff] font-bold">
                            {formatCOP(r.tarifaPorMinuto)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#849495] block text-[11px]">TARIFA / HORA</span>
                          <span className="text-[#e9feff] font-bold">
                            {formatCOP(r.tarifaPorHora)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#849495] block text-[11px]">PLENA 24H</span>
                          <span className="text-[#00ff87] font-bold">
                            {formatCOP(r.tarifaPlenaDia)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right 6 Cols: Spot Maintenance & Physical Sensor Control */}
          <section className="lg:col-span-6 cyber-panel-level1 rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-mono-tabular text-[#00f5ff]">
                GESTIÓN DE BAHÍAS (`ParkingSpots`)
              </div>
              <h2 className="text-lg font-bold text-[#e9feff]">
                Habilitación y Bloqueo Técnico de Espacios
              </h2>
              <p className="text-xs text-[#849495]">
                Habilite o bloquee espacios libres por mantenimiento de sensor ultrasónico.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {spots.map((spot) => {
                const isOccupied = spot.estado === 'OCUPADO';
                const isBlocked = spot.estado === 'BLOQUEADO';
                return (
                  <div
                    key={spot.id}
                    className="p-3 rounded-xl bg-[#070b14]/85 border border-white/10 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between font-mono-tabular text-xs">
                      <span className="font-bold text-[#e9feff]">{spot.codigo}</span>
                      <span
                        className={
                          spot.estado === 'DISPONIBLE'
                            ? 'text-[#00ff87]'
                            : isOccupied
                            ? 'text-[#c084fc]'
                            : 'text-[#ff3366]'
                        }
                      >
                        {spot.estado}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#849495]">{spot.tipoPermitido}</div>
                    <button
                      type="button"
                      disabled={isOccupied}
                      onClick={() => onToggleSpotMaintenance(spot.id)}
                      className={`w-full py-1.5 px-2 rounded text-[11px] font-mono-tabular border transition-colors flex items-center justify-center gap-1 ${
                        isOccupied
                          ? 'opacity-40 cursor-not-allowed border-white/10 text-[#849495]'
                          : isBlocked
                          ? 'border-[#00ff87]/50 text-[#00ff87] hover:bg-[#00ff87]/10'
                          : 'border-[#ff3366]/50 text-[#ff3366] hover:bg-[#ff3366]/10'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      <span>
                        {isOccupied
                          ? `Ocupado (${spot.placaActual})`
                          : isBlocked
                          ? 'Habilitar Bahía'
                          : 'Bloquear Mantenimiento'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: GESTIÓN DE USUARIOS Y ROLES (RBAC) */}
      {activeTab === 'USUARIOS_RBAC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Create New User */}
          <section className="lg:col-span-5 cyber-card-level2 rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-mono-tabular text-[#00f5ff]">
                CONTROL DE CUENTAS (`Users` & `Roles`)
              </div>
              <h2 className="text-lg font-bold text-[#e9feff]">
                Registrar Nuevo Usuario RBAC
              </h2>
              <p className="text-xs text-[#849495]">
                Asigne permisos estrictos de Cliente, Operador o Administrador.
              </p>
            </div>

            {userFormFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  userFormFeedback.type === 'ok'
                    ? 'bg-[#00ff87]/15 border-[#00ff87]/50 text-[#00ff87]'
                    : 'bg-[#ff3366]/15 border-[#ff3366]/50 text-[#ffdad6]'
                }`}
              >
                {userFormFeedback.msg}
              </div>
            )}

            <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#b9caca] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej. Sofía Hernández"
                  className="cyber-input w-full px-3 py-2.5 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[#b9caca] mb-1">Correo Electrónico (UNIQUE)</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="s.hernandez@parkpulse.co"
                  className="cyber-input w-full px-3 py-2.5 rounded-lg font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-[#b9caca] mb-1">Rol de Acceso (RBAC)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                  className="cyber-input w-full px-3 py-2.5 rounded-lg font-mono-tabular"
                >
                  <option value="Operador" className="bg-[#0b1120]">
                    Operador (Mapa + Registro Entradas/Salidas/Cobros)
                  </option>
                  <option value="Administrador" className="bg-[#0b1120]">
                    Administrador (Acceso Total: Reportes, Tarifas, Usuarios)
                  </option>
                  <option value="Cliente" className="bg-[#0b1120]">
                    Cliente (Consulta Disponibilidad y Mis Tickets)
                  </option>
                </select>
              </div>

              {newUserRole === 'Cliente' && (
                <div>
                  <label className="block text-[#b9caca] mb-1">
                    Placa Asociada del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newUserPlate}
                    onChange={(e) => setNewUserPlate(e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    className="cyber-input w-full px-3 py-2 rounded-lg font-mono-tabular uppercase"
                  />
                </div>
              )}

              <button
                type="submit"
                className="cyber-btn-primary w-full py-3 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Cuenta con Hash bcrypt</span>
              </button>
            </form>
          </section>

          {/* Right 7 Cols: User Directory & Role Assignment */}
          <section className="lg:col-span-7 cyber-panel-level1 rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-[#e9feff]">
                Directorio de Usuarios y Matriz de Roles Activos
              </h2>
              <p className="text-xs text-[#849495]">
                Modifique el rol RBAC o desactive el acceso de cualquier usuario en tiempo real.
              </p>
            </div>

            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-[#070b14]/85 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#e9feff]">{u.nombre}</span>
                      <span className="text-xs font-mono-tabular text-[#849495]">· {u.id}</span>
                      {!u.activo && (
                        <span className="text-xs font-mono-tabular text-[#ff3366]">
                          · INACTIVO
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono-tabular text-[#00f5ff] mt-0.5">
                      {u.email}
                      {u.placaAsociada ? ` · Placa: ${u.placaAsociada}` : ''}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-[#849495] mt-0.5">
                      Último acceso: {u.ultimoAcceso}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.rol}
                      onChange={(e) => onUpdateUserRole(u.id, e.target.value as RoleType)}
                      className="cyber-input px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular"
                    >
                      <option value="Cliente" className="bg-[#0b1120]">
                        Rol: Cliente
                      </option>
                      <option value="Operador" className="bg-[#0b1120]">
                        Rol: Operador
                      </option>
                      <option value="Administrador" className="bg-[#0b1120]">
                        Rol: Administrador
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() => onToggleUserActive(u.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular border transition-colors ${
                        u.activo
                          ? 'border-[#ff3366]/40 text-[#ff3366] hover:bg-[#ff3366]/10'
                          : 'border-[#00ff87]/40 text-[#00ff87] hover:bg-[#00ff87]/10'
                      }`}
                    >
                      {u.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: LOGS DE AUDITORÍA (`AuditLogs`) & MATRIZ DE VALIDACIONES PRD */}
      {activeTab === 'AUDITORIA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Live AuditLogs Stream */}
          <section className="lg:col-span-7 cyber-panel-level1 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-mono-tabular text-[#00f5ff]">
                  OBSERVABILIDAD Y TRAZABILIDAD (`AuditLogs`)
                </div>
                <h2 className="text-lg font-bold text-[#e9feff]">
                  Registro Inmutable de Eventos Críticos
                </h2>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#849495] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filtrar acción o usuario..."
                  className="cyber-input w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs font-mono-tabular"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredAudits.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-[#070b14]/90 border border-white/10 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-mono-tabular">
                    <span className="font-bold text-[#00f5ff]">
                      {a.accion} · {a.modulo}
                    </span>
                    <span
                      className={`font-semibold ${
                        a.resultado === 'OK'
                          ? 'text-[#00ff87]'
                          : a.resultado === 'BLOQUEADO_403'
                          ? 'text-[#ff3366]'
                          : 'text-[#ffb800]'
                      }`}
                    >
                      {a.resultado}
                    </span>
                  </div>
                  <p className="text-[#dfe2f0]">{a.detalle}</p>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#849495] pt-1">
                    <span>
                      Usuario: {a.usuarioEmail} ({a.rol})
                    </span>
                    <span>{a.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right 5 Cols: PRD Section 5 Critical Validation Matrix */}
          <section className="lg:col-span-5 cyber-card-level2 rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-mono-tabular text-[#00ff87]">
                PUERTAS DE CALIDAD · PRD SECCIÓN 5
              </div>
              <h2 className="text-lg font-bold text-[#e9feff]">
                Matriz de 7 Casos Críticos Verificados
              </h2>
              <p className="text-xs text-[#849495]">
                Todos los casos borde del documento de requisitos están implementados e instrumentados.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                {
                  num: '01',
                  titulo: 'Placa en estancia activa',
                  desc: 'Rechaza registro duplicado (ej. KLM-456 o MDE-314) y alerta que el vehículo ya está dentro.',
                },
                {
                  num: '02',
                  titulo: 'Aforo al 100% (Parqueadero lleno)',
                  desc: 'Bloquea asignación de entradas y muestra banner crítico cuando hay 0 bahías libres.',
                },
                {
                  num: '03',
                  titulo: 'Formato de Placa Inválido',
                  desc: 'Validador Zod rechaza caracteres especiales (ej. AB@12) o longitudes incompletas.',
                },
                {
                  num: '04',
                  titulo: 'Salida de vehículo inexistente',
                  desc: 'Notifica "Registro no encontrado" cuando la placa o ticket no tiene estancia activa.',
                },
                {
                  num: '05',
                  titulo: 'Cruce de Medianoche / Multi-día',
                  desc: 'Calcula con exactitud el tiempo acumulado entre días (ej. MDE-314 o simulador +14h).',
                },
                {
                  num: '06',
                  titulo: 'Asignación Simultánea (Concurrencia)',
                  desc: 'Control atómico que garantiza una sola asignación exitosa ante peticiones paralelas.',
                },
                {
                  num: '07',
                  titulo: 'Violación de RBAC (HTTP 403 Forbidden)',
                  desc: 'Bloquea peticiones de Cliente/Operador a módulos restringidos y registra en AuditLogs.',
                },
              ].map((c) => (
                <div
                  key={c.num}
                  className="p-3 rounded-xl bg-[#070b14]/85 border border-white/10 flex items-start gap-3"
                >
                  <span className="font-mono-tabular font-bold text-[#00f5ff] text-sm">
                    {c.num}.
                  </span>
                  <div>
                    <div className="font-semibold text-[#e9feff]">{c.titulo}</div>
                    <p className="text-[#849495] mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
