import {
  AuditLog,
  BillingBreakdown,
  ParkingLog,
  ParkingSpot,
  RateConfig,
  UserAccount,
  VehicleType,
} from '../types/parking';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    nombre: 'Camila Mendoza',
    email: 'operador@parkpulse.co',
    rol: 'Operador',
    activo: true,
    ultimoAcceso: '2026-10-07 14:55:12',
  },
  {
    id: 'USR-002',
    nombre: 'Alejandro Vargas',
    email: 'admin@parkpulse.co',
    rol: 'Administrador',
    activo: true,
    ultimoAcceso: '2026-10-07 15:02:40',
  },
  {
    id: 'USR-003',
    nombre: 'Diana K. Pérez',
    email: 'cliente@parkpulse.co',
    rol: 'Cliente',
    activo: true,
    placaAsociada: 'KLM-456',
    ultimoAcceso: '2026-10-07 15:08:19',
  },
  {
    id: 'USR-004',
    nombre: 'Mateo Restrepo',
    email: 'm.restrepo@parkpulse.co',
    rol: 'Operador',
    activo: true,
    ultimoAcceso: '2026-10-07 08:15:00',
  },
  {
    id: 'USR-005',
    nombre: 'Laura Castellanos',
    email: 'l.castellanos@clientes.co',
    rol: 'Cliente',
    activo: true,
    placaAsociada: 'BGT-902',
    ultimoAcceso: '2026-10-06 19:42:10',
  },
];

export const INITIAL_RATES: RateConfig[] = [
  {
    id: 'RATE-AUTO',
    tipoVehiculo: 'Automóvil',
    tarifaPorMinuto: 110,
    tarifaPorHora: 5800,
    tarifaPlenaDia: 42000,
    fraccionGraciaMin: 5,
    actualizadoEn: '2026-10-05 09:00',
  },
  {
    id: 'RATE-MOTO',
    tipoVehiculo: 'Motocicleta',
    tarifaPorMinuto: 65,
    tarifaPorHora: 3400,
    tarifaPlenaDia: 24000,
    fraccionGraciaMin: 5,
    actualizadoEn: '2026-10-05 09:00',
  },
  {
    id: 'RATE-SUV',
    tipoVehiculo: 'Camioneta',
    tarifaPorMinuto: 135,
    tarifaPorHora: 7200,
    tarifaPlenaDia: 52000,
    fraccionGraciaMin: 5,
    actualizadoEn: '2026-10-05 09:00',
  },
  {
    id: 'RATE-EV',
    tipoVehiculo: 'Eléctrico EV',
    tarifaPorMinuto: 95,
    tarifaPorHora: 5000,
    tarifaPlenaDia: 38000,
    fraccionGraciaMin: 10,
    actualizadoEn: '2026-10-05 09:00',
  },
];

