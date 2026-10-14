export type RoleType = 'Cliente' | 'Operador' | 'Administrador';

export type VehicleType = 'Automóvil' | 'Motocicleta' | 'Camioneta' | 'Eléctrico EV';

export type SpotStatus = 'DISPONIBLE' | 'OCUPADO' | 'RESERVADO' | 'BLOQUEADO';

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'QR Digital';

export interface UserAccount {
  id: string;
  nombre: string;
  email: string;
  rol: RoleType;
  activo: boolean;
  placaAsociada?: string;
  ultimoAcceso: string;
}

export interface ParkingSpot {
  id: string;
  codigo: string;
  nivel: string;
  zona: 'Zona A · Estándar' | 'Zona B · EV & VIP' | 'Zona C · Motos' | 'Zona D · Camionetas';
  tipoPermitido: VehicleType;
  estado: SpotStatus;
  esVIP?: boolean;
  potenciaEVKw?: number;
  saludSensor: number;
  placaActual?: string;
  ticketActualId?: string;
}

export interface RateConfig {
  id: string;
  tipoVehiculo: VehicleType;
  tarifaPorMinuto: number;
  tarifaPorHora: number;
  tarifaPlenaDia: number;
  fraccionGraciaMin: number;
  actualizadoEn: string;
}

export interface ParkingLog {
  id: string;
  ticketCodigo: string;
  placa: string;
  tipoVehiculo: VehicleType;
  spotCodigo: string;
  fechaIngreso: string; // ISO string
  fechaSalida?: string; // ISO string
  minutosTranscurridos?: number;
  valorPagado?: number;
  metodoPago?: PaymentMethod;
  estado: 'ACTIVO' | 'FINALIZADO';
  operadorEntrada: string;
  operadorSalida?: string;
  cruzoMedianoche?: boolean;
  propietarioNombre?: string;
}

export interface AuditLog {
  id: string;
  usuarioEmail: string;
  rol: RoleType;
  accion: string;
  modulo: 'AUTH' | 'ESPACIOS' | 'FLUJO_VEHICULAR' | 'TARIFAS' | 'USUARIOS' | 'RBAC_SECURITY';
  detalle: string;
  timestamp: string;
  resultado: 'OK' | 'ALERTA' | 'BLOQUEADO_403';
}

export interface BillingBreakdown {
  minutosTotales: number;
  horasCompletas: number;
  minutosRestantes: number;
  diasCompletos: number;
  cruzoMedianoche: boolean;
  tarifaAplicadaDesc: string;
  subtotal: number;
  impuestoIVA: number;
  totalPagar: number;
  formatoTiempo: string;
}
