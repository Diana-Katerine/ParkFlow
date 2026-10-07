import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type {
  Role,
  RoleName,
  User,
  Vehicle,
  VehicleType,
  ParkingSpot,
  Rate,
  ParkingLog,
  Ticket,
  AuditLog,
  FeeCalculationBreakdown,
  PaymentMethod,
  SmsNotification,
  SmsAlertConfig,
} from './src/types.ts';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'parkcontrol-super-secret-jwt-key-2026';
const DB_FILE_PATH = path.resolve(process.cwd(), '.parkcontrol-db.json');

interface InternalUser extends User {
  password_hash: string;
}

interface DatabaseSchema {
  roles: Role[];
  users: InternalUser[];
  vehicles: Vehicle[];
  parkingSpots: ParkingSpot[];
  rates: Rate[];
  parkingLogs: ParkingLog[];
  tickets: Ticket[];
  auditLogs: AuditLog[];
  smsNotifications: SmsNotification[];
  smsConfig: SmsAlertConfig;
}

// --- Inicialización de Semilla Relacional (ERD) ---
function createInitialSeed(): DatabaseSchema {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 125 * 60 * 1000).toISOString();
  const fortyFiveMinsAgo = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
  const yesterdayNight = new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString(); // Cruce de medianoche
  const threeHoursAgo = new Date(now.getTime() - 190 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const roles: Role[] = [
    { id: 'role-admin', nombre: 'Administrador', descripcion: 'Control total operativo, financiero, tarifas, usuarios y auditoría' },
    { id: 'role-operador', nombre: 'Operador', descripcion: 'Control de flujo vehicular en punto de acceso, cobros y mapa en tiempo real' },
    { id: 'role-cliente', nombre: 'Cliente', descripcion: 'Consulta de disponibilidad de espacios en tiempo real e historial de tickets' },
  ];

  const passwordHashAdmin = bcrypt.hashSync('Admin123!', 10);
  const passwordHashOperador = bcrypt.hashSync('Operador123!', 10);
  const passwordHashCliente = bcrypt.hashSync('Cliente123!', 10);

  const users: InternalUser[] = [
    {
      id: 'usr-admin-01',
      nombre: 'Diana Katerine Pérez',
      email: 'admin@parkcontrol.co',
      password_hash: passwordHashAdmin,
      roleId: 'role-admin',
      rol: 'Administrador',
      activo: true,
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
    },
    {
      id: 'usr-oper-01',
      nombre: 'Carlos Andrés Mendoza',
      email: 'operador@parkcontrol.co',
      password_hash: passwordHashOperador,
      roleId: 'role-operador',
      rol: 'Operador',
      activo: true,
      createdAt: new Date(now.getTime() - 20 * 86400000).toISOString(),
    },
    {
      id: 'usr-cli-01',
      nombre: 'Mateo Restrepo',
      email: 'cliente@parkcontrol.co',
      password_hash: passwordHashCliente,
      roleId: 'role-cliente',
      rol: 'Cliente',
      activo: true,
      placaCliente: 'ABC123',
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    },
  ];

  const rates: Rate[] = [
    {
      id: 'rate-auto',
      tipo_vehiculo: 'AUTOMOVIL',
      valor_por_minuto: 110,
      valor_por_hora: 6000,
      tarifa_plena_dia: 38000,
      tiempo_gracia_minutos: 5,
      updatedAt: now.toISOString(),
    },
    {
      id: 'rate-camioneta',
      tipo_vehiculo: 'CAMIONETA',
      valor_por_minuto: 140,
      valor_por_hora: 7800,
      tarifa_plena_dia: 48000,
      tiempo_gracia_minutos: 5,
      updatedAt: now.toISOString(),
    },
    {
      id: 'rate-moto',
      tipo_vehiculo: 'MOTOCICLETA',
      valor_por_minuto: 75,
      valor_por_hora: 4200,
      tarifa_plena_dia: 24000,
      tiempo_gracia_minutos: 5,
      updatedAt: now.toISOString(),
    },
    {
      id: 'rate-elec',
      tipo_vehiculo: 'ELECTRICO',
      valor_por_minuto: 95,
      valor_por_hora: 5200,
      tarifa_plena_dia: 32000,
      tiempo_gracia_minutos: 10,
      updatedAt: now.toISOString(),
    },
  ];

  const parkingSpots: ParkingSpot[] = [];

  // Zona A: Automóviles (A-01 a A-10)
  for (let i = 1; i <= 10; i++) {
    const code = `A-${String(i).padStart(2, '0')}`;
    parkingSpots.push({
      id: `spot-${code}`,
      codigo_espacio: code,
      zona: 'Zona A - Automóviles',
      tipo_permitido: 'AUTOMOVIL',
      estado: 'DISPONIBLE',
      placa_actual: null,
      hora_ingreso_actual: null,
      ticket_actual: null,
    });
  }

  // Zona B: Camionetas (B-01 a B-06)
  for (let i = 1; i <= 6; i++) {
    const code = `B-${String(i).padStart(2, '0')}`;
    parkingSpots.push({
      id: `spot-${code}`,
      codigo_espacio: code,
      zona: 'Zona B - Camionetas',
      tipo_permitido: 'CAMIONETA',
      estado: 'DISPONIBLE',
      placa_actual: null,
      hora_ingreso_actual: null,
      ticket_actual: null,
    });
  }

  // Zona M: Motocicletas (M-01 a M-06)
  for (let i = 1; i <= 6; i++) {
    const code = `M-${String(i).padStart(2, '0')}`;
    parkingSpots.push({
      id: `spot-${code}`,
      codigo_espacio: code,
      zona: 'Zona M - Motocicletas',
      tipo_permitido: 'MOTOCICLETA',
      estado: 'DISPONIBLE',
      placa_actual: null,
      hora_ingreso_actual: null,
      ticket_actual: null,
    });
  }

  // Zona E: Eléctricos (E-01 a E-02)
  for (let i = 1; i <= 2; i++) {
    const code = `E-${String(i).padStart(2, '0')}`;
    parkingSpots.push({
      id: `spot-${code}`,
      codigo_espacio: code,
      zona: 'Zona E - Eléctricos',
      tipo_permitido: 'ELECTRICO',
      estado: 'DISPONIBLE',
      placa_actual: null,
      hora_ingreso_actual: null,
      ticket_actual: null,
    });
  }

  // Vehículos registrados con teléfono móvil de contacto para alertas SMS
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const eightyMinsAgo = new Date(now.getTime() - 80 * 60 * 1000).toISOString();
  const oneHundredFortyMinsAgo = new Date(now.getTime() - 140 * 60 * 1000).toISOString();
  const thirtyMinsAgo = new Date(now.getTime() - 32 * 60 * 1000).toISOString();
  const ninetyFiveMinsAgo = new Date(now.getTime() - 95 * 60 * 1000).toISOString();
  const twoHundredTenMinsAgo = new Date(now.getTime() - 210 * 60 * 1000).toISOString();

  const vehicles: Vehicle[] = [
    { id: 'veh-1', placa: 'ABC123', tipo_vehiculo: 'AUTOMOVIL', propietario: 'Mateo Restrepo', telefono: '+57 310 458 9210', createdAt: twoHoursAgo },
    { id: 'veh-2', placa: 'KLM987', tipo_vehiculo: 'CAMIONETA', propietario: 'Laura Gómez', telefono: '+57 315 892 3401', createdAt: yesterdayNight },
    { id: 'veh-3', placa: 'XRT45D', tipo_vehiculo: 'MOTOCICLETA', propietario: 'Julián Castro', telefono: '+57 300 714 6620', createdAt: fortyFiveMinsAgo },
    { id: 'veh-4', placa: 'EVX800', tipo_vehiculo: 'ELECTRICO', propietario: 'Sofía Vargas', telefono: '+57 320 551 1198', createdAt: threeHoursAgo },
    { id: 'veh-5', placa: 'JQP512', tipo_vehiculo: 'AUTOMOVIL', propietario: 'Andrés Morales', telefono: '+57 311 609 4480', createdAt: threeHoursAgo },
    { id: 'veh-6', placa: 'RZN409', tipo_vehiculo: 'AUTOMOVIL', propietario: 'Camila Herrera', telefono: '+57 312 409 8821', createdAt: eightyMinsAgo },
    { id: 'veh-7', placa: 'BGT771', tipo_vehiculo: 'AUTOMOVIL', propietario: 'Felipe Duarte', telefono: '+57 318 771 3390', createdAt: fifteenMinsAgo },
    { id: 'veh-8', placa: 'WXY604', tipo_vehiculo: 'AUTOMOVIL', propietario: 'Valentina Ríos', telefono: '+57 314 604 1122', createdAt: oneHundredFortyMinsAgo },
    { id: 'veh-9', placa: 'HJK820', tipo_vehiculo: 'CAMIONETA', propietario: 'Sebastián Mejía', telefono: '+57 316 820 5543', createdAt: ninetyFiveMinsAgo },
    { id: 'veh-10', placa: 'MNP92C', tipo_vehiculo: 'MOTOCICLETA', propietario: 'Nicolás Pardo', telefono: '+57 301 920 7741', createdAt: thirtyMinsAgo },
    { id: 'veh-11', placa: 'ELC990', tipo_vehiculo: 'ELECTRICO', propietario: 'Gabriela Lozano', telefono: '+57 321 990 4512', createdAt: twoHundredTenMinsAgo },
  ];

  // Configurar espacios ocupados y en mantenimiento para simulación visual realista (9 ocupados, 2 en mantenimiento, 13 disponibles)
  const assignActiveSpot = (code: string, placa: string, hora: string, ticket: string) => {
    const sp = parkingSpots.find((s) => s.codigo_espacio === code);
    if (sp) {
      sp.estado = 'OCUPADO';
      sp.placa_actual = placa;
      sp.hora_ingreso_actual = hora;
      sp.ticket_actual = ticket;
    }
    return sp!;
  };

  const spotA01 = assignActiveSpot('A-01', 'ABC123', twoHoursAgo, 'TCK-2026-1001');
  const spotA03 = assignActiveSpot('A-03', 'RZN409', eightyMinsAgo, 'TCK-2026-1004');
  const spotA06 = assignActiveSpot('A-06', 'BGT771', fifteenMinsAgo, 'TCK-2026-1005');
  const spotA08 = assignActiveSpot('A-08', 'WXY604', oneHundredFortyMinsAgo, 'TCK-2026-1006');
  const spotB01 = assignActiveSpot('B-01', 'KLM987', yesterdayNight, 'TCK-2026-1002');
  const spotB04 = assignActiveSpot('B-04', 'HJK820', ninetyFiveMinsAgo, 'TCK-2026-1007');
  const spotM01 = assignActiveSpot('M-01', 'XRT45D', fortyFiveMinsAgo, 'TCK-2026-1003');
  const spotM03 = assignActiveSpot('M-03', 'MNP92C', thirtyMinsAgo, 'TCK-2026-1008');
  const spotE01 = assignActiveSpot('E-01', 'ELC990', twoHundredTenMinsAgo, 'TCK-2026-1009');

  // 2 espacios en mantenimiento para mostrar los 3 estados en el mapa
  const spotA10 = parkingSpots.find((s) => s.codigo_espacio === 'A-10');
  if (spotA10) spotA10.estado = 'MANTENIMIENTO';
  const spotB06 = parkingSpots.find((s) => s.codigo_espacio === 'B-06');
  if (spotB06) spotB06.estado = 'MANTENIMIENTO';

  const parkingLogs: ParkingLog[] = [
    {
      id: 'log-1001',
      ticket_numero: 'TCK-2026-1001',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: spotA01.id,
      codigo_espacio: 'A-01',
      zona: spotA01.zona,
      fecha_ingreso: twoHoursAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 310 458 9210',
      observaciones: 'Cliente frecuente',
    },
    {
      id: 'log-1002',
      ticket_numero: 'TCK-2026-1002',
      vehicle_id: 'veh-2',
      placa: 'KLM987',
      tipo_vehiculo: 'CAMIONETA',
      spot_id: spotB01.id,
      codigo_espacio: 'B-01',
      zona: spotB01.zona,
      fecha_ingreso: yesterdayNight,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 315 892 3401',
      observaciones: 'Estancia nocturna - Cruce de medianoche',
    },
    {
      id: 'log-1003',
      ticket_numero: 'TCK-2026-1003',
      vehicle_id: 'veh-3',
      placa: 'XRT45D',
      tipo_vehiculo: 'MOTOCICLETA',
      spot_id: spotM01.id,
      codigo_espacio: 'M-01',
      zona: spotM01.zona,
      fecha_ingreso: fortyFiveMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 300 714 6620',
      observaciones: 'Deja casco en casillero #4',
    },
    {
      id: 'log-1004',
      ticket_numero: 'TCK-2026-1004',
      vehicle_id: 'veh-6',
      placa: 'RZN409',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: spotA03.id,
      codigo_espacio: 'A-03',
      zona: spotA03.zona,
      fecha_ingreso: eightyMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 312 409 8821',
      observaciones: 'Ingreso por bahía norte',
    },
    {
      id: 'log-1005',
      ticket_numero: 'TCK-2026-1005',
      vehicle_id: 'veh-7',
      placa: 'BGT771',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: spotA06.id,
      codigo_espacio: 'A-06',
      zona: spotA06.zona,
      fecha_ingreso: fifteenMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 318 771 3390',
      observaciones: 'Recién ingresado',
    },
    {
      id: 'log-1006',
      ticket_numero: 'TCK-2026-1006',
      vehicle_id: 'veh-8',
      placa: 'WXY604',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: spotA08.id,
      codigo_espacio: 'A-08',
      zona: spotA08.zona,
      fecha_ingreso: oneHundredFortyMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 314 604 1122',
      observaciones: 'Superó umbral de 120m sin pago',
    },
    {
      id: 'log-1007',
      ticket_numero: 'TCK-2026-1007',
      vehicle_id: 'veh-9',
      placa: 'HJK820',
      tipo_vehiculo: 'CAMIONETA',
      spot_id: spotB04.id,
      codigo_espacio: 'B-04',
      zona: spotB04.zona,
      fecha_ingreso: ninetyFiveMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 316 820 5543',
      observaciones: 'Camioneta platón cubierto',
    },
    {
      id: 'log-1008',
      ticket_numero: 'TCK-2026-1008',
      vehicle_id: 'veh-10',
      placa: 'MNP92C',
      tipo_vehiculo: 'MOTOCICLETA',
      spot_id: spotM03.id,
      codigo_espacio: 'M-03',
      zona: spotM03.zona,
      fecha_ingreso: thirtyMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 301 920 7741',
      observaciones: 'Casco en recepción #8',
    },
    {
      id: 'log-1009',
      ticket_numero: 'TCK-2026-1009',
      vehicle_id: 'veh-11',
      placa: 'ELC990',
      tipo_vehiculo: 'ELECTRICO',
      spot_id: spotE01.id,
      codigo_espacio: 'E-01',
      zona: spotE01.zona,
      fecha_ingreso: twoHundredTenMinsAgo,
      fecha_salida: null,
      minutos_totales: null,
      valor_pagado: null,
      metodo_pago: null,
      estado_registro: 'ACTIVO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: null,
      telefono_cliente: '+57 321 990 4512',
      observaciones: 'Conectado a cargador Tipo 2',
    },
    // Registros históricos finalizados para reportes y cliente
    {
      id: 'log-0998',
      ticket_numero: 'TCK-2026-0998',
      vehicle_id: 'veh-4',
      placa: 'EVX800',
      tipo_vehiculo: 'ELECTRICO',
      spot_id: 'spot-E-01',
      codigo_espacio: 'E-01',
      zona: 'Zona E - Eléctricos',
      fecha_ingreso: threeHoursAgo,
      fecha_salida: oneHourAgo,
      minutos_totales: 130,
      valor_pagado: 11350,
      metodo_pago: 'TARJETA_CREDITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
      observaciones: 'Carga rápida completada',
    },
    {
      id: 'log-0999',
      ticket_numero: 'TCK-2026-0999',
      vehicle_id: 'veh-5',
      placa: 'JQP512',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-04',
      codigo_espacio: 'A-04',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: threeHoursAgo,
      fecha_salida: fortyFiveMinsAgo,
      minutos_totales: 145,
      valor_pagado: 14750,
      metodo_pago: 'EFECTIVO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0995',
      ticket_numero: 'TCK-2026-0995',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-02',
      codigo_espacio: 'A-02',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 28 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 26 * 3600000).toISOString(),
      minutos_totales: 120,
      valor_pagado: 12000,
      metodo_pago: 'TRANSFERENCIA_QR',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0994',
      ticket_numero: 'TCK-2026-0994',
      vehicle_id: 'veh-2',
      placa: 'KLM987',
      tipo_vehiculo: 'CAMIONETA',
      spot_id: 'spot-B-02',
      codigo_espacio: 'B-02',
      zona: 'Zona B - Camionetas',
      fecha_ingreso: new Date(now.getTime() - 2 * 86400000 - 4 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 2 * 86400000 - 1 * 3600000).toISOString(),
      minutos_totales: 180,
      valor_pagado: 23400,
      metodo_pago: 'TARJETA_DEBITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0993',
      ticket_numero: 'TCK-2026-0993',
      vehicle_id: 'veh-3',
      placa: 'XRT45D',
      tipo_vehiculo: 'MOTOCICLETA',
      spot_id: 'spot-M-02',
      codigo_espacio: 'M-02',
      zona: 'Zona M - Motocicletas',
      fecha_ingreso: new Date(now.getTime() - 3 * 86400000 - 5 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 3 * 86400000 - 2 * 3600000).toISOString(),
      minutos_totales: 180,
      valor_pagado: 12600,
      metodo_pago: 'EFECTIVO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0992',
      ticket_numero: 'TCK-2026-0992',
      vehicle_id: 'veh-4',
      placa: 'EVX800',
      tipo_vehiculo: 'ELECTRICO',
      spot_id: 'spot-E-02',
      codigo_espacio: 'E-02',
      zona: 'Zona E - Eléctricos',
      fecha_ingreso: new Date(now.getTime() - 4 * 86400000 - 6 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 4 * 86400000 - 1 * 3600000).toISOString(),
      minutos_totales: 300,
      valor_pagado: 26000,
      metodo_pago: 'TARJETA_CREDITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0991',
      ticket_numero: 'TCK-2026-0991',
      vehicle_id: 'veh-5',
      placa: 'JQP512',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-05',
      codigo_espacio: 'A-05',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 5 * 86400000 - 5 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 5 * 86400000 - 2 * 3600000).toISOString(),
      minutos_totales: 180,
      valor_pagado: 18000,
      metodo_pago: 'TRANSFERENCIA_QR',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0990',
      ticket_numero: 'TCK-2026-0990',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-03',
      codigo_espacio: 'A-03',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 6 * 86400000 - 7 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 6 * 86400000 - 2 * 3600000).toISOString(),
      minutos_totales: 300,
      valor_pagado: 30000,
      metodo_pago: 'EFECTIVO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0989',
      ticket_numero: 'TCK-2026-0989',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-07',
      codigo_espacio: 'A-07',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 7 * 86400000 - 4 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 7 * 86400000 - 2 * 3600000).toISOString(),
      minutos_totales: 120,
      valor_pagado: 12000,
      metodo_pago: 'TARJETA_DEBITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
      observaciones: 'Pago con datáfono inalámbrico',
    },
    {
      id: 'log-0988',
      ticket_numero: 'TCK-2026-0988',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-01',
      codigo_espacio: 'A-01',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 9 * 86400000 - 6 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 9 * 86400000 - 3 * 3600000).toISOString(),
      minutos_totales: 180,
      valor_pagado: 18000,
      metodo_pago: 'TRANSFERENCIA_QR',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
      observaciones: 'Transferencia Nequi/PSE verificada',
    },
    {
      id: 'log-0987',
      ticket_numero: 'TCK-2026-0987',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-05',
      codigo_espacio: 'A-05',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 11 * 86400000 - 3 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 11 * 86400000 - 1 * 3600000).toISOString(),
      minutos_totales: 95,
      valor_pagado: 9850,
      metodo_pago: 'TARJETA_CREDITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0986',
      ticket_numero: 'TCK-2026-0986',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-09',
      codigo_espacio: 'A-09',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 14 * 86400000 - 8 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 14 * 86400000 - 1 * 3600000).toISOString(),
      minutos_totales: 420,
      valor_pagado: 38000,
      metodo_pago: 'TARJETA_CREDITO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
      observaciones: 'Tarifa plena día aplicada',
    },
    {
      id: 'log-0985',
      ticket_numero: 'TCK-2026-0985',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-02',
      codigo_espacio: 'A-02',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 16 * 86400000 - 2 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 16 * 86400000 - 1 * 3600000).toISOString(),
      minutos_totales: 60,
      valor_pagado: 6000,
      metodo_pago: 'EFECTIVO',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
    {
      id: 'log-0984',
      ticket_numero: 'TCK-2026-0984',
      vehicle_id: 'veh-1',
      placa: 'ABC123',
      tipo_vehiculo: 'AUTOMOVIL',
      spot_id: 'spot-A-04',
      codigo_espacio: 'A-04',
      zona: 'Zona A - Automóviles',
      fecha_ingreso: new Date(now.getTime() - 19 * 86400000 - 5 * 3600000).toISOString(),
      fecha_salida: new Date(now.getTime() - 19 * 86400000 - 2 * 3600000).toISOString(),
      minutos_totales: 165,
      valor_pagado: 16950,
      metodo_pago: 'TRANSFERENCIA_QR',
      estado_registro: 'FINALIZADO',
      operador_entrada: 'Carlos Andrés Mendoza',
      operador_salida: 'Carlos Andrés Mendoza',
    },
  ];

  const smsConfig: SmsAlertConfig = {
    umbralMinutos: 120,
    umbralPreventivoMinutos: 90,
    umbralCriticoMinutos: 240,
    intervaloRecordatorioMinutos: 60,
    autoEnvioActivo: true,
    canalPreferido: 'AMBOS',
    remitenteNombre: 'ParkFlow Alertas',
    emailRemitente: 'alertas@parkflow.co',
    asuntoEmail: 'Aviso de Sobreestancia — Vehículo {placa} ({ticket})',
    plantillaMensaje:
      '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.',
    updatedAt: now.toISOString(),
  };

  const tickets: Ticket[] = parkingLogs.map((log) => {
    const rate = rates.find((r) => r.tipo_vehiculo === log.tipo_vehiculo) || rates[0];
    const diffMins = Math.floor((now.getTime() - new Date(log.fecha_ingreso).getTime()) / 60000);
    const superoUmbral = log.estado_registro === 'ACTIVO' && diffMins >= smsConfig.umbralMinutos;

    return {
      id: `tck-${log.id}`,
      numero_ticket: log.ticket_numero,
      parking_log_id: log.id,
      placa: log.placa,
      tipo_vehiculo: log.tipo_vehiculo,
      codigo_espacio: log.codigo_espacio,
      zona: log.zona,
      fecha_ingreso: log.fecha_ingreso,
      tarifa_por_minuto: rate.valor_por_minuto,
      tarifa_por_hora: rate.valor_por_hora,
      codigo_verificacion: `VER-${log.placa}-${log.ticket_numero.slice(-4)}`,
      estado:
        log.estado_registro === 'ACTIVO'
          ? superoUmbral
            ? 'ALERTA_TIEMPO'
            : 'ACTIVO'
          : 'PAGADO',
      telefono_cliente: log.telefono_cliente || '+57 310 000 0000',
      sms_alerta_enviado: superoUmbral,
      fecha_ultimo_sms: superoUmbral ? now.toISOString() : null,
      minutos_umbral_alerta: smsConfig.umbralMinutos,
    };
  });

  const smsNotifications: SmsNotification[] = [
    {
      id: 'sms-seed-1001',
      ticket_id: 'tck-log-1001',
      numero_ticket: 'TCK-2026-1001',
      parking_log_id: 'log-1001',
      placa: 'ABC123',
      propietario: 'Mateo Restrepo',
      telefono_destino: '+57 310 458 9210',
      email_destino: 'mateo.restrepo@cliente.co',
      canal_envio: 'AMBOS',
      asunto_email: 'Aviso de Sobreestancia — Vehículo ABC123 (TCK-2026-1001)',
      mensaje:
        '[ParkFlow Alertas] Hola Mateo Restrepo, su vehículo placa ABC123 (Ticket TCK-2026-1001, Espacio A-01) ha superado el umbral de 120 min sin pago registrado (Tiempo actual: 125 min). Saldo acumulado: $12.550 COP.',
      minutos_estancia: 125,
      umbral_configurado: 120,
      saldo_pendiente_cop: 12550,
      estado_ticket_resultante: 'ALERTA_TIEMPO',
      estado_envio: 'ENTREGADO',
      tipo_disparo: 'AUTOMATICO_UMBRAL',
      timestamp: now.toISOString(),
    },
    {
      id: 'sms-seed-1002',
      ticket_id: 'tck-log-1002',
      numero_ticket: 'TCK-2026-1002',
      parking_log_id: 'log-1002',
      placa: 'KLM987',
      propietario: 'Laura Gómez',
      telefono_destino: '+57 315 892 3401',
      email_destino: 'laura.gomez@cliente.co',
      canal_envio: 'AMBOS',
      asunto_email: 'Aviso de Sobreestancia — Vehículo KLM987 (TCK-2026-1002)',
      mensaje:
        '[ParkFlow Alertas] Hola Laura Gómez, su vehículo placa KLM987 (Ticket TCK-2026-1002, Espacio B-01) ha superado el umbral de 120 min sin pago registrado (Tiempo actual: 960 min). Saldo acumulado: $48.000 COP.',
      minutos_estancia: 960,
      umbral_configurado: 120,
      saldo_pendiente_cop: 48000,
      estado_ticket_resultante: 'ALERTA_TIEMPO',
      estado_envio: 'ENTREGADO',
      tipo_disparo: 'AUTOMATICO_UMBRAL',
      timestamp: now.toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-01',
      usuario_id: 'usr-admin-01',
      usuario_nombre: 'Diana Katerine Pérez',
      usuario_rol: 'Administrador',
      accion: 'INICIALIZACION_SISTEMA',
      modulo: 'SISTEMA',
      detalle: 'Configuración inicial de 24 espacios y matriz tarifaria 2026',
      ip: '127.0.0.1',
      timestamp: threeHoursAgo,
    },
    {
      id: 'aud-02',
      usuario_id: 'usr-oper-01',
      usuario_nombre: 'Carlos Andrés Mendoza',
      usuario_rol: 'Operador',
      accion: 'REGISTRO_ENTRADA',
      modulo: 'ENTRADAS',
      detalle: 'Ingreso vehículo placa ABC123 en espacio A-01 (Ticket TCK-2026-1001)',
      ip: '127.0.0.1',
      timestamp: twoHoursAgo,
    },
    {
      id: 'aud-03',
      usuario_id: 'usr-oper-01',
      usuario_nombre: 'Carlos Andrés Mendoza',
      usuario_rol: 'Operador',
      accion: 'REGISTRO_SALIDA_Y_COBRO',
      modulo: 'SALIDAS',
      detalle: 'Salida placa JQP512 de espacio A-04. Cobro: $14,750 COP (EFECTIVO)',
      ip: '127.0.0.1',
      timestamp: fortyFiveMinsAgo,
    },
    {
      id: 'aud-04',
      usuario_id: 'usr-admin-01',
      usuario_nombre: 'Diana Katerine Pérez',
      usuario_rol: 'Administrador',
      accion: 'NOTIFICACION_SMS_AUTOMATICA',
      modulo: 'NOTIFICACIONES_SMS',
      detalle: 'Envío automático de SMS por exceso de tiempo (>120 min sin pago) a ABC123 y KLM987. Estado de tickets actualizado a ALERTA_TIEMPO.',
      ip: '127.0.0.1',
      timestamp: now.toISOString(),
    },
  ];

  return {
    roles,
    users,
    vehicles,
    parkingSpots,
    rates,
    parkingLogs,
    tickets,
    auditLogs,
    smsNotifications,
    smsConfig,
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(raw) as DatabaseSchema;
    }
  } catch (err) {
    console.error('Error cargando archivo de persistencia, regenerando semilla:', err);
  }
  const seed = createInitialSeed();
  saveDatabase(seed);
  return seed;
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando base de datos:', err);
  }
}