export const INITIAL_SPOTS: ParkingSpot[] = [
  // Zona A · Estándar (Automóviles)
  {
    id: 'SP-A01',
    codigo: 'A-01',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'OCUPADO',
    saludSensor: 99.9,
    placaActual: 'BGT-902',
    ticketActualId: 'TCK-2026-8841',
  },
  {
    id: 'SP-A02',
    codigo: 'A-02',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'DISPONIBLE',
    saludSensor: 99.8,
  },
  {
    id: 'SP-A03',
    codigo: 'A-03',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'OCUPADO',
    saludSensor: 99.7,
    placaActual: 'MDE-314',
    ticketActualId: 'TCK-2026-8839',
  },
  {
    id: 'SP-A04',
    codigo: 'A-04',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'DISPONIBLE',
    saludSensor: 99.9,
  },
  {
    id: 'SP-A05',
    codigo: 'A-05',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'DISPONIBLE',
    saludSensor: 99.6,
  },
  {
    id: 'SP-A06',
    codigo: 'A-06',
    nivel: 'Nivel S1',
    zona: 'Zona A · Estándar',
    tipoPermitido: 'Automóvil',
    estado: 'BLOQUEADO',
    saludSensor: 84.2,
  },

  // Zona B · EV & VIP
  {
    id: 'SP-B01',
    codigo: 'B-01',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'OCUPADO',
    esVIP: true,
    potenciaEVKw: 22.0,
    saludSensor: 99.9,
    placaActual: 'KLM-456',
    ticketActualId: 'TCK-2026-8842',
  },
  {
    id: 'SP-B02',
    codigo: 'B-02',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'DISPONIBLE',
    esVIP: true,
    potenciaEVKw: 22.0,
    saludSensor: 99.9,
  },
  {
    id: 'SP-B03',
    codigo: 'B-03',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'DISPONIBLE',
    potenciaEVKw: 11.4,
    saludSensor: 99.8,
  },
  {
    id: 'SP-B04',
    codigo: 'B-04',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'OCUPADO',
    esVIP: true,
    potenciaEVKw: 50.0,
    saludSensor: 99.9,
    placaActual: 'EVX-108',
    ticketActualId: 'TCK-2026-8844',
  },
  {
    id: 'SP-B05',
    codigo: 'B-05',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'DISPONIBLE',
    potenciaEVKw: 11.4,
    saludSensor: 99.7,
  },
  {
    id: 'SP-B06',
    codigo: 'B-06',
    nivel: 'Nivel S1',
    zona: 'Zona B · EV & VIP',
    tipoPermitido: 'Eléctrico EV',
    estado: 'DISPONIBLE',
    esVIP: true,
    potenciaEVKw: 22.0,
    saludSensor: 99.9,
  },

  // Zona C · Motos
  {
    id: 'SP-C01',
    codigo: 'C-01',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'OCUPADO',
    saludSensor: 99.5,
    placaActual: 'Racer-82A'.replace('Racer-', 'XRT-'),
    ticketActualId: 'TCK-2026-8843',
  },
  {
    id: 'SP-C02',
    codigo: 'C-02',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'DISPONIBLE',
    saludSensor: 99.8,
  },
  {
    id: 'SP-C03',
    codigo: 'C-03',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'DISPONIBLE',
    saludSensor: 99.8,
  },
  {
    id: 'SP-C04',
    codigo: 'C-04',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'DISPONIBLE',
    saludSensor: 99.7,
  },
  {
    id: 'SP-C05',
    codigo: 'C-05',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'OCUPADO',
    saludSensor: 99.6,
    placaActual: 'QWE-45F',
    ticketActualId: 'TCK-2026-8845',
  },
  {
    id: 'SP-C06',
    codigo: 'C-06',
    nivel: 'Nivel S1',
    zona: 'Zona C · Motos',
    tipoPermitido: 'Motocicleta',
    estado: 'DISPONIBLE',
    saludSensor: 99.9,
  },

  // Zona D · Camionetas / SUV
  {
    id: 'SP-D01',
    codigo: 'D-01',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'OCUPADO',
    esVIP: true,
    saludSensor: 99.9,
    placaActual: 'SUV-779',
    ticketActualId: 'TCK-2026-8840',
  },
  {
    id: 'SP-D02',
    codigo: 'D-02',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'DISPONIBLE',
    saludSensor: 99.8,
  },
  {
    id: 'SP-D03',
    codigo: 'D-03',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'DISPONIBLE',
    saludSensor: 99.7,
  },
  {
    id: 'SP-D04',
    codigo: 'D-04',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'DISPONIBLE',
    saludSensor: 99.9,
  },
  {
    id: 'SP-D05',
    codigo: 'D-05',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'BLOQUEADO',
    saludSensor: 78.5,
  },
  {
    id: 'SP-D06',
    codigo: 'D-06',
    nivel: 'Nivel S2',
    zona: 'Zona D · Camionetas',
    tipoPermitido: 'Camioneta',
    estado: 'DISPONIBLE',
    saludSensor: 99.8,
  },
];

// Helper to create relative ISO timestamps from current time
const minutesAgoISO = (mins: number): string => {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
};

