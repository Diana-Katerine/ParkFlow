import React, { useState, useEffect } from 'react';
import {
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  MessageSquare,
  Sliders,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type {
  SmsNotification,
  SmsAlertConfig,
  Ticket,
  ParkingLog,
  AlertChannel,
} from '../types';

interface SmsNotificationCenterProps {
  smsNotifications: SmsNotification[];
  smsConfig: SmsAlertConfig;
  tickets: Ticket[];
  logs: ParkingLog[];
  userRole: 'Administrador' | 'Operador' | 'Cliente';
  onRefresh: () => Promise<void>;
}

const DEFAULT_TEMPLATE =
  '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.';

const DEFAULT_SUBJECT = 'Aviso de Sobreestancia — Vehículo {placa} ({ticket})';

export const SmsNotificationCenter: React.FC<SmsNotificationCenterProps> = ({
  smsNotifications,
  smsConfig,
  tickets,
  logs,
  userRole,
  onRefresh,
}) => {
  // Estados de Umbrales de Tiempo
  const [umbralPreventivo, setUmbralPreventivo] = useState<number>(
    smsConfig?.umbralPreventivoMinutos ?? 90
  );
  const [umbralAlerta, setUmbralAlerta] = useState<number>(smsConfig?.umbralMinutos || 120);
  const [umbralCritico, setUmbralCritico] = useState<number>(
    smsConfig?.umbralCriticoMinutos ?? 240
  );
  const [intervaloRecordatorio, setIntervaloRecordatorio] = useState<number>(
    smsConfig?.intervaloRecordatorioMinutos ?? 60
  );

  // Estados de Canales (SMS / Email / Ambos) y Remitente
  const [autoEnvio, setAutoEnvio] = useState<boolean>(smsConfig?.autoEnvioActivo ?? true);
  const [canalPreferido, setCanalPreferido] = useState<AlertChannel>(
    smsConfig?.canalPreferido || 'AMBOS'
  );
  const [remitenteNombre, setRemitenteNombre] = useState<string>(
    smsConfig?.remitenteNombre || 'ParkFlow Alertas'
  );
  const [emailRemitente, setEmailRemitente] = useState<string>(
    smsConfig?.emailRemitente || 'alertas@parkflow.co'
  );
  const [asuntoEmail, setAsuntoEmail] = useState<string>(
    smsConfig?.asuntoEmail || DEFAULT_SUBJECT
  );
  const [plantillaMensaje, setPlantillaMensaje] = useState<string>(
    smsConfig?.plantillaMensaje || DEFAULT_TEMPLATE
  );

  const [savingConfig, setSavingConfig] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ALERTA_TIEMPO' | 'PAGADO'>('TODOS');
  const [channelFilter, setChannelFilter] = useState<'TODOS' | 'SMS' | 'EMAIL' | 'AMBOS'>('TODOS');

  useEffect(() => {
    if (smsConfig) {
      setUmbralPreventivo(smsConfig.umbralPreventivoMinutos ?? 90);
      setUmbralAlerta(smsConfig.umbralMinutos || 120);
      setUmbralCritico(smsConfig.umbralCriticoMinutos ?? 240);
      setIntervaloRecordatorio(smsConfig.intervaloRecordatorioMinutos ?? 60);
      setAutoEnvio(smsConfig.autoEnvioActivo ?? true);
      setCanalPreferido(smsConfig.canalPreferido || 'AMBOS');
      setRemitenteNombre(smsConfig.remitenteNombre || 'ParkFlow Alertas');
      setEmailRemitente(smsConfig.emailRemitente || 'alertas@parkflow.co');
      setAsuntoEmail(smsConfig.asuntoEmail || DEFAULT_SUBJECT);
      setPlantillaMensaje(smsConfig.plantillaMensaje || DEFAULT_TEMPLATE);
    }
  }, [smsConfig]);

  const insertTokenInTemplate = (token: string) => {
    setPlantillaMensaje((prev) => `${prev}${prev.endsWith(' ') ? '' : ' '}${token}`);
  };

  const renderLivePreview = (rawText: string) => {
    return rawText
      .replace(/\{remitente\}/g, remitenteNombre || 'ParkFlow Alertas')
      .replace(/\{cliente\}/g, 'Mateo Restrepo')
      .replace(/\{placa\}/g, 'ABC123')
      .replace(/\{ticket\}/g, 'TCK-2026-1001')
      .replace(/\{espacio\}/g, 'A-01')
      .replace(/\{minutos\}/g, String(umbralAlerta + 15))
      .replace(/\{umbral\}/g, String(umbralAlerta))
      .replace(/\{saldo\}/g, '14.500');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/sms-notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          umbralMinutos: Number(umbralAlerta),
          umbralPreventivoMinutos: Number(umbralPreventivo),
          umbralCriticoMinutos: Number(umbralCritico),
          intervaloRecordatorioMinutos: Number(intervaloRecordatorio),
          autoEnvioActivo: autoEnvio,
          canalPreferido,
          remitenteNombre,
          emailRemitente,
          asuntoEmail,
          plantillaMensaje,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await onRefresh();
        const nuevosCount = data.nuevosEnviados?.length || 0;
        setFeedback({
          type: 'success',
          message: `Configuración guardada (${canalPreferido} · Umbral sobreestancia: ${umbralAlerta} min). Se evaluaron los tickets activos con la plantilla personalizada y se despacharon ${nuevosCount} nuevo(s) aviso(s).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'No se pudo guardar la configuración de alertas.',
        });
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDispatchNow = async (ticketId?: string, canalOverride?: AlertChannel) => {
    setDispatching(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/sms-notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(ticketId ? { ticketId } : {}),
          ...(canalOverride ? { canalOverride } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await onRefresh();
        const count = data.dispatched?.length || 0;
        setFeedback({
          type: count > 0 ? 'success' : 'info',
          message:
            count > 0
              ? `Se despacharon ${count} notificación(es) vía ${canalOverride || canalPreferido} aplicando la plantilla personalizada y actualizando el ticket a ALERTA_TIEMPO.`
              : 'Todos los vehículos que superan el umbral actual ya recibieron su notificación automática.',
        });
      }
    } finally {
      setDispatching(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const activeOverdueTickets = tickets.filter((t) => t.estado === 'ALERTA_TIEMPO');
  const activeRegularTickets = tickets.filter((t) => t.estado === 'ACTIVO');

  const filteredSms = smsNotifications.filter((sms) => {
    if (filterStatus !== 'TODOS' && sms.estado_ticket_resultante !== filterStatus) return false;
    if (channelFilter !== 'TODOS' && (sms.canal_envio || 'SMS') !== channelFilter) return false;
    return true;
  });

  const availableTokens = [
    { token: '{cliente}', label: 'Nombre Cliente' },
    { token: '{placa}', label: 'Placa Vehículo' },
    { token: '{ticket}', label: 'Número Ticket' },
    { token: '{espacio}', label: 'Código Bahía' },
    { token: '{minutos}', label: 'Minutos Actuales' },
    { token: '{umbral}', label: 'Umbral Configurado' },
    { token: '{saldo}', label: 'Saldo en COP' },
    { token: '{remitente}', label: 'Remitente' },
  ];

  return (
    <div className="space-y-6">
      {/* SECCIÓN DE CONFIGURACIÓN AVANZADA DE ALERTAS AUTOMÁTICAS (SMS / EMAIL), UMBRALES Y PLANTILLA */}
      {userRole !== 'Cliente' && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-900" />
                <h2 className="text-base font-semibold text-slate-900">
                  Configuración de Alertas Automáticas (SMS y Email) por Sobreestancia
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalice los canales de despacho, los umbrales escalonados de tiempo sin pago y el mensaje dinámico enviado a los clientes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUmbralPreventivo(90);
                  setUmbralAlerta(120);
                  setUmbralCritico(240);
                  setIntervaloRecordatorio(60);
                  setCanalPreferido('AMBOS');
                  setPlantillaMensaje(DEFAULT_TEMPLATE);
                  setAsuntoEmail(DEFAULT_SUBJECT);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer Valores Base
              </button>
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                {savingConfig ? 'Guardando configuración...' : 'Guardar Configuración y Evaluar'}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Bloque 1: Canales de Notificación (SMS / Email / Ambos) + Umbrales de Sobreestancia */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda (5 cols): Selección de Canal y Escalado de Umbrales */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  1. Canal de Despacho de Alertas Automáticas *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'SMS', label: 'Solo SMS', icon: MessageSquare },
                      { id: 'EMAIL', label: 'Solo Email', icon: Mail },
                      { id: 'AMBOS', label: 'SMS + Email', icon: Sparkles },
                    ] as const
                  ).map((ch) => {
                    const Icon = ch.icon;
                    const active = canalPreferido === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setCanalPreferido(ch.id)}
                        className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-semibold">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuración de Umbrales Escalonados de Tiempo */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">
                    2. Umbrales de Tiempo para Sobreestancia
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">En minutos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Aviso Preventivo (Min)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1440}
                      value={umbralPreventivo}
                      onChange={(e) => setUmbralPreventivo(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                      Umbral Sobreestancia (ALERTA_TIEMPO) *
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      value={umbralAlerta}
                      onChange={(e) => setUmbralAlerta(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-amber-50/70 border border-amber-400 rounded-lg text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sobreestancia Crítica (Min)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={2880}
                      value={umbralCritico}
                      onChange={(e) => setUmbralCritico(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Frecuencia Recordatorio (Min)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={720}
                      value={intervaloRecordatorio}
                      onChange={(e) => setIntervaloRecordatorio(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums"
                    />
                  </div>
                </div>

                {/* Presets rápidos de umbral para pruebas inmediatas */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Ajuste rápido de umbral:</span>
                  {[
                    { label: '30m (Prueba Rápida)', prev: 20, alert: 30, crit: 90 },
                    { label: '60m (1 Hora)', prev: 45, alert: 60, crit: 120 },
                    { label: '120m (Estándar 2h)', prev: 90, alert: 120, crit: 240 },
                    { label: '180m (3 Horas)', prev: 120, alert: 180, crit: 360 },
                  ].map((preset) => (
                    <button
                      key={preset.alert}
                      type="button"
                      onClick={() => {
                        setUmbralPreventivo(preset.prev);
                        setUmbralAlerta(preset.alert);
                        setUmbralCritico(preset.crit);
                      }}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                        umbralAlerta === preset.alert
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado del Motor Automático y Remitente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado del Motor Automático
                  </label>
                  <select
                    value={autoEnvio ? 'ACTIVO' : 'PAUSADO'}
                    onChange={(e) => setAutoEnvio(e.target.value === 'ACTIVO')}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="ACTIVO">Habilitado (Despacho Automático)</option>
                    <option value="PAUSADO">Pausado (Solo Envío Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Identificador Remitente SMS
                  </label>
                  <input
                    type="text"
                    value={remitenteNombre}
                    onChange={(e) => setRemitenteNombre(e.target.value)}
                    placeholder="ParkFlow Alertas"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha (7 cols): Personalización del Mensaje de Aviso (SMS y Email) + Vista Previa */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Remitente (Alertas Email)
                  </label>
                  <input
                    type="email"
                    value={emailRemitente}
                    onChange={(e) => setEmailRemitente(e.target.value)}
                    placeholder="alertas@parkcontrol.co"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asunto Personalizado del Correo (Email)
                  </label>
                  <input
                    type="text"
                    value={asuntoEmail}
                    onChange={(e) => setAsuntoEmail(e.target.value)}
                    placeholder="Aviso de Sobreestancia — Vehículo {placa}"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    3. Plantilla Personalizada del Mensaje de Aviso (SMS y Cuerpo de Email) *
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {plantillaMensaje.length} caracteres
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={plantillaMensaje}
                  onChange={(e) => setPlantillaMensaje(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                  placeholder="Escriba el mensaje personalizado usando variables dinámicas..."
                />

                {/* Botones para insertar variables dinámicas en la plantilla */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Insertar variable dinámica:</span>
                  {availableTokens.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => insertTokenInTemplate(item.token)}
                      className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors"
                      title={`Insertar ${item.label}`}
                    >
                      {item.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarjeta de Vista Previa en Tiempo Real (Simulación SMS + Email) */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2.5 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-semibold uppercase">
                    Vista Previa en Vivo del Mensaje Personalizado ({canalPreferido})
                  </span>
                  <span>Ejemplo: Placa ABC123 · Bahía A-01</span>
                </div>

                {(canalPreferido === 'EMAIL' || canalPreferido === 'AMBOS') && (
                  <div className="text-xs font-mono text-slate-300 border-b border-slate-800 pb-2">
                    <span className="text-slate-500">De:</span> {emailRemitente} ·{' '}
                    <span className="text-slate-500">Asunto:</span>{' '}
                    <strong className="text-white">{renderLivePreview(asuntoEmail)}</strong>
                  </div>
                )}

                <p className="text-xs font-mono text-amber-200 bg-slate-950/90 p-3 rounded-lg border border-slate-800 leading-relaxed">
                  {renderLivePreview(plantillaMensaje)}
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* MONITOREO DE TICKETS ACTIVOS FRENTE A LOS UMBRALES CONFIGURADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Monitoreo en Vivo de Sobreestancia y Estado de Tickets Activos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Umbral Preventivo: <strong>{umbralPreventivo}m</strong> · Umbral Sobreestancia (ALERTA_TIEMPO):{' '}
              <strong className="text-amber-800">{umbralAlerta}m</strong> · Umbral Crítico:{' '}
              <strong className="text-red-700">{umbralCritico}m</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono text-slate-700 tabular-nums">
              <span className="text-amber-700 font-semibold">
                En Sobreestancia: {activeOverdueTickets.length}
              </span>
              <span className="mx-1.5">·</span>
              <span>En Tiempo Normal: {activeRegularTickets.length}</span>
            </div>

            {userRole !== 'Cliente' && (
              <button
                type="button"
                disabled={dispatching}
                onClick={() => handleDispatchNow()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dispatching ? 'animate-spin' : ''}`} />
                Ejecutar Barrido Automático Ahora
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-200 text-xs">
          {logs
            .filter((l) => l.estado_registro === 'ACTIVO')
            .map((log) => {
              const tck = tickets.find((t) => t.parking_log_id === log.id);
              const elapsedMins = Math.max(
                1,
                Math.floor((Date.now() - new Date(log.fecha_ingreso).getTime()) / 60000)
              );
              const isOverdue = tck?.estado === 'ALERTA_TIEMPO' || elapsedMins >= umbralAlerta;
              const isCritical = elapsedMins >= umbralCritico;
              const isPreventive = !isOverdue && elapsedMins >= umbralPreventivo;

              return (
                <div
                  key={log.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm text-slate-900 tabular-nums">
                        {log.placa}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-700 tabular-nums">
                        {tck?.numero_ticket || log.ticket_numero}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        Espacio {log.codigo_espacio}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                      Contacto: {tck?.telefono_cliente || log.telefono_cliente || '+57 310 000 0000'} · Permanencia:{' '}
                      <strong className="text-slate-900">{elapsedMins} min</strong>{' '}
                      {isCritical
                        ? '(Supera Umbral Crítico)'
                        : isOverdue
                        ? '(Supera Umbral de Sobreestancia)'
                        : isPreventive
                        ? '(En Rango Preventivo)'
                        : '(Dentro de Tiempo Normal)'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${
                          isCritical
                            ? 'text-red-700'
                            : isOverdue
                            ? 'text-amber-700'
                            : isPreventive
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isOverdue ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Ticket: ALERTA_TIEMPO
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Ticket: ACTIVO
                          </>
                        )}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {tck?.sms_alerta_enviado
                          ? `Notificado (${canalPreferido})`
                          : 'Pendiente de notificación'}
                      </p>
                    </div>

                    {userRole !== 'Cliente' && tck && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDispatchNow(tck.id, 'SMS')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                          title="Enviar aviso personalizado por SMS"
                        >
                          <MessageSquare className="w-3 h-3" />
                          SMS
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDispatchNow(tck.id, 'EMAIL')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                          title="Enviar aviso personalizado por Email"
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDispatchNow(tck.id, 'AMBOS')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Send className="w-3 h-3" />
                          Enviar Ambos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* BITÁCORA AUDITABLE DE ALERTAS SMS Y CORREOS ELECTRÓNICOS DESPACHADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Historial de Avisos Enviados (SMS / Email) y Estado de Tickets
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro auditable de cada notificación enviada con el mensaje personalizado y su resolución en caja
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'TODOS' | 'SMS' | 'EMAIL' | 'AMBOS')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
            >
              <option value="TODOS">Todos los Canales</option>
              <option value="AMBOS">Multicanal (SMS + Email)</option>
              <option value="SMS">Solo SMS</option>
              <option value="EMAIL">Solo Email</option>
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['TODOS', 'ALERTA_TIEMPO', 'PAGADO'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'TODOS'
                    ? `Todos (${smsNotifications.length})`
                    : st === 'ALERTA_TIEMPO'
                    ? 'En Sobreestancia (ALERTA_TIEMPO)'
                    : 'Resueltos / Pagados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSms.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-700">No hay notificaciones registradas en este filtro</p>
            <p className="text-xs text-slate-500 mt-1">
              Los avisos se generan automáticamente cuando un vehículo supera el umbral configurado sin haber pagado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-3">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Placa · Cliente</th>
                  <th className="py-2.5 px-3">Canal · Destino</th>
                  <th className="py-2.5 px-3">Ticket · Estado</th>
                  <th className="py-2.5 px-3 text-right">Estancia / Saldo</th>
                  <th className="py-2.5 px-3">Mensaje Personalizado Enviado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredSms.map((sms) => (
                  <tr key={sms.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {new Date(sms.timestamp).toLocaleString('es-CO', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">{sms.placa}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-700">{sms.propietario}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        Canal: {sms.canal_envio || 'SMS'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sms.telefono_destino}
                        {sms.email_destino ? ` · ${sms.email_destino}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-900 tabular-nums">
                        {sms.numero_ticket}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-semibold ${
                          sms.estado_ticket_resultante === 'ALERTA_TIEMPO'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {sms.estado_ticket_resultante} ({sms.estado_envio})
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {sms.minutos_estancia} min (Umbral: {sms.umbral_configurado}m)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(sms.saldo_pendiente_cop)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-md">
                      {sms.asunto_email && (sms.canal_envio === 'EMAIL' || sms.canal_envio === 'AMBOS') && (
                        <div className="text-[11px] font-semibold text-slate-800 mb-1">
                          Asunto: {sms.asunto_email}
                        </div>
                      )}
                      <p className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed">
                        {sms.mensaje}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
