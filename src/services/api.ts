/**
 * ParkFlow - Servicio de Comunicación con Backend PHP y MySQL en XAMPP
 */

import {
  AuditLog,
  ParkingLog,
  ParkingSpot,
  PaymentMethod,
  RateConfig,
  RoleType,
  UserAccount,
  VehicleType,
} from '../types/parking';

// URL del backend en XAMPP Apache
// Soporta tanto llamada directa a Apache (http://localhost/parkflow/api) como proxy de Vite (/api)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost/parkflow/api';

export interface BackendStatus {
  connected: boolean;
  service?: string;
  php_version?: string;
  mysql_version?: string;
  database?: string;
  host?: string;
  port?: number;
  records?: {
    usuarios: number;
    espacios: number;
    tarifas: number;
    tickets: number;
    auditoria: number;
  };
  server_time?: string;
  error?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error de conexión con el servidor XAMPP / PHP',
    };
  }
}

export const parkFlowApi = {
  // 1. Diagnóstico de Conexión XAMPP & MySQL
  async getStatus(): Promise<BackendStatus> {
    const res = await request<BackendStatus>('status.php');
    if (res.success && res.data) {
      return res.data;
    }
    return {
      connected: false,
      error: res.message || 'No se pudo conectar con el servidor XAMPP (Apache / MySQL).',
    };
  },

  // 2. Re-inicializar Base de Datos en MySQL
  async setupDatabase(): Promise<ApiResponse<any>> {
    return request<any>('setup.php');
  },

  // 3. Espacios / Bahías
  async getSpots(): Promise<ParkingSpot[]> {
    const res = await request<ParkingSpot[]>('spots.php');
    return res.success && Array.isArray(res.data) ? res.data : [];
  },

  async toggleSpotMaintenance(spotId: string): Promise<boolean> {
    const res = await request<any>('spots.php', {
      method: 'PUT',
      body: JSON.stringify({ id: spotId, toggleMantenimiento: true }),
    });
    return res.success;
  },

  // 4. Tarifas
  async getRates(): Promise<RateConfig[]> {
    const res = await request<RateConfig[]>('rates.php');
    return res.success && Array.isArray(res.data) ? res.data : [];
  },

  async updateRate(rate: RateConfig): Promise<boolean> {
    const res = await request<any>('rates.php', {
      method: 'PUT',
      body: JSON.stringify(rate),
    });
    return res.success;
  },

  // 5. Flujo Vehicular y Tickets
  async getTickets(): Promise<ParkingLog[]> {
    const res = await request<ParkingLog[]>('tickets.php');
    return res.success && Array.isArray(res.data) ? res.data : [];
  },

  async registerEntry(payload: {
    placa: string;
    tipoVehiculo: VehicleType;
    spotCodigo: string;
    operadorEntrada: string;
    operadorEmail?: string;
    propietarioNombre?: string;
  }): Promise<{ ok: boolean; error?: string; createdLog?: ParkingLog }> {
    const res = await request<ParkingLog>('tickets.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      return { ok: true, createdLog: res.data };
    }
    return { ok: false, error: res.message || 'Error al registrar ingreso en MySQL' };
  },

  async registerExit(payload: {
    logId: string;
    metodoPago: PaymentMethod;
    valorPagado: number;
    minutosTranscurridos: number;
    cruzoMedianoche: boolean;
    fechaSalidaISO: string;
    operadorSalida: string;
    operadorEmail?: string;
  }): Promise<{ ok: boolean; error?: string; completedLog?: ParkingLog }> {
    const res = await request<ParkingLog>('tickets.php', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      return { ok: true, completedLog: res.data };
    }
    return { ok: false, error: res.message || 'Error al procesar salida y cobro en MySQL' };
  },

  async shiftEntryTimeForMidnight(
    logId: string,
    hoursBack: number,
    operadorEmail?: string
  ): Promise<boolean> {
    const res = await request<any>('tickets.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'shift_midnight',
        logId,
        hoursBack,
        operadorEmail,
      }),
    });
    return res.success;
  },

  // 6. Usuarios y RBAC
  async getUsers(): Promise<UserAccount[]> {
    const res = await request<UserAccount[]>('users.php');
    return res.success && Array.isArray(res.data) ? res.data : [];
  },

  async loginUser(email: string): Promise<{ ok: boolean; user?: UserAccount; error?: string }> {
    const res = await request<UserAccount>('users.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email }),
    });

    if (res.success && res.data) {
      return { ok: true, user: res.data };
    }
    return { ok: false, error: res.message || 'Error en inicio de sesión' };
  },

  async createUser(
    payload: Omit<UserAccount, 'id' | 'ultimoAcceso'>,
    adminEmail?: string
  ): Promise<{ ok: boolean; error?: string; createdUser?: UserAccount }> {
    const res = await request<UserAccount>('users.php', {
      method: 'POST',
      body: JSON.stringify({ ...payload, adminEmail }),
    });

    if (res.success && res.data) {
      return { ok: true, createdUser: res.data };
    }
    return { ok: false, error: res.message || 'Error al crear usuario en MySQL' };
  },

  async updateUserRole(userId: string, rol: RoleType): Promise<boolean> {
    const res = await request<any>('users.php', {
      method: 'PUT',
      body: JSON.stringify({ id: userId, rol }),
    });
    return res.success;
  },

  async toggleUserActive(userId: string): Promise<boolean> {
    const res = await request<any>('users.php', {
      method: 'PUT',
      body: JSON.stringify({ id: userId, toggleActivo: true }),
    });
    return res.success;
  },

  // 7. Auditoría
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await request<AuditLog[]>('audit.php');
    return res.success && Array.isArray(res.data) ? res.data : [];
  },

  async logAudit(entry: Omit<AuditLog, 'id'>): Promise<void> {
    await request<any>('audit.php', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};