export const INITIAL_LOGS: ParkingLog[] = [
  // Active stay that crossed midnight (entered 16 hours 45 mins ago)
  {
    id: 'LOG-1001',
    ticketCodigo: 'TCK-2026-8839',
    placa: 'MDE-314',
    tipoVehiculo: 'Automóvil',
    spotCodigo: 'A-03',
    fechaIngreso: minutesAgoISO(1005), // 16h 45m ago -> crosses midnight!
    estado: 'ACTIVO',
    operadorEntrada: 'Mateo Restrepo',
    cruzoMedianoche: true,
    propietarioNombre: 'Carlos E. Giraldo',
  },
  // Active stay SUV (entered 4 hours 20 mins ago)
  {
    id: 'LOG-1002',
    ticketCodigo: 'TCK-2026-8840',
    placa: 'SUV-779',
    tipoVehiculo: 'Camioneta',
    spotCodigo: 'D-01',
    fechaIngreso: minutesAgoISO(260),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Inversiones Del Norte',
  },
  // Active stay Auto (entered 2 hours 15 mins ago)
  {
    id: 'LOG-1003',
    ticketCodigo: 'TCK-2026-8841',
    placa: 'BGT-902',
    tipoVehiculo: 'Automóvil',
    spotCodigo: 'A-01',
    fechaIngreso: minutesAgoISO(135),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Laura Castellanos',
  },
  // Active stay EV for our logged-in Client demo (entered 82 mins ago)
  {
    id: 'LOG-1004',
    ticketCodigo: 'TCK-2026-8842',
    placa: 'KLM-456',
    tipoVehiculo: 'Eléctrico EV',
    spotCodigo: 'B-01',
    fechaIngreso: minutesAgoISO(82),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Diana K. Pérez',
  },
  // Active stay Moto (entered 47 mins ago)
  {
    id: 'LOG-1005',
    ticketCodigo: 'TCK-2026-8843',
    placa: 'XRT-82A',
    tipoVehiculo: 'Motocicleta',
    spotCodigo: 'C-01',
    fechaIngreso: minutesAgoISO(47),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Santiago Ríos',
  },
  // Active stay EV (entered 29 mins ago)
  {
    id: 'LOG-1006',
    ticketCodigo: 'TCK-2026-8844',
    placa: 'EVX-108',
    tipoVehiculo: 'Eléctrico EV',
    spotCodigo: 'B-04',
    fechaIngreso: minutesAgoISO(29),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Valeria Duque',
  },
  // Active stay Moto (entered 18 mins ago)
  {
    id: 'LOG-1007',
    ticketCodigo: 'TCK-2026-8845',
    placa: 'QWE-45F',
    tipoVehiculo: 'Motocicleta',
    spotCodigo: 'C-05',
    fechaIngreso: minutesAgoISO(18),
    estado: 'ACTIVO',
    operadorEntrada: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Andrés Felipe Mora',
  },

  // Historical completed stays for rich Reports & Client History
  {
    id: 'LOG-0991',
    ticketCodigo: 'TCK-2026-8810',
    placa: 'KLM-456',
    tipoVehiculo: 'Eléctrico EV',
    spotCodigo: 'B-02',
    fechaIngreso: minutesAgoISO(1620),
    fechaSalida: minutesAgoISO(1495),
    minutosTranscurridos: 125,
    valorPagado: 10475,
    metodoPago: 'QR Digital',
    estado: 'FINALIZADO',
    operadorEntrada: 'Mateo Restrepo',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Diana K. Pérez',
  },
  {
    id: 'LOG-0992',
    ticketCodigo: 'TCK-2026-8815',
    placa: 'KLM-456',
    tipoVehiculo: 'Eléctrico EV',
    spotCodigo: 'B-01',
    fechaIngreso: minutesAgoISO(3100),
    fechaSalida: minutesAgoISO(2920),
    minutosTranscurridos: 180,
    valorPagado: 15000,
    metodoPago: 'Tarjeta',
    estado: 'FINALIZADO',
    operadorEntrada: 'Camila Mendoza',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Diana K. Pérez',
  },
  {
    id: 'LOG-0993',
    ticketCodigo: 'TCK-2026-8821',
    placa: 'JKL-901',
    tipoVehiculo: 'Camioneta',
    spotCodigo: 'D-02',
    fechaIngreso: minutesAgoISO(640),
    fechaSalida: minutesAgoISO(400),
    minutosTranscurridos: 240,
    valorPagado: 28800,
    metodoPago: 'Tarjeta',
    estado: 'FINALIZADO',
    operadorEntrada: 'Mateo Restrepo',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Roberto Gómez',
  },
  {
    id: 'LOG-0994',
    ticketCodigo: 'TCK-2026-8825',
    placa: 'ZXC-332',
    tipoVehiculo: 'Automóvil',
    spotCodigo: 'A-04',
    fechaIngreso: minutesAgoISO(1800),
    fechaSalida: minutesAgoISO(960),
    minutosTranscurridos: 840, // 14 hours overnight
    valorPagado: 42000,
    metodoPago: 'Efectivo',
    estado: 'FINALIZADO',
    operadorEntrada: 'Mateo Restrepo',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: true,
    propietarioNombre: 'Elena Martínez',
  },
  {
    id: 'LOG-0995',
    ticketCodigo: 'TCK-2026-8830',
    placa: 'TYU-19B',
    tipoVehiculo: 'Motocicleta',
    spotCodigo: 'C-02',
    fechaIngreso: minutesAgoISO(320),
    fechaSalida: minutesAgoISO(230),
    minutosTranscurridos: 90,
    valorPagado: 5350,
    metodoPago: 'Efectivo',
    estado: 'FINALIZADO',
    operadorEntrada: 'Camila Mendoza',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Julián Castro',
  },
  {
    id: 'LOG-0996',
    ticketCodigo: 'TCK-2026-8834',
    placa: 'HJK-512',
    tipoVehiculo: 'Automóvil',
    spotCodigo: 'A-02',
    fechaIngreso: minutesAgoISO(210),
    fechaSalida: minutesAgoISO(90),
    minutosTranscurridos: 120,
    valorPagado: 11600,
    metodoPago: 'QR Digital',
    estado: 'FINALIZADO',
    operadorEntrada: 'Camila Mendoza',
    operadorSalida: 'Camila Mendoza',
    cruzoMedianoche: false,
    propietarioNombre: 'Patricia Londoño',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-9001',
    usuarioEmail: 'admin@parkpulse.co',
    rol: 'Administrador',
    accion: 'SYNC_RATES_CONFIG',
    modulo: 'TARIFAS',
    detalle: 'Verificación de matriz tarifaria 2026 con soporte de cruce de medianoche',
    timestamp: '2026-10-07 14:10:05',
    resultado: 'OK',
  },
  {
    id: 'AUD-9002',
    usuarioEmail: 'operador@parkpulse.co',
    rol: 'Operador',
    accion: 'ENTRY_REGISTERED',
    modulo: 'FLUJO_VEHICULAR',
    detalle: 'Ingreso vehículo KLM-456 asignado a bahía B-01 (Ticket TCK-2026-8842)',
    timestamp: '2026-10-07 14:29:18',
    resultado: 'OK',
  },
  {
    id: 'AUD-9003',
    usuarioEmail: 'operador@parkpulse.co',
    rol: 'Operador',
    accion: 'DUPLICATE_PLATE_BLOCKED',
    modulo: 'FLUJO_VEHICULAR',
    detalle: 'Intento de doble ingreso bloqueado para placa activa MDE-314 en A-03',
    timestamp: '2026-10-07 14:42:51',
    resultado: 'ALERTA',
  },
  {
    id: 'AUD-9004',
    usuarioEmail: 'cliente@parkpulse.co',
    rol: 'Cliente',
    accion: 'UNAUTHORIZED_ROUTE_ATTEMPT',
    modulo: 'RBAC_SECURITY',
    detalle: 'Bloqueo HTTP 403 Forbidden al intentar acceder a /admin/tarifas con rol Cliente',
    timestamp: '2026-10-07 14:58:02',
    resultado: 'BLOQUEADO_403',
  },
];