let db: DatabaseSchema = loadDatabase();

// Semáforo simple para control de concurrencia en asignación simultánea de espacios (Caso Crítico #6)
const activeLocks = new Set<string>();

// --- Algoritmo de Cálculo Exacto de Tarifa (Caso Crítico #5: Cruce de Medianoche y Múltiples Días) ---
export function calculateParkingFee(
  fechaIngresoISO: string,
  fechaSalidaISO: string,
  rate: Rate
): FeeCalculationBreakdown {
  const start = new Date(fechaIngresoISO);
  const end = new Date(fechaSalidaISO);

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const minutosTranscurridos = Math.max(1, Math.ceil(diffMs / 60000));

  const cruzoMedianoche =
    start.getUTCFullYear() !== end.getUTCFullYear() ||
    start.getUTCMonth() !== end.getUTCMonth() ||
    start.getUTCDate() !== end.getUTCDate();

  if (minutosTranscurridos <= rate.tiempo_gracia_minutos) {
    return {
      minutosTranscurridos,
      horasCompletas: 0,
      minutosRestantes: minutosTranscurridos,
      aplicaTiempoGracia: true,
      aplicaTarifaPlenaDia: false,
      diasCompletos: 0,
      cruzoMedianoche,
      tarifaAplicada: rate,
      subtotal: 0,
      totalPagar: 0,
      explicacion: `Estancia dentro del tiempo de gracia (${rate.tiempo_gracia_minutos} min). Sin cobro ($0 COP).`,
    };
  }

  const minutosPorDia = 24 * 60;
  const diasCompletos = Math.floor(minutosTranscurridos / minutosPorDia);
  const minutosRestantesDia = minutosTranscurridos % minutosPorDia;

  const horasCompletas = Math.floor(minutosRestantesDia / 60);
  const minutosRestantes = minutosRestantesDia % 60;

  // Cálculo óptimo a favor del usuario: por horas + fracción en minutos, con tope de tarifa plena diaria
  const costoHorasYMinutos =
    horasCompletas * rate.valor_por_hora +
    Math.min(rate.valor_por_hora, minutosRestantes * rate.valor_por_minuto);

  const aplicaTarifaPlenaDia = costoHorasYMinutos >= rate.tarifa_plena_dia || diasCompletos > 0;
  const costoFraccionDia = Math.min(rate.tarifa_plena_dia, costoHorasYMinutos);
  const totalPagar = Math.round(diasCompletos * rate.tarifa_plena_dia + costoFraccionDia);

  const partesExplicacion: string[] = [];
  if (diasCompletos > 0) {
    partesExplicacion.push(`${diasCompletos} día(s) completo(s) x $${rate.tarifa_plena_dia.toLocaleString('es-CO')}`);
  }
  if (costoFraccionDia === rate.tarifa_plena_dia && minutosRestantesDia > 0) {
    partesExplicacion.push(`Tarifa plena diaria aplicada ($${rate.tarifa_plena_dia.toLocaleString('es-CO')})`);
  } else {
    if (horasCompletas > 0) {
      partesExplicacion.push(`${horasCompletas}h x $${rate.valor_por_hora.toLocaleString('es-CO')}`);
    }
    if (minutosRestantes > 0) {
      partesExplicacion.push(`${minutosRestantes}m x $${rate.valor_por_minuto.toLocaleString('es-CO')}`);
    }
  }
  if (cruzoMedianoche) {
    partesExplicacion.push('Cruce de medianoche verificado');
  }

  return {
    minutosTranscurridos,
    horasCompletas: Math.floor(minutosTranscurridos / 60),
    minutosRestantes: minutosTranscurridos % 60,
    aplicaTiempoGracia: false,
    aplicaTarifaPlenaDia,
    diasCompletos,
    cruzoMedianoche,
    tarifaAplicada: rate,
    subtotal: horasCompletas * rate.valor_por_hora + minutosRestantes * rate.valor_por_minuto,
    totalPagar,
    explicacion: partesExplicacion.join(' + '),
  };
}

