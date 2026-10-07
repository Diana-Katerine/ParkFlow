import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import type { Ticket, ParkingLog, FeeCalculationBreakdown } from '../types';

interface TicketModalProps {
  mode: 'ENTRY' | 'EXIT';
  ticket: Ticket;
  log: ParkingLog;
  calculation?: FeeCalculationBreakdown;
  onClose: () => void;
  onReturnToMap: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  mode,
  ticket,
  log,
  calculation,
  onClose,
  onReturnToMap,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera de confirmación */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-base font-semibold tracking-tight">
              {mode === 'ENTRY' ? 'Comprobante de Ingreso Generado' : 'Liquidación y Salida Registrada'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo de Ticket Digital */}
        <div className="p-6 space-y-5">
          <div className="border-b border-dashed border-slate-300 pb-4 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-500">Ticket Digital Oficial</p>
              <p className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                {ticket.numero_ticket}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Placa Registrada</p>
              <p className="text-xl font-mono font-semibold text-slate-900 tracking-wider tabular-nums">
                {log.placa}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Espacio Asignado</p>
              <p className="font-mono font-semibold text-slate-900 tabular-nums">
                {log.codigo_espacio} · {log.zona.split(' - ')[0]}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado del Ticket</p>
              <p
                className={`font-mono font-semibold tabular-nums ${
                  ticket.estado === 'ALERTA_TIEMPO'
                    ? 'text-amber-700'
                    : ticket.estado === 'PAGADO'
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }`}
              >
                {ticket.estado}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Categoría Vehicular</p>
              <p className="font-medium text-slate-900">{log.tipo_vehiculo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Móvil Notificaciones SMS</p>
              <p className="font-mono text-xs text-slate-800 tabular-nums">
                {ticket.telefono_cliente || log.telefono_cliente || '+57 310 000 0000'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Fecha y Hora Exacta de Entrada</p>
              <p className="font-mono text-xs text-slate-800 tabular-nums">
                {formatDateTime(log.fecha_ingreso)}
              </p>
            </div>

            {ticket.sms_alerta_enviado && (
              <div className="col-span-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <p className="font-semibold">Aviso SMS por Tiempo Excedido Enviado</p>
                <p className="font-mono text-[11px] tabular-nums mt-0.5">
                  Umbral superado ({ticket.minutos_umbral_alerta || 120} min sin pago) · Despachado a{' '}
                  {ticket.telefono_cliente}
                </p>
              </div>
            )}

            {mode === 'EXIT' && log.fecha_salida && (
              <>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Fecha y Hora Exacta de Salida</p>
                  <p className="font-mono text-xs text-slate-800 tabular-nums">
                    {formatDateTime(log.fecha_salida)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tiempo Total Permanencia</p>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                    {log.minutos_totales} min ({calculation?.horasCompletas}h {calculation?.minutosRestantes}m)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Medio de Pago</p>
                  <p className="font-medium text-slate-900">{log.metodo_pago?.replace('_', ' ')}</p>
                </div>
              </>
            )}

            {mode === 'ENTRY' && (
              <>
                <div>
                  <p className="text-xs text-slate-500">Tarifa por Hora</p>
                  <p className="font-mono text-slate-900 tabular-nums">
                    {formatCurrency(ticket.tarifa_por_hora)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tarifa por Fracción (Min)</p>
                  <p className="font-mono text-slate-900 tabular-nums">
                    {formatCurrency(ticket.tarifa_por_minuto)}
                  </p>
                </div>
              </>
            )}
          </div>

          {mode === 'EXIT' && calculation && (
            <div className="border-t border-dashed border-slate-300 pt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Detalle Liquidación</span>
                <span className="font-mono tabular-nums">{calculation.explicacion}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-semibold text-slate-900">Valor Total Cobrado</span>
                <span className="text-2xl font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(log.valor_pagado || 0)}
                </span>
              </div>
              <p className="text-xs text-emerald-700 pt-1">
                Espacio {log.codigo_espacio} liberado y actualizado a DISPONIBLE en el mapa general.
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Verificación: {ticket.codigo_verificacion}</span>
            <span>Operador: {mode === 'ENTRY' ? log.operador_entrada : log.operador_salida}</span>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Comprobante
          </button>
          <button
            type="button"
            onClick={onReturnToMap}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Regresar al Mapa General
          </button>
        </div>
      </div>
    </div>
  );
};