/**
 * Validates standardized Colombian/Latin American vehicle license plates:
 * - Standard 3 letters + 3 digits: ABC-123 or ABC123
 * - Motorcycle 3 letters + 2 digits + 1 letter: ABC-12D or ABC12D
 */
export function validateLicensePlate(raw: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) {
    return { valid: false, formatted: '', error: 'La placa es obligatoria.' };
  }

  // Reject special characters other than single hyphen
  if (/[^A-Z0-9-]/.test(cleaned)) {
    return {
      valid: false,
      formatted: cleaned,
      error: 'Formato inválido: no se permiten caracteres especiales (@, #, $, %, etc.).',
    };
  }

  const plain = cleaned.replace(/-/g, '');
  const carRegex = /^[A-Z]{3}[0-9]{3}$/;
  const motoRegex = /^[A-Z]{3}[0-9]{2}[A-Z0-9]{1}$/;

  if (!carRegex.test(plain) && !motoRegex.test(plain)) {
    return {
      valid: false,
      formatted: cleaned,
      error: 'Formato inválido: use 3 letras y 3 caracteres alfanuméricos (ej. ABC-123 o XRT-82A).',
    };
  }

  const formatted = `${plain.slice(0, 3)}-${plain.slice(3, 6)}`;
  return { valid: true, formatted };
}