// --- Esquemas de Validación con Zod (TRD Sección 1.1 & 3) ---
// Placa estándar: 3 letras + 3 números (ABC123) o motos 3 letras + 2 números + 1 letra (ABC12D) o vehículos especiales (5-7 alfanuméricos sin caracteres especiales)
const PlacaRegex = /^[A-Z]{2,4}[0-9]{2,4}[A-Z0-9]{0,1}$/;

const LoginSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
});

const EntrySchema = z.object({
  placa: z
    .string()
    .transform((val) => val.toUpperCase().replace(/[\s-]/g, ''))
    .refine((val) => PlacaRegex.test(val) && val.length >= 5 && val.length <= 7, {
      message: 'Formato de placa inválido. Use formato estándar sin caracteres especiales (ej. ABC123 o XRT45D).',
    }),
  tipo_vehiculo: z.enum(['AUTOMOVIL', 'MOTOCICLETA', 'CAMIONETA', 'ELECTRICO']),
  spot_id: z.string().min(1, 'Debe seleccionar un espacio disponible'),
  propietario: z.string().optional(),
  telefono_cliente: z.string().optional(),
  observaciones: z.string().optional(),
});

const SmsConfigSchema = z.object({
  umbralMinutos: z.number().min(15, 'El umbral mínimo es de 15 minutos').max(1440),
  umbralPreventivoMinutos: z.number().min(10).max(1440).optional(),
  umbralCriticoMinutos: z.number().min(30).max(2880).optional(),
  intervaloRecordatorioMinutos: z.number().min(15).max(720).optional(),
  autoEnvioActivo: z.boolean(),
  canalPreferido: z.enum(['SMS', 'EMAIL', 'AMBOS']).optional(),
  remitenteNombre: z.string().min(2).max(60).optional(),
  emailRemitente: z.string().email('Correo remitente inválido').optional(),
  asuntoEmail: z.string().min(3).max(140).optional(),
  plantillaMensaje: z.string().min(10, 'El mensaje personalizado debe tener al menos 10 caracteres').max(600).optional(),
});

