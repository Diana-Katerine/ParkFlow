/**
 * Tipos compartidos para ParkControl — Sistema Inteligente de Parqueadero
 * Basado en el Modelo de Datos ERD del TRD y Matriz RBAC del PRD.
 */

export type RoleName = 'Administrador' | 'Operador' | 'Cliente';

export type VehicleType = 'AUTOMOVIL' | 'MOTOCICLETA' | 'CAMIONETA' | 'ELECTRICO';

export type SpotStatus = 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';

export type LogStatus = 'ACTIVO' | 'FINALIZADO' | 'ANULADO';

export type PaymentMethod = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA_QR';

export interface Role {
  id: string;
  nombre: RoleName;
  descripcion: string;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  roleId: string;
  rol: RoleName;
  activo: boolean;
  placaCliente?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  placa: string;
  tipo_vehiculo: VehicleType;
  propietario?: string;
  telefono?: string;
  createdAt: string;
}

export interface ParkingSpot {
  id: string;
  codigo_espacio: string;
  zona: 'Zona A - Automóviles' | 'Zona B - Camionetas' | 'Zona M - Motocicletas' | 'Zona E - Eléctricos';
  tipo_permitido: VehicleType;
  estado: SpotStatus;
  placa_actual?: string | null;
  hora_ingreso_actual?: string | null;
  ticket_actual?: string | null;
}

export interface Rate {
  id: string;
  tipo_vehiculo: VehicleType;
  valor_por_minuto: number;
  valor_por_hora: number;
  tarifa_plena_dia: number;
  tiempo_gracia_minutos: number;
  updatedAt: string;
}

export interface ParkingLog {
  id: string;
  ticket_numero: string;
  vehicle_id: string;
  placa: string;
  tipo_vehiculo: VehicleType;
  spot_id: string;
  codigo_espacio: string;
  zona: string;
  fecha_ingreso: string;
  fecha_salida: string | null;
  minutos_totales: number | null;
  valor_pagado: number | null;
  metodo_pago: PaymentMethod | null;
  estado_registro: LogStatus;
  operador_entrada: string;
  operador_salida: string | null;
  telefono_cliente?: string;
  observaciones?: string;
}

export type TicketStatus = 'ACTIVO' | 'ALERTA_TIEMPO' | 'PAGADO' | 'ANULADO';

export interface Ticket {
  id: string;
  numero_ticket: string;
  parking_log_id: string;
  placa: string;
  tipo_vehiculo: VehicleType;
  codigo_espacio: string;
  zona: string;
  fecha_ingreso: string;
  tarifa_por_minuto: number;
  tarifa_por_hora: number;
  codigo_verificacion: string;
  estado: TicketStatus;
  telefono_cliente?: string;
  sms_alerta_enviado?: boolean;
  fecha_ultimo_sms?: string | null;
  minutos_umbral_alerta?: number;
}

export type AlertChannel = 'SMS' | 'EMAIL' | 'AMBOS';

export interface SmsNotification {
  id: string;
  ticket_id: string;
  numero_ticket: string;
  parking_log_id: string;
  placa: string;
  propietario: string;
  telefono_destino: string;
  email_destino?: string;
  canal_envio?: AlertChannel;
  asunto_email?: string;
  mensaje: string;
  minutos_estancia: number;
  umbral_configurado: number;
  saldo_pendiente_cop: number;
  estado_ticket_resultante: TicketStatus;
  estado_envio: 'ENVIADO' | 'ENTREGADO' | 'RESUELTO_PAGADO';
  tipo_disparo: 'AUTOMATICO_UMBRAL' | 'MANUAL_OPERADOR';
  timestamp: string;
}

export interface SmsAlertConfig {
  umbralMinutos: number;
  umbralPreventivoMinutos?: number;
  umbralCriticoMinutos?: number;
  intervaloRecordatorioMinutos?: number;
  autoEnvioActivo: boolean;
  canalPreferido?: AlertChannel;
  remitenteNombre: string;
  emailRemitente?: string;
  asuntoEmail?: string;
  plantillaMensaje?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: RoleName;
  accion: string;
  modulo: 'AUTH' | 'ESPACIOS' | 'ENTRADAS' | 'SALIDAS' | 'TARIFAS' | 'USUARIOS' | 'NOTIFICACIONES_SMS' | 'SISTEMA';
  detalle: string;
  ip: string;
  timestamp: string;
}

export interface FeeCalculationBreakdown {
  minutosTranscurridos: number;
  horasCompletas: number;
  minutosRestantes: number;
  aplicaTiempoGracia: boolean;
  aplicaTarifaPlenaDia: boolean;
  diasCompletos: number;
  cruzoMedianoche: boolean;
  tarifaAplicada: Rate;
  subtotal: number;
  totalPagar: number;
  explicacion: string;
}

export interface HourlyOccupancyPoint {
  hora: string;
  ocupados: number;
  disponibles: number;
  capacidadMaxima: number;
  porcentaje: number;
}

export interface DailyRevenuePoint {
  fecha: string;
  etiqueta: string;
  recaudacion: number;
  vehiculos: number;
}

export interface ZoneHeatmapCell {
  zona: string;
  zonaCorta: string;
  franja: string;
  densidadPorcentaje: number;
  rotacionVehiculos: number;
  capacidadZona: number;
}

export interface ReportSummary {
  rangoInicio: string;
  rangoFin: string;
  totalVehiculosAtendidos: number;
  vehiculosActivosAhora: number;
  vehiculosFinalizadosPeriodo: number;
  recaudacionTotal: number;
  ticketPromedio: number;
  estanciaPromedioMinutos: number;
  porcentajeOcupacionActual: number;
  totalEspacios: number;
  espaciosOcupados: number;
  espaciosDisponibles: number;
  espaciosMantenimiento: number;
  recaudacionPorTipo: Record<VehicleType, { cantidad: number; total: number }>;
  recaudacionPorMetodo: Record<string, number>;
  ocupacionPorHora: HourlyOccupancyPoint[];
  ocupacionUltimas24h: HourlyOccupancyPoint[];
  recaudacionHistorica: DailyRevenuePoint[];
  densidadZonas: ZoneHeatmapCell[];
  registrosPeriodo: ParkingLog[];
}