/**
 * Automatic tariff calculation engine supporting grace periods, hourly/minute billing,
 * full-day caps, and accurate multi-day / midnight crossing calculation.
 */
export function calculateStayBilling(
  fechaIngresoISO: string,
  fechaSalidaISO: string,
  rate: RateConfig
): BillingBreakdown {
  const start = new Date(fechaIngresoISO);
  const end = new Date(fechaSalidaISO);
  const diffMs = Math.max(60 * 1000, end.getTime() - start.getTime());
  const minutosTotales = Math.max(1, Math.ceil(diffMs / (60 * 1000)));

  const cruzoMedianoche =
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate() ||
    minutosTotales >= 720;

  const diasCompletos = Math.floor(minutosTotales / 1440);
  const minutosRestoDia = minutosTotales % 1440;
  const horasCompletas = Math.floor(minutosTotales / 60);
  const minutosRestantes = minutosTotales % 60;

  let totalBruto = 0;
  let tarifaAplicadaDesc = '';

  if (minutosTotales <= rate.fraccionGraciaMin) {
    totalBruto = rate.tarifaPorMinuto * minutosTotales;
    tarifaAplicadaDesc = `Fracción inicial (${minutosTotales} min × $${rate.tarifaPorMinuto.toLocaleString('es-CO')}/min)`;
  } else {
    // Calculate cost for remainder of day using best of hourly + minute vs daily cap
    const horasEnDia = Math.floor(minutosRestoDia / 60);
    const minsEnHora = minutosRestoDia % 60;
    const costoPorHorasYMinutos =
      horasEnDia * rate.tarifaPorHora +
      Math.min(rate.tarifaPorHora, minsEnHora * rate.tarifaPorMinuto);

    const costoDiaParcial = Math.min(rate.tarifaPlenaDia, costoPorHorasYMinutos);
    totalBruto = diasCompletos * rate.tarifaPlenaDia + costoDiaParcial;

    if (diasCompletos > 0 || costoPorHorasYMinutos >= rate.tarifaPlenaDia) {
      tarifaAplicadaDesc =
        diasCompletos > 0
          ? `${diasCompletos}d Tarifa Plena + fracción (${horasEnDia}h ${minsEnHora}m)`
          : `Tarifa Plena Diaria (${horasCompletas}h ${minutosRestantes}m acumulados)`;
    } else if (horasEnDia > 0) {
      tarifaAplicadaDesc = `${horasEnDia}h × $${rate.tarifaPorHora.toLocaleString('es-CO')} + ${minsEnHora}m × $${rate.tarifaPorMinuto.toLocaleString('es-CO')}`;
    } else {
      tarifaAplicadaDesc = `${minutosTotales} min × $${rate.tarifaPorMinuto.toLocaleString('es-CO')}/min`;
    }
  }

  // Round to nearest 50 COP
  const totalPagar = Math.ceil(totalBruto / 50) * 50;
  const subtotal = Math.round(totalPagar / 1.19);
  const impuestoIVA = totalPagar - subtotal;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatoTiempo =
    diasCompletos > 0
      ? `${diasCompletos}d ${pad(Math.floor(minutosRestoDia / 60))}h ${pad(minutosRestantes)}m`
      : `${pad(horasCompletas)}h ${pad(minutosRestantes)}m`;

  return {
    minutosTotales,
    horasCompletas,
    minutosRestantes,
    diasCompletos,
    cruzoMedianoche,
    tarifaAplicadaDesc,
    subtotal,
    impuestoIVA,
    totalPagar,
    formatoTiempo,
  };
}

export function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}