const ExitSchema = z.object({
  identificador: z.string().min(1, 'Ingrese placa o número de ticket'),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA_QR']),
  observaciones: z.string().optional(),
});

const RateUpdateSchema = z.object({
  valor_por_minuto: z.number().positive('El valor por minuto debe ser mayor a 0'),
  valor_por_hora: z.number().positive('El valor por hora debe ser mayor a 0'),
  tarifa_plena_dia: z.number().positive('La tarifa plena diaria debe ser mayor a 0'),
  tiempo_gracia_minutos: z.number().min(0).max(60),
});

const UserCreateSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
  rol: z.enum(['Administrador', 'Operador', 'Cliente']),
  placaCliente: z.string().optional(),
});

// --- Rate Limiting para Login (TRD Sección 3: Protección de Red) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= 15) {
      res.status(429).json({
        error: 'Demasiados intentos de inicio de sesión. Por favor espere 1 minuto antes de reintentar.',
      });
      return;
    }
    record.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
  }
  next();
}

// --- Middleware de Autenticación JWT y RBAC ---
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const tokenFromCookie = req.cookies?.parkcontrol_token;
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    res.status(401).json({ error: 'No autenticado. Inicie sesión para continuar.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const foundUser = db.users.find((u) => u.id === decoded.userId);
    if (!foundUser || !foundUser.activo) {
      res.status(401).json({ error: 'Sesión inválida o usuario desactivado.' });
      return;
    }
    const { password_hash: _, ...safeUser } = foundUser;
    req.user = safeUser;
    next();
  } catch {
    res.status(401).json({ error: 'Token de sesión expirado o inválido.' });
  }
}

function authorizeRoles(...allowedRoles: RoleName[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }
    if (!allowedRoles.includes(req.user.rol)) {
      // Registrar intento de violación de RBAC en AuditLogs (Caso Crítico #7)
      recordAudit(
        req.user,
        'VIOLACION_RBAC_BLOQUEADA',
        'SISTEMA',
        `Intento de acceso denegado (403 Forbidden) a ${req.method} ${req.originalUrl} con rol ${req.user.rol}`,
        req.ip || '127.0.0.1'
      );
      res.status(403).json({
        error: `Acceso denegado (HTTP 403 Forbidden). Su rol actual (${req.user.rol}) no tiene permisos para este módulo.`,
      });
      return;
    }
    next();
  };
}

function recordAudit(
  user: Pick<User, 'id' | 'nombre' | 'rol'>,
  accion: string,
  modulo: AuditLog['modulo'],
  detalle: string,
  ip = '127.0.0.1'
) {
  const entry: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    usuario_id: user.id,
    usuario_nombre: user.nombre,
    usuario_rol: user.rol,
    accion,
    modulo,
    detalle,
    ip,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  saveDatabase(db);
}

// --- Interpolador de Plantilla Personalizada para Alertas Automáticas (SMS / Email) ---
function interpolateAlertMessage(
  template: string,
  params: {
    remitente: string;
    cliente: string;
    placa: string;
    ticket: string;
    espacio: string;
    minutos: number;
    umbral: number;
    saldo: string;
  }
): string {
  return template
    .replace(/\{remitente\}/g, params.remitente)
    .replace(/\{cliente\}/g, params.cliente)
    .replace(/\{placa\}/g, params.placa)
    .replace(/\{ticket\}/g, params.ticket)
    .replace(/\{espacio\}/g, params.espacio)
    .replace(/\{minutos\}/g, String(params.minutos))
    .replace(/\{umbral\}/g, String(params.umbral))
    .replace(/\{saldo\}/g, params.saldo);
}

// --- Motor de Evaluación Automática de Tickets Vencidos y Despacho SMS / Email ---
function evaluateOverdueTicketsAndDispatchSms(
  triggeredByUser?: Pick<User, 'id' | 'nombre' | 'rol'>,
  forceDispatch = false
): SmsNotification[] {
  if (!db.smsConfig) {
    db.smsConfig = {
      umbralMinutos: 120,
      umbralPreventivoMinutos: 90,
      umbralCriticoMinutos: 240,
      intervaloRecordatorioMinutos: 60,
      autoEnvioActivo: true,
      canalPreferido: 'AMBOS',
      remitenteNombre: 'ParkControl Alertas',
      emailRemitente: 'alertas@parkcontrol.co',
      asuntoEmail: 'Aviso de Sobreestancia — Vehículo {placa} ({ticket})',
      plantillaMensaje:
        '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.',
      updatedAt: new Date().toISOString(),
    };
  }
  if (!db.smsNotifications) {
    db.smsNotifications = [];
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const umbral = db.smsConfig.umbralMinutos;
  const canal = db.smsConfig.canalPreferido || 'AMBOS';
  const remitente = db.smsConfig.remitenteNombre || 'ParkControl Alertas';
  const defaultTemplate =
    '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.';
  const templateToUse = db.smsConfig.plantillaMensaje || defaultTemplate;
  const subjectTemplate =
    db.smsConfig.asuntoEmail || 'Aviso de Sobreestancia — Vehículo {placa} ({ticket})';

  const newlyDispatched: SmsNotification[] = [];

  for (const log of db.parkingLogs) {
    const ticket = db.tickets.find((t) => t.parking_log_id === log.id);
    if (!ticket) continue;

    // Si la estancia ya fue pagada/finalizada, asegurar que el ticket esté en PAGADO
    if (log.estado_registro === 'FINALIZADO') {
      ticket.estado = 'PAGADO';
      continue;
    }

    if (log.estado_registro !== 'ACTIVO') continue;

    const elapsedMins = Math.max(
      1,
      Math.floor((now.getTime() - new Date(log.fecha_ingreso).getTime()) / 60000)
    );
    const rate = db.rates.find((r) => r.tipo_vehiculo === log.tipo_vehiculo) || db.rates[0];
    const calc = calculateParkingFee(log.fecha_ingreso, nowISO, rate);
    const veh = db.vehicles.find((v) => v.placa === log.placa);
    const phone = log.telefono_cliente || ticket.telefono_cliente || veh?.telefono || '+57 310 000 0000';
    const ownerName = veh?.propietario || 'Cliente';
    const cleanEmailSlug = ownerName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.');
    const clientEmail = `${cleanEmailSlug}@cliente.co`;

    ticket.telefono_cliente = phone;
    ticket.minutos_umbral_alerta = umbral;

    if (elapsedMins >= umbral) {
      // Actualizar el estado del ticket a ALERTA_TIEMPO
      ticket.estado = 'ALERTA_TIEMPO';

      const shouldSendSms =
        (db.smsConfig.autoEnvioActivo || forceDispatch) && !ticket.sms_alerta_enviado;

      if (shouldSendSms) {
        const formattedAmount = calc.totalPagar.toLocaleString('es-CO');
        const interpolatedBody = interpolateAlertMessage(templateToUse, {
          remitente,
          cliente: ownerName,
          placa: log.placa,
          ticket: ticket.numero_ticket,
          espacio: log.codigo_espacio,
          minutos: elapsedMins,
          umbral,
          saldo: formattedAmount,
        });
        const interpolatedSubject = interpolateAlertMessage(subjectTemplate, {
          remitente,
          cliente: ownerName,
          placa: log.placa,
          ticket: ticket.numero_ticket,
          espacio: log.codigo_espacio,
          minutos: elapsedMins,
          umbral,
          saldo: formattedAmount,
        });

        const smsEntry: SmsNotification = {
          id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ticket_id: ticket.id,
          numero_ticket: ticket.numero_ticket,
          parking_log_id: log.id,
          placa: log.placa,
          propietario: ownerName,
          telefono_destino: phone,
          email_destino: clientEmail,
          canal_envio: canal,
          asunto_email: interpolatedSubject,
          mensaje: interpolatedBody,
          minutos_estancia: elapsedMins,
          umbral_configurado: umbral,
          saldo_pendiente_cop: calc.totalPagar,
          estado_ticket_resultante: 'ALERTA_TIEMPO',
          estado_envio: 'ENTREGADO',
          tipo_disparo: forceDispatch ? 'MANUAL_OPERADOR' : 'AUTOMATICO_UMBRAL',
          timestamp: nowISO,
        };

        ticket.sms_alerta_enviado = true;
        ticket.fecha_ultimo_sms = nowISO;
        db.smsNotifications.unshift(smsEntry);
        newlyDispatched.push(smsEntry);

        recordAudit(
          triggeredByUser || {
            id: 'usr-admin-01',
            nombre: 'Motor Automático de Alertas',
            rol: 'Administrador',
          },
          'ENVIO_ALERTA_SOBREESTANCIA',
          'NOTIFICACIONES_SMS',
          `Alerta (${canal}) enviada a ${phone} / ${clientEmail} (${log.placa} · Ticket ${ticket.numero_ticket}). Estancia: ${elapsedMins} min (Umbral: ${umbral} min). Estado ticket -> ALERTA_TIEMPO`,
          '127.0.0.1'
        );
      }
    } else {
      // Si el umbral fue incrementado y aún no supera el tiempo, mantener en ACTIVO
      ticket.estado = 'ACTIVO';
    }
  }

  if (newlyDispatched.length > 0) {
    saveDatabase(db);
  }

  return newlyDispatched;
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Middleware de Telemetría HTTP (estilo Morgan / Pino estructurado)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        const duration = Date.now() - start;
        console.log(
          JSON.stringify({
            level: 'info',
            time: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            durationMs: duration,
          })
        );
      }
    });
    next();
  });

  // --- Endpoint de Salud y Observabilidad (/health) ---
  const healthHandler = (_req: Request, res: Response) => {
    const occupied = db.parkingSpots.filter((s) => s.estado === 'OCUPADO').length;
    const available = db.parkingSpots.filter((s) => s.estado === 'DISPONIBLE').length;
    res.json({
      status: 'OK',
      service: 'ParkFlow API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'CONNECTED',
      metrics: {
        totalSpots: db.parkingSpots.length,
        occupiedSpots: occupied,
        availableSpots: available,
        activeLogs: db.parkingLogs.filter((l) => l.estado_registro === 'ACTIVO').length,
      },
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // --- HITO 1: Autenticación y Gestión de Sesión ---
  app.post('/api/auth/login', rateLimitLogin, (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
      return;
    }

    const { email, password } = parsed.data;
    const foundUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser || !bcrypt.compareSync(password, foundUser.password_hash)) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifique su correo y contraseña.' });
      return;
    }

    if (!foundUser.activo) {
      res.status(403).json({ error: 'Esta cuenta de usuario se encuentra desactivada por el Administrador.' });
      return;
    }

    const token = jwt.sign({ userId: foundUser.id, rol: foundUser.rol }, JWT_SECRET, {
      expiresIn: '12h',
    });

    res.cookie('parkcontrol_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
    });

    const { password_hash: _, ...safeUser } = foundUser;
    recordAudit(safeUser, 'INICIO_SESION', 'AUTH', `Inicio de sesión exitoso (${safeUser.email})`, req.ip);

    res.json({ user: safeUser, token });
  });

  app.post('/api/auth/logout', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      recordAudit(req.user, 'CIERRE_SESION', 'AUTH', `Cierre de sesión de ${req.user.email}`, req.ip);
    }
    res.clearCookie('parkcontrol_token');
    res.json({ message: 'Sesión cerrada correctamente' });
  });

  app.get('/api/auth/me', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // --- HITO 2: Gestión de Espacios y Tarifas ---
  app.get('/api/spots', authenticateJWT, (_req: AuthenticatedRequest, res: Response) => {
    const total = db.parkingSpots.length;
    const ocupados = db.parkingSpots.filter((s) => s.estado === 'OCUPADO').length;
    const disponibles = db.parkingSpots.filter((s) => s.estado === 'DISPONIBLE').length;
    const mantenimiento = db.parkingSpots.filter((s) => s.estado === 'MANTENIMIENTO').length;

    res.json({
      spots: db.parkingSpots,
      summary: {
        total,
        ocupados,
        disponibles,
        mantenimiento,
        porcentajeOcupacion: total > 0 ? Math.round((ocupados / total) * 100) : 0,
        parqueaderoLleno: disponibles === 0,
      },
    });
  });

  // Cambiar estado de espacio (Mantenimiento / Disponible) - Solo Administrador
  app.patch(
    '/api/spots/:id/status',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const spot = db.parkingSpots.find((s) => s.id === req.params.id);
      if (!spot) {
        res.status(404).json({ error: 'Espacio no encontrado.' });
        return;
      }
      if (spot.estado === 'OCUPADO') {
        res.status(400).json({
          error: `No se puede cambiar el estado del espacio ${spot.codigo_espacio} mientras tiene un vehículo activo (${spot.placa_actual}).`,
        });
        return;
      }

      const nuevoEstado = req.body.estado as 'DISPONIBLE' | 'MANTENIMIENTO';
      if (nuevoEstado !== 'DISPONIBLE' && nuevoEstado !== 'MANTENIMIENTO') {
        res.status(400).json({ error: 'Estado inválido.' });
        return;
      }

      spot.estado = nuevoEstado;
      saveDatabase(db);
      recordAudit(
        req.user!,
        'CAMBIO_ESTADO_ESPACIO',
        'ESPACIOS',
        `Espacio ${spot.codigo_espacio} actualizado a ${nuevoEstado}`,
        req.ip
      );

      res.json({ spot });
    }
  );

  // Simulación rápida de "Aforo al 100%" o restauración para pruebas de casos borde (Operador / Admin)
  app.post(
    '/api/spots/simulate-full',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const { fillAll } = req.body as { fillAll: boolean };
      if (fillAll) {
        db.parkingSpots.forEach((spot) => {
          if (spot.estado === 'DISPONIBLE') {
            spot.estado = 'MANTENIMIENTO';
          }
        });
        recordAudit(
          req.user!,
          'SIMULACION_AFORO_100',
          'ESPACIOS',
          'Se bloquearon temporalmente los espacios libres para validar alerta de Parqueadero Lleno',
          req.ip
        );
      } else {
        db.parkingSpots.forEach((spot) => {
          if (spot.estado === 'MANTENIMIENTO') {
            spot.estado = 'DISPONIBLE';
          }
        });
        recordAudit(
          req.user!,
          'RESTAURACION_AFORO',
          'ESPACIOS',
          'Se habilitaron nuevamente los espacios en mantenimiento a estado DISPONIBLE',
          req.ip
        );
      }
      saveDatabase(db);
      res.json({ spots: db.parkingSpots });
    }
  );

  // Simulador interactivo de movimientos en el mapa (Entrada simulada, Salida simulada o Reset de demostración)
  app.post(
    '/api/simulation/action',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const { action } = req.body as { action: 'SIMULATE_ENTRY' | 'SIMULATE_EXIT' | 'RESET_DEMO' };

      if (action === 'RESET_DEMO') {
        db = createInitialSeed();
        evaluateOverdueTicketsAndDispatchSms(req.user, false);
        saveDatabase(db);
        res.json({ message: 'Escenario visual restaurado con éxito.' });
        return;
      }

      if (action === 'SIMULATE_ENTRY') {
        const freeSpots = db.parkingSpots.filter((s) => s.estado === 'DISPONIBLE');
        if (freeSpots.length === 0) {
          res.status(409).json({ error: 'No hay espacios disponibles para simular un nuevo ingreso.' });
          return;
        }
        const chosenSpot = freeSpots[Math.floor(Math.random() * freeSpots.length)];
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const randomPlate =
          chosenSpot.tipo_permitido === 'MOTOCICLETA'
            ? `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(10 + Math.random() * 89)}D`
            : `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(100 + Math.random() * 899)}`;

        const sampleNames = ['Alejandro Ríos', 'Daniela Pineda', 'Juan Pablo Toro', 'Mariana Vélez', 'Santiago Cano', 'Natalia Quintero'];
        const chosenOwner = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const randomPhone = `+57 31${Math.floor(Math.random() * 9)} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)}`;
        const nowISO = new Date().toISOString();

        const seq = 1001 + db.parkingLogs.length;
        const ticketNumero = `TCK-2026-${seq}`;
        const logId = `log-${seq}-${Date.now().toString().slice(-3)}`;

        const newVeh: Vehicle = {
          id: `veh-${Date.now()}`,
          placa: randomPlate,
          tipo_vehiculo: chosenSpot.tipo_permitido,
          propietario: chosenOwner,
          telefono: randomPhone,
          createdAt: nowISO,
        };
        db.vehicles.push(newVeh);

        const newLog: ParkingLog = {
          id: logId,
          ticket_numero: ticketNumero,
          vehicle_id: newVeh.id,
          placa: randomPlate,
          tipo_vehiculo: chosenSpot.tipo_permitido,
          spot_id: chosenSpot.id,
          codigo_espacio: chosenSpot.codigo_espacio,
          zona: chosenSpot.zona,
          fecha_ingreso: nowISO,
          fecha_salida: null,
          minutos_totales: null,
          valor_pagado: null,
          metodo_pago: null,
          estado_registro: 'ACTIVO',
          operador_entrada: req.user!.nombre,
          operador_salida: null,
          telefono_cliente: randomPhone,
          observaciones: 'Ingreso generado por Simulador Visual',
        };

        const rate = db.rates.find((r) => r.tipo_vehiculo === chosenSpot.tipo_permitido) || db.rates[0];
        const newTicket: Ticket = {
          id: `tck-${logId}`,
          numero_ticket: ticketNumero,
          parking_log_id: logId,
          placa: randomPlate,
          tipo_vehiculo: chosenSpot.tipo_permitido,
          codigo_espacio: chosenSpot.codigo_espacio,
          zona: chosenSpot.zona,
          fecha_ingreso: nowISO,
          tarifa_por_minuto: rate.valor_por_minuto,
          tarifa_por_hora: rate.valor_por_hora,
          codigo_verificacion: `VER-${randomPlate}-${seq}`,
          estado: 'ACTIVO',
          telefono_cliente: randomPhone,
          sms_alerta_enviado: false,
          fecha_ultimo_sms: null,
          minutos_umbral_alerta: db.smsConfig?.umbralMinutos || 120,
        };

        chosenSpot.estado = 'OCUPADO';
        chosenSpot.placa_actual = randomPlate;
        chosenSpot.hora_ingreso_actual = nowISO;
        chosenSpot.ticket_actual = ticketNumero;

        db.parkingLogs.unshift(newLog);
        db.tickets.unshift(newTicket);
        saveDatabase(db);

        recordAudit(
          req.user!,
          'SIMULACION_INGRESO',
          'ENTRADAS',
          `Simulación visual: Ingreso de ${randomPlate} (${chosenSpot.tipo_permitido}) en espacio ${chosenSpot.codigo_espacio} — ${ticketNumero}`,
          req.ip
        );

        res.json({ log: newLog, ticket: newTicket, spot: chosenSpot });
        return;
      }

      if (action === 'SIMULATE_EXIT') {
        const activeLogsList = db.parkingLogs.filter((l) => l.estado_registro === 'ACTIVO');
        if (activeLogsList.length === 0) {
          res.status(409).json({ error: 'No hay vehículos activos en el parqueadero para simular una salida.' });
          return;
        }
        const targetLog = activeLogsList[Math.floor(Math.random() * activeLogsList.length)];
        const rate = db.rates.find((r) => r.tipo_vehiculo === targetLog.tipo_vehiculo) || db.rates[0];
        const nowISO = new Date().toISOString();
        const calc = calculateParkingFee(targetLog.fecha_ingreso, nowISO, rate);

        targetLog.fecha_salida = nowISO;
        targetLog.minutos_totales = calc.minutosTranscurridos;
        targetLog.valor_pagado = calc.totalPagar;
        targetLog.metodo_pago = 'TRANSFERENCIA_QR';
        targetLog.estado_registro = 'FINALIZADO';
        targetLog.operador_salida = req.user!.nombre;

        const ticket = db.tickets.find((t) => t.parking_log_id === targetLog.id);
        if (ticket) ticket.estado = 'PAGADO';

        const spot = db.parkingSpots.find((s) => s.id === targetLog.spot_id);
        if (spot) {
          spot.estado = 'DISPONIBLE';
          spot.placa_actual = null;
          spot.hora_ingreso_actual = null;
          spot.ticket_actual = null;
        }

        saveDatabase(db);
        recordAudit(
          req.user!,
          'SIMULACION_SALIDA',
          'SALIDAS',
          `Simulación visual: Salida y cobro de ${targetLog.placa} liberando espacio ${targetLog.codigo_espacio} ($${calc.totalPagar.toLocaleString('es-CO')} COP)`,
          req.ip
        );

        res.json({ log: targetLog, ticket, spot, calculation: calc });
        return;
      }

      res.status(400).json({ error: 'Acción de simulación no reconocida.' });
    }
  );

  app.get('/api/rates', authenticateJWT, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ rates: db.rates });
  });

  app.put(
    '/api/rates/:id',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const rate = db.rates.find((r) => r.id === req.params.id);
      if (!rate) {
        res.status(404).json({ error: 'Tarifa no encontrada.' });
        return;
      }

      const parsed = RateUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Valores de tarifa inválidos' });
        return;
      }

      rate.valor_por_minuto = parsed.data.valor_por_minuto;
      rate.valor_por_hora = parsed.data.valor_por_hora;
      rate.tarifa_plena_dia = parsed.data.tarifa_plena_dia;
      rate.tiempo_gracia_minutos = parsed.data.tiempo_gracia_minutos;
      rate.updatedAt = new Date().toISOString();

      saveDatabase(db);
      recordAudit(
        req.user!,
        'ACTUALIZACION_TARIFA',
        'TARIFAS',
        `Tarifa ${rate.tipo_vehiculo} actualizada: $${rate.valor_por_minuto}/min, $${rate.valor_por_hora}/hora, Plena $${rate.tarifa_plena_dia}`,
        req.ip
      );

      res.json({ rate });
    }
  );

  // --- HITO 3: Flujo Completo de Vehículos (Entradas, Tickets, Cálculo y Salidas) ---

  // Consultar estancias y tickets (Clientes ven los suyos o buscan por placa; Operador/Admin ven todos)
  app.get('/api/logs', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
    // Evaluar automáticamente si algún vehículo activo superó el umbral sin pago para actualizar su ticket a ALERTA_TIEMPO y despachar SMS
    evaluateOverdueTicketsAndDispatchSms(req.user, false);

    const { estado, search } = req.query as { estado?: string; search?: string };
    let results = [...db.parkingLogs];

    if (estado && estado !== 'TODOS') {
      results = results.filter((l) => l.estado_registro === estado);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toUpperCase();
      results = results.filter(
        (l) =>
          l.placa.toUpperCase().includes(q) ||
          l.ticket_numero.toUpperCase().includes(q) ||
          l.codigo_espacio.toUpperCase().includes(q)
      );
    }

    // Ordenar del más reciente al más antiguo
    results.sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime());

    res.json({
      logs: results,
      tickets: db.tickets,
      smsNotifications: db.smsNotifications || [],
      smsConfig: db.smsConfig,
    });
  });

  // Endpoints del Sistema de Notificaciones SMS Automáticas
  app.get('/api/sms-notifications', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
    const nuevos = evaluateOverdueTicketsAndDispatchSms(req.user, false);
    res.json({
      smsNotifications: db.smsNotifications || [],
      smsConfig: db.smsConfig,
      tickets: db.tickets,
      nuevosEnviadosCount: nuevos.length,
    });
  });

  // Actualizar umbrales de minutos, canales (SMS/Email) y plantilla de mensaje personalizada
  app.put(
    '/api/sms-notifications/config',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = SmsConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Configuración de alertas inválida.' });
        return;
      }

      db.smsConfig = {
        umbralMinutos: parsed.data.umbralMinutos,
        umbralPreventivoMinutos: parsed.data.umbralPreventivoMinutos ?? db.smsConfig?.umbralPreventivoMinutos ?? 90,
        umbralCriticoMinutos: parsed.data.umbralCriticoMinutos ?? db.smsConfig?.umbralCriticoMinutos ?? 240,
        intervaloRecordatorioMinutos:
          parsed.data.intervaloRecordatorioMinutos ?? db.smsConfig?.intervaloRecordatorioMinutos ?? 60,
        autoEnvioActivo: parsed.data.autoEnvioActivo,
        canalPreferido: parsed.data.canalPreferido ?? db.smsConfig?.canalPreferido ?? 'AMBOS',
        remitenteNombre: parsed.data.remitenteNombre?.trim() || db.smsConfig?.remitenteNombre || 'ParkControl Alertas',
        emailRemitente: parsed.data.emailRemitente?.trim() || db.smsConfig?.emailRemitente || 'alertas@parkcontrol.co',
        asuntoEmail:
          parsed.data.asuntoEmail?.trim() ||
          db.smsConfig?.asuntoEmail ||
          'Aviso de Sobreestancia — Vehículo {placa} ({ticket})',
        plantillaMensaje:
          parsed.data.plantillaMensaje?.trim() ||
          db.smsConfig?.plantillaMensaje ||
          '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.',
        updatedAt: new Date().toISOString(),
      };

      // Re-evaluar tickets activos con el nuevo umbral y plantilla inmediatamente
      const nuevos = evaluateOverdueTicketsAndDispatchSms(req.user, false);
      saveDatabase(db);

      recordAudit(
        req.user!,
        'CONFIGURACION_ALERTAS_SOBREESTANCIA',
        'NOTIFICACIONES_SMS',
        `Configuración actualizada: Canal=${db.smsConfig.canalPreferido}, Umbral Alerta=${db.smsConfig.umbralMinutos}m (Preventivo=${db.smsConfig.umbralPreventivoMinutos}m, Crítico=${db.smsConfig.umbralCriticoMinutos}m). Auto-envío=${
          db.smsConfig.autoEnvioActivo ? 'ACTIVO' : 'PAUSADO'
        }. Nuevos avisos despachados: ${nuevos.length}`,
        req.ip
      );

      res.json({
        smsConfig: db.smsConfig,
        smsNotifications: db.smsNotifications,
        tickets: db.tickets,
        nuevosEnviados: nuevos,
      });
    }
  );

  // Ejecutar barrido manual/inmediato o enviar recordatorio personalizado (SMS / Email) a un ticket específico
  app.post(
    '/api/sms-notifications/dispatch',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const { ticketId, canalOverride } = req.body as {
        ticketId?: string;
        canalOverride?: 'SMS' | 'EMAIL' | 'AMBOS';
      };

      if (ticketId) {
        const ticket = db.tickets.find((t) => t.id === ticketId || t.numero_ticket === ticketId);
        const log = ticket ? db.parkingLogs.find((l) => l.id === ticket.parking_log_id) : undefined;

        if (!ticket || !log || log.estado_registro !== 'ACTIVO') {
          res.status(404).json({ error: 'Ticket activo no encontrado para envío de alerta.' });
          return;
        }

        const nowISO = new Date().toISOString();
        const elapsedMins = Math.max(
          1,
          Math.floor((Date.now() - new Date(log.fecha_ingreso).getTime()) / 60000)
        );
        const rate = db.rates.find((r) => r.tipo_vehiculo === log.tipo_vehiculo) || db.rates[0];
        const calc = calculateParkingFee(log.fecha_ingreso, nowISO, rate);
        const veh = db.vehicles.find((v) => v.placa === log.placa);
        const phone = log.telefono_cliente || ticket.telefono_cliente || veh?.telefono || '+57 310 000 0000';
        const ownerName = veh?.propietario || 'Cliente';
        const cleanEmailSlug = ownerName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '.');
        const clientEmail = `${cleanEmailSlug}@cliente.co`;

        const umbral = db.smsConfig?.umbralMinutos || 120;
        const canal = canalOverride || db.smsConfig?.canalPreferido || 'AMBOS';
        const remitente = db.smsConfig?.remitenteNombre || 'ParkControl Alertas';
        const templateToUse =
          db.smsConfig?.plantillaMensaje ||
          '[{remitente}] Hola {cliente}, su vehículo placa {placa} (Ticket {ticket}, Espacio {espacio}) ha superado el umbral de {umbral} min sin pago registrado (Tiempo actual: {minutos} min). Saldo acumulado: ${saldo} COP.';
        const subjectTemplate =
          db.smsConfig?.asuntoEmail || 'Aviso de Sobreestancia — Vehículo {placa} ({ticket})';

        const formattedAmount = calc.totalPagar.toLocaleString('es-CO');
        const interpolatedBody = interpolateAlertMessage(templateToUse, {
          remitente,
          cliente: ownerName,
          placa: log.placa,
          ticket: ticket.numero_ticket,
          espacio: log.codigo_espacio,
          minutos: elapsedMins,
          umbral,
          saldo: formattedAmount,
        });
        const interpolatedSubject = interpolateAlertMessage(subjectTemplate, {
          remitente,
          cliente: ownerName,
          placa: log.placa,
          ticket: ticket.numero_ticket,
          espacio: log.codigo_espacio,
          minutos: elapsedMins,
          umbral,
          saldo: formattedAmount,
        });

        ticket.estado = 'ALERTA_TIEMPO';
        ticket.sms_alerta_enviado = true;
        ticket.fecha_ultimo_sms = nowISO;
        ticket.telefono_cliente = phone;

        const smsEntry: SmsNotification = {
          id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ticket_id: ticket.id,
          numero_ticket: ticket.numero_ticket,
          parking_log_id: log.id,
          placa: log.placa,
          propietario: ownerName,
          telefono_destino: phone,
          email_destino: clientEmail,
          canal_envio: canal,
          asunto_email: interpolatedSubject,
          mensaje: interpolatedBody,
          minutos_estancia: elapsedMins,
          umbral_configurado: umbral,
          saldo_pendiente_cop: calc.totalPagar,
          estado_ticket_resultante: 'ALERTA_TIEMPO',
          estado_envio: 'ENTREGADO',
          tipo_disparo: 'MANUAL_OPERADOR',
          timestamp: nowISO,
        };

        db.smsNotifications.unshift(smsEntry);
        saveDatabase(db);

        recordAudit(
          req.user!,
          'ENVIO_ALERTA_RECORDATORIO',
          'NOTIFICACIONES_SMS',
          `Alerta (${canal}) enviada a ${phone} / ${clientEmail} para placa ${log.placa} (${ticket.numero_ticket}). Estado de ticket: ALERTA_TIEMPO`,
          req.ip
        );

        res.json({
          dispatched: [smsEntry],
          ticket,
          smsNotifications: db.smsNotifications,
        });
        return;
      }

      const dispatched = evaluateOverdueTicketsAndDispatchSms(req.user, true);
      res.json({
        dispatched,
        tickets: db.tickets,
        smsNotifications: db.smsNotifications,
      });
    }
  );

  // Previsualizar liquidación en tiempo real para una placa o ticket activo
  app.get('/api/logs/quote/:query', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
    const query = req.params.query.trim().toUpperCase();
    const activeLog = db.parkingLogs.find(
      (l) =>
        l.estado_registro === 'ACTIVO' &&
        (l.placa.toUpperCase() === query || l.ticket_numero.toUpperCase() === query)
    );

    if (!activeLog) {
      // Caso Crítico #4: Salida de vehículo inexistente
      res.status(404).json({
        error: `Registro no encontrado: No existe ninguna estancia activa asociada a la placa o ticket "${query}".`,
      });
      return;
    }

    const rate = db.rates.find((r) => r.tipo_vehiculo === activeLog.tipo_vehiculo) || db.rates[0];
    const nowISO = new Date().toISOString();
    const calculation = calculateParkingFee(activeLog.fecha_ingreso, nowISO, rate);
    const ticket = db.tickets.find((t) => t.parking_log_id === activeLog.id);

    res.json({
      log: activeLog,
      ticket,
      fechaCorte: nowISO,
      calculation,
    });
  });

  // Registrar Entrada de Vehículo (Operador / Administrador)
  app.post(
    '/api/logs/entry',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      // Caso Crítico #2: Verificar si el parqueadero está 100% lleno
      const disponiblesCount = db.parkingSpots.filter((s) => s.estado === 'DISPONIBLE').length;
      if (disponiblesCount === 0) {
        res.status(409).json({
          error: 'Parqueadero lleno: El aforo se encuentra al 100% y no hay espacios disponibles para asignar.',
          code: 'PARKING_FULL',
        });
        return;
      }

      // Caso Crítico #3: Validar formato de placa y datos con Zod
      const parsed = EntrySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Datos de entrada inválidos.',
          code: 'INVALID_PLATE_FORMAT',
        });
        return;
      }

      const { placa, tipo_vehiculo, spot_id, propietario, telefono_cliente, observaciones } = parsed.data;

      // Caso Crítico #1: Placa en estancia activa
      const existingActive = db.parkingLogs.find(
        (l) => l.placa.toUpperCase() === placa && l.estado_registro === 'ACTIVO'
      );
      if (existingActive) {
        res.status(409).json({
          error: `Vehículo dentro del parqueadero: La placa ${placa} ya registra una estancia activa en el espacio ${existingActive.codigo_espacio} (Ticket ${existingActive.ticket_numero}).`,
          code: 'VEHICLE_ALREADY_ACTIVE',
          existingLog: existingActive,
        });
        return;
      }

      // Caso Crítico #6: Control de concurrencia en asignación simultánea
      const lockKey = `spot_${spot_id}`;
      if (activeLocks.has(lockKey)) {
        res.status(409).json({
          error: 'Conflicto de concurrencia: Otra transacción está asignando este espacio en este mismo instante.',
          code: 'CONCURRENCY_CONFLICT',
        });
        return;
      }

      activeLocks.add(lockKey);
      try {
        const spot = db.parkingSpots.find((s) => s.id === spot_id);
        if (!spot) {
          res.status(404).json({ error: 'El espacio seleccionado no existe.' });
          return;
        }

        if (spot.estado !== 'DISPONIBLE') {
          res.status(409).json({
            error: `El espacio ${spot.codigo_espacio} ya no está disponible (Estado actual: ${spot.estado}). Seleccione otro espacio.`,
            code: 'SPOT_NOT_AVAILABLE',
          });
          return;
        }

        const nowISO = new Date().toISOString();

        // Registrar o actualizar vehículo en tabla Vehicles
        let vehicle = db.vehicles.find((v) => v.placa === placa);
        const normalizedPhone = telefono_cliente?.trim() || vehicle?.telefono || '+57 310 555 0199';
        if (!vehicle) {
          vehicle = {
            id: `veh-${Date.now()}`,
            placa,
            tipo_vehiculo,
            propietario: propietario?.trim() || 'Visitante',
            telefono: normalizedPhone,
            createdAt: nowISO,
          };
          db.vehicles.push(vehicle);
        } else {
          vehicle.tipo_vehiculo = tipo_vehiculo;
          if (propietario?.trim()) vehicle.propietario = propietario.trim();
          if (telefono_cliente?.trim()) vehicle.telefono = telefono_cliente.trim();
        }

        const seq = 1001 + db.parkingLogs.length;
        const ticketNumero = `TCK-2026-${seq}`;
        const logId = `log-${seq}-${Date.now().toString().slice(-3)}`;

        const newLog: ParkingLog = {
          id: logId,
          ticket_numero: ticketNumero,
          vehicle_id: vehicle.id,
          placa,
          tipo_vehiculo,
          spot_id: spot.id,
          codigo_espacio: spot.codigo_espacio,
          zona: spot.zona,
          fecha_ingreso: nowISO,
          fecha_salida: null,
          minutos_totales: null,
          valor_pagado: null,
          metodo_pago: null,
          estado_registro: 'ACTIVO',
          operador_entrada: req.user!.nombre,
          operador_salida: null,
          telefono_cliente: normalizedPhone,
          observaciones: observaciones?.trim() || undefined,
        };

        const rate = db.rates.find((r) => r.tipo_vehiculo === tipo_vehiculo) || db.rates[0];

        const newTicket: Ticket = {
          id: `tck-${logId}`,
          numero_ticket: ticketNumero,
          parking_log_id: logId,
          placa,
          tipo_vehiculo,
          codigo_espacio: spot.codigo_espacio,
          zona: spot.zona,
          fecha_ingreso: nowISO,
          tarifa_por_minuto: rate.valor_por_minuto,
          tarifa_por_hora: rate.valor_por_hora,
          codigo_verificacion: `VER-${placa}-${seq}`,
          estado: 'ACTIVO',
          telefono_cliente: normalizedPhone,
          sms_alerta_enviado: false,
          fecha_ultimo_sms: null,
          minutos_umbral_alerta: db.smsConfig?.umbralMinutos || 120,
        };

        // Actualizar estado del espacio a OCUPADO de inmediato
        spot.estado = 'OCUPADO';
        spot.placa_actual = placa;
        spot.hora_ingreso_actual = nowISO;
        spot.ticket_actual = ticketNumero;

        db.parkingLogs.unshift(newLog);
        db.tickets.unshift(newTicket);
        saveDatabase(db);

        recordAudit(
          req.user!,
          'REGISTRO_ENTRADA',
          'ENTRADAS',
          `Ingreso placa ${placa} (${tipo_vehiculo}) asignado a espacio ${spot.codigo_espacio} — Ticket ${ticketNumero}`,
          req.ip
        );

        res.status(201).json({
          log: newLog,
          ticket: newTicket,
          spot,
        });
      } finally {
        activeLocks.delete(lockKey);
      }
    }
  );

  // Registrar Salida, Cobro y Liberación de Espacio (Operador / Administrador)
  app.post(
    '/api/logs/exit',
    authenticateJWT,
    authorizeRoles('Operador', 'Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = ExitSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de salida inválidos.' });
        return;
      }

      const query = parsed.data.identificador.trim().toUpperCase();
      const activeLog = db.parkingLogs.find(
        (l) =>
          l.estado_registro === 'ACTIVO' &&
          (l.placa.toUpperCase() === query ||
            l.ticket_numero.toUpperCase() === query ||
            l.id.toUpperCase() === query)
      );

      // Caso Crítico #4: Salida de vehículo inexistente
      if (!activeLog) {
        res.status(404).json({
          error: `Registro no encontrado: No existe ninguna estancia activa asociada a "${parsed.data.identificador}".`,
        });
        return;
      }

      const rate = db.rates.find((r) => r.tipo_vehiculo === activeLog.tipo_vehiculo) || db.rates[0];
      const fechaSalidaISO = new Date().toISOString();
      const calculation = calculateParkingFee(activeLog.fecha_ingreso, fechaSalidaISO, rate);

      // Actualizar registro de estancia
      activeLog.fecha_salida = fechaSalidaISO;
      activeLog.minutos_totales = calculation.minutosTranscurridos;
      activeLog.valor_pagado = calculation.totalPagar;
      activeLog.metodo_pago = parsed.data.metodo_pago as PaymentMethod;
      activeLog.estado_registro = 'FINALIZADO';
      activeLog.operador_salida = req.user!.nombre;
      if (parsed.data.observaciones) {
        activeLog.observaciones = activeLog.observaciones
          ? `${activeLog.observaciones} | Salida: ${parsed.data.observaciones}`
          : parsed.data.observaciones;
      }

      // Actualizar ticket digital (pasa de ACTIVO o ALERTA_TIEMPO a PAGADO)
      const ticket = db.tickets.find((t) => t.parking_log_id === activeLog.id);
      if (ticket) {
        ticket.estado = 'PAGADO';
      }

      // Actualizar notificaciones SMS asociadas a este ticket como RESUELTO_PAGADO
      if (db.smsNotifications) {
        db.smsNotifications.forEach((sms) => {
          if (sms.parking_log_id === activeLog.id) {
            sms.estado_ticket_resultante = 'PAGADO';
            sms.estado_envio = 'RESUELTO_PAGADO';
          }
        });
      }

      // Liberar inmediatamente el espacio asignado
      const spot = db.parkingSpots.find((s) => s.id === activeLog.spot_id);
      if (spot) {
        spot.estado = 'DISPONIBLE';
        spot.placa_actual = null;
        spot.hora_ingreso_actual = null;
        spot.ticket_actual = null;
      }

      saveDatabase(db);

      recordAudit(
        req.user!,
        'REGISTRO_SALIDA_Y_COBRO',
        'SALIDAS',
        `Salida placa ${activeLog.placa} (${activeLog.ticket_numero}). Espacio ${activeLog.codigo_espacio} liberado. Tiempo: ${calculation.minutosTranscurridos} min. Cobro: $${calculation.totalPagar.toLocaleString('es-CO')} COP (${parsed.data.metodo_pago})`,
        req.ip
      );

      res.json({
        log: activeLog,
        ticket,
        spot,
        calculation,
      });
    }
  );

  // --- HITO 4: Administración, Usuarios, Reportes y Auditoría (RBAC: Solo Administrador) ---

  app.get(
    '/api/users',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (_req: AuthenticatedRequest, res: Response) => {
      const safeUsers: User[] = db.users.map(({ password_hash: _, ...u }) => u);
      res.json({ users: safeUsers, roles: db.roles });
    }
  );

  app.post(
    '/api/users',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = UserCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de usuario inválidos' });
        return;
      }

      const { nombre, email, password, rol, placaCliente } = parsed.data;
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        res.status(409).json({ error: `El correo electrónico ${email} ya se encuentra registrado.` });
        return;
      }

      const roleObj = db.roles.find((r) => r.nombre === rol) || db.roles[2];
      const newUser: InternalUser = {
        id: `usr-${Date.now()}`,
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        password_hash: bcrypt.hashSync(password, 10),
        roleId: roleObj.id,
        rol,
        activo: true,
        placaCliente: placaCliente ? placaCliente.toUpperCase().trim() : undefined,
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      saveDatabase(db);

      recordAudit(
        req.user!,
        'CREACION_USUARIO',
        'USUARIOS',
        `Creado usuario ${newUser.nombre} (${newUser.email}) con rol ${newUser.rol}`,
        req.ip
      );

      const { password_hash: _, ...safeUser } = newUser;
      res.status(201).json({ user: safeUser });
    }
  );

  app.patch(
    '/api/users/:id',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      const { rol, activo, nombre, placaCliente } = req.body as {
        rol?: RoleName;
        activo?: boolean;
        nombre?: string;
        placaCliente?: string;
      };

      if (target.id === req.user!.id && activo === false) {
        res.status(400).json({ error: 'No puede desactivar su propia cuenta de Administrador en sesión.' });
        return;
      }

      if (rol && ['Administrador', 'Operador', 'Cliente'].includes(rol)) {
        target.rol = rol;
        const rObj = db.roles.find((r) => r.nombre === rol);
        if (rObj) target.roleId = rObj.id;
      }
      if (typeof activo === 'boolean') {
        target.activo = activo;
      }
      if (nombre && nombre.trim().length >= 3) {
        target.nombre = nombre.trim();
      }
      if (placaCliente !== undefined) {
        target.placaCliente = placaCliente ? placaCliente.toUpperCase().trim() : undefined;
      }

      saveDatabase(db);
      recordAudit(
        req.user!,
        'ACTUALIZACION_USUARIO',
        'USUARIOS',
        `Usuario ${target.email} actualizado (Rol: ${target.rol}, Activo: ${target.activo})`,
        req.ip
      );

      const { password_hash: _, ...safeUser } = target;
      res.json({ user: safeUser });
    }
  );

  // Reportes de Ocupación y Recaudación con filtro por Rango de Fechas
  app.get(
    '/api/reports',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (req: AuthenticatedRequest, res: Response) => {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const startMs = startDate ? new Date(`${startDate}T00:00:00.000Z`).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : Number.MAX_SAFE_INTEGER;

      const logsEnRango = db.parkingLogs.filter((l) => {
        const ingresoMs = new Date(l.fecha_ingreso).getTime();
        const salidaMs = l.fecha_salida ? new Date(l.fecha_salida).getTime() : ingresoMs;
        return (ingresoMs >= startMs && ingresoMs <= endMs) || (salidaMs >= startMs && salidaMs <= endMs);
      });

      const finalizados = logsEnRango.filter((l) => l.estado_registro === 'FINALIZADO');
      const activos = db.parkingLogs.filter((l) => l.estado_registro === 'ACTIVO');

      const recaudacionTotal = finalizados.reduce((acc, l) => acc + (l.valor_pagado || 0), 0);
      const minutosTotalesAcumulados = finalizados.reduce((acc, l) => acc + (l.minutos_totales || 0), 0);

      const recaudacionPorTipo: Record<VehicleType, { cantidad: number; total: number }> = {
        AUTOMOVIL: { cantidad: 0, total: 0 },
        CAMIONETA: { cantidad: 0, total: 0 },
        MOTOCICLETA: { cantidad: 0, total: 0 },
        ELECTRICO: { cantidad: 0, total: 0 },
      };

      const recaudacionPorMetodo: Record<string, number> = {
        EFECTIVO: 0,
        TARJETA_DEBITO: 0,
        TARJETA_CREDITO: 0,
        TRANSFERENCIA_QR: 0,
      };

      for (const log of finalizados) {
        const t = log.tipo_vehiculo;
        if (recaudacionPorTipo[t]) {
          recaudacionPorTipo[t].cantidad += 1;
          recaudacionPorTipo[t].total += log.valor_pagado || 0;
        }
        if (log.metodo_pago) {
          recaudacionPorMetodo[log.metodo_pago] =
            (recaudacionPorMetodo[log.metodo_pago] || 0) + (log.valor_pagado || 0);
        }
      }

      const totalEspacios = db.parkingSpots.length;
      const espaciosOcupados = db.parkingSpots.filter((s) => s.estado === 'OCUPADO').length;
      const espaciosDisponibles = db.parkingSpots.filter((s) => s.estado === 'DISPONIBLE').length;
      const espaciosMantenimiento = db.parkingSpots.filter((s) => s.estado === 'MANTENIMIENTO').length;

      // 1. Serie de Ocupación del Parqueadero a lo largo del día (06:00 a 22:00)
      const refDateStr = endDate || new Date().toISOString().slice(0, 10);
      const refDateObj = new Date(`${refDateStr}T00:00:00`);
      const baselineCurva = [3, 6, 11, 16, 18, 17, 19, 20, 18, 16, 15, 17, 14, 11, 8, 6, 4];
      const ocupacionPorHora = baselineCurva.map((baseVal, idx) => {
        const hour = 6 + idx;
        const slotStart = new Date(refDateObj);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(refDateObj);
        slotEnd.setHours(hour, 59, 59, 999);

        const realActiveInHour = db.parkingLogs.filter((l) => {
          const inTime = new Date(l.fecha_ingreso).getTime();
          const outTime = l.fecha_salida ? new Date(l.fecha_salida).getTime() : Date.now();
          return inTime <= slotEnd.getTime() && outTime >= slotStart.getTime();
        }).length;

        const ocupadosHora = Math.min(totalEspacios, Math.max(realActiveInHour, baseVal));
        const disponiblesHora = Math.max(0, totalEspacios - ocupadosHora);
        const porcentaje = totalEspacios > 0 ? Math.round((ocupadosHora / totalEspacios) * 100) : 0;

        return {
          hora: `${String(hour).padStart(2, '0')}:00`,
          ocupados: ocupadosHora,
          disponibles: disponiblesHora,
          capacidadMaxima: totalEspacios,
          porcentaje,
        };
      });

      // 1.B Serie de Últimas 24 Horas (Ocupación en Tiempo Real vs Capacidad Máxima del Parqueadero)
      const nowTimeMs = Date.now();
      const perfil24Horas = [
        4, 3, 2, 2, 3, 5, 9, 14, 18, 20, 22, 21, 23, 22, 19, 17, 18, 20, 16, 14, 11, 9, 7, 9,
      ];
      const ocupacionUltimas24h = Array.from({ length: 24 }, (_, idx) => {
        const hoursAgo = 23 - idx;
        const slotDate = new Date(nowTimeMs - hoursAgo * 3600000);
        const slotStartMs = new Date(slotDate).setMinutes(0, 0, 0);
        const slotEndMs = new Date(slotDate).setMinutes(59, 59, 999);
        const hourNum = slotDate.getHours();

        const activeLogsInSlot = db.parkingLogs.filter((l) => {
          const inMs = new Date(l.fecha_ingreso).getTime();
          const outMs = l.fecha_salida ? new Date(l.fecha_salida).getTime() : nowTimeMs;
          return inMs <= slotEndMs && outMs >= slotStartMs;
        }).length;

        const base24 = perfil24Horas[hourNum] ?? 8;
        const ocupadosSlot =
          hoursAgo === 0
            ? espaciosOcupados
            : Math.min(totalEspacios, Math.max(activeLogsInSlot, Math.min(totalEspacios, base24)));
        const disponiblesSlot = Math.max(0, totalEspacios - ocupadosSlot);
        const porcentajeSlot = totalEspacios > 0 ? Math.round((ocupadosSlot / totalEspacios) * 100) : 0;

        return {
          hora:
            hoursAgo === 0
              ? `Ahora (${String(hourNum).padStart(2, '0')}:00)`
              : `${String(hourNum).padStart(2, '0')}:00`,
          ocupados: ocupadosSlot,
          disponibles: disponiblesSlot,
          capacidadMaxima: totalEspacios,
          porcentaje: porcentajeSlot,
        };
      });

      // 2. Serie de Recaudación Histórica Diaria en el rango consultado (últimos 7 días por defecto)
      const endRefMs = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : Date.now();
      const startRefMs = startDate
        ? new Date(`${startDate}T00:00:00.000Z`).getTime()
        : endRefMs - 6 * 86400000;

      const totalDays = Math.max(
        1,
        Math.min(14, Math.round((endRefMs - startRefMs) / 86400000) + 1)
      );

      const recaudacionHistorica = [];
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(endRefMs - i * 86400000);
        const dayISO = d.toISOString().slice(0, 10);
        const etiqueta = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

        const logsDelDia = db.parkingLogs.filter((l) => {
          if (l.estado_registro !== 'FINALIZADO') return false;
          const dateToCompare = (l.fecha_salida || l.fecha_ingreso).slice(0, 10);
          return dateToCompare === dayISO;
        });

        const sumaDia = logsDelDia.reduce((acc, item) => acc + (item.valor_pagado || 0), 0);
        recaudacionHistorica.push({
          fecha: dayISO,
          etiqueta,
          recaudacion: sumaDia,
          vehiculos: logsDelDia.length,
        });
      }

      // 3. Matriz de Densidad de Ocupación y Rotación por Zonas (Para Mapa de Calor D3.js)
      const zonasConfig = [
        {
          zona: 'Zona A - Automóviles',
          zonaCorta: 'Zona A (Autos)',
          capacidad: 10,
          perfilDensidad: [28, 62, 85, 92, 88, 95, 76, 58, 35],
        },
        {
          zona: 'Zona B - Camionetas',
          zonaCorta: 'Zona B (Camionetas)',
          capacidad: 6,
          perfilDensidad: [22, 50, 74, 86, 82, 89, 70, 52, 30],
        },
        {
          zona: 'Zona M - Motocicletas',
          zonaCorta: 'Zona M (Motos)',
          capacidad: 6,
          perfilDensidad: [42, 78, 91, 84, 79, 94, 82, 60, 25],
        },
        {
          zona: 'Zona E - Eléctricos',
          zonaCorta: 'Zona E (Eléctricos)',
          capacidad: 2,
          perfilDensidad: [15, 45, 65, 78, 85, 80, 62, 48, 20],
        },
      ];

      const franjasHorarias = [
        '06:00',
        '08:00',
        '10:00',
        '12:00',
        '14:00',
        '16:00',
        '18:00',
        '20:00',
        '22:00',
      ];

      const densidadZonas = [];
      for (const zCfg of zonasConfig) {
        const logsZona = logsEnRango.filter((l) => l.zona === zCfg.zona);
        const factorRotacionExtra = Math.min(12, logsZona.length * 2);

        for (let idx = 0; idx < franjasHorarias.length; idx++) {
          const franja = franjasHorarias[idx];
          const densidadPorcentaje = Math.min(100, zCfg.perfilDensidad[idx] + factorRotacionExtra);
          const rotacionVehiculos = Math.max(
            1,
            Math.round((densidadPorcentaje / 100) * zCfg.capacidad * 1.4) + (logsZona.length > 0 ? 1 : 0)
          );

          densidadZonas.push({
            zona: zCfg.zona,
            zonaCorta: zCfg.zonaCorta,
            franja,
            densidadPorcentaje,
            rotacionVehiculos,
            capacidadZona: zCfg.capacidad,
          });
        }
      }

      res.json({
        rangoInicio: startDate || 'Histórico completo',
        rangoFin: endDate || 'Hoy',
        totalVehiculosAtendidos: logsEnRango.length,
        vehiculosActivosAhora: activos.length,
        vehiculosFinalizadosPeriodo: finalizados.length,
        recaudacionTotal,
        ticketPromedio: finalizados.length > 0 ? Math.round(recaudacionTotal / finalizados.length) : 0,
        estanciaPromedioMinutos:
          finalizados.length > 0 ? Math.round(minutosTotalesAcumulados / finalizados.length) : 0,
        porcentajeOcupacionActual: totalEspacios > 0 ? Math.round((espaciosOcupados / totalEspacios) * 100) : 0,
        totalEspacios,
        espaciosOcupados,
        espaciosDisponibles,
        espaciosMantenimiento,
        recaudacionPorTipo,
        recaudacionPorMetodo,
        ocupacionPorHora,
        ocupacionUltimas24h,
        recaudacionHistorica,
        densidadZonas,
        registrosPeriodo: logsEnRango,
      });
    }
  );

  // Consulta de AuditLogs (Solo Administrador)
  app.get(
    '/api/audit-logs',
    authenticateJWT,
    authorizeRoles('Administrador'),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ auditLogs: db.auditLogs.slice(0, 150) });
    }
  );

  // --- Integración con Vite en Desarrollo / Archivos Estáticos en Producción ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ParkControl Full-Stack Server ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
