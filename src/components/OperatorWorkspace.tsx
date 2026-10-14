import React, { useState, useMemo } from 'react';
import {
  Search,
  Car,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  DatabaseBackup,
  CreditCard,
  QrCode,
  Banknote,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ParkingLog,
  ParkingSpot,
  PaymentMethod,
  RateConfig,
  UserAccount,
  VehicleType,
} from '../types/parking';
import {
  calculateStayBilling,
  formatCOP,
  validateLicensePlate,
} from '../data/initialData';

interface OperatorWorkspaceProps {
  currentUser: UserAccount;
  spots: ParkingSpot[];
  logs: ParkingLog[];
  rates: RateConfig[];
  onRegisterEntry: (params: {
    placa: string;
    tipoVehiculo: VehicleType;
    spotCodigo: string;
    propietarioNombre?: string;
  }) => { ok: boolean; error?: string; createdLog?: ParkingLog };
  onRegisterExit: (params: {
    logId: string;
    metodoPago: PaymentMethod;
    valorPagado: number;
    minutosTranscurridos: number;
    cruzoMedianoche: boolean;
    fechaSalidaISO: string;
  }) => { ok: boolean; error?: string; completedLog?: ParkingLog };
  onShiftEntryTimeForMidnightTest: (logId: string, hoursBack: number) => void;
  onLogAuditEvent: (
    accion: string,
    modulo: 'ESPACIOS' | 'FLUJO_VEHICULAR',
    detalle: string,
    resultado: 'OK' | 'ALERTA'
  ) => void;
}

export const OperatorWorkspace: React.FC<OperatorWorkspaceProps> = ({
  currentUser,
  spots,
  logs,
  rates,
  onRegisterEntry,
  onRegisterExit,
  onShiftEntryTimeForMidnightTest,
  onLogAuditEvent,
}) => {
  // Mode inside Operator Workspace: 'MAPA_ENTRADA' or 'SALIDA_COBRO'
  const [activeOperation, setActiveOperation] = useState<'MAPA_ENTRADA' | 'SALIDA_COBRO'>('MAPA_ENTRADA');

  // Map filters
  const [selectedZone, setSelectedZone] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [mapSearch, setMapSearch] = useState<string>('');
  const [selectedSpotCode, setSelectedSpotCode] = useState<string>('A-02');

  // Edge Case Simulators
  const [simulateFullCapacity, setSimulateFullCapacity] = useState<boolean>(false);
  const [simulateDbFailure, setSimulateDbFailure] = useState<boolean>(false);

  // Entry Form State
  const [entryPlate, setEntryPlate] = useState<string>('');
  const [entryVehicleType, setEntryVehicleType] = useState<VehicleType>('Automóvil');
  const [entryOwnerName, setEntryOwnerName] = useState<string>('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [isProcessingEntry, setIsProcessingEntry] = useState<boolean>(false);
  const [generatedTicketModal, setGeneratedTicketModal] = useState<ParkingLog | null>(null);

  // Exit & Billing State
  const [exitSearchQuery, setExitSearchQuery] = useState<string>('MDE-314');
  const [selectedActiveLogId, setSelectedActiveLogId] = useState<string | null>('LOG-1001');
  const [exitSearchError, setExitSearchError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [isProcessingExit, setIsProcessingExit] = useState<boolean>(false);
  const [completedExitModal, setCompletedExitModal] = useState<ParkingLog | null>(null);

  // Operational banner alert for concurrency / DB test
  const [operationalBanner, setOperationalBanner] = useState<{
    type: 'error' | 'warning' | 'success';
    title: string;
    message: string;
  } | null>(null);

  const activeLogs = useMemo(() => logs.filter((l) => l.estado === 'ACTIVO'), [logs]);

  // Compute effective spots (applying 100% full capacity simulation if toggled)
  const effectiveSpots = useMemo(() => {
    if (!simulateFullCapacity) return spots;
    return spots.map((s) =>
      s.estado === 'DISPONIBLE'
        ? { ...s, estado: 'OCUPADO' as const, placaActual: 'SIM-999', ticketActualId: 'TCK-AFORO-100' }
        : s
    );
  }, [spots, simulateFullCapacity]);

  const availableSpotsCount = useMemo(
    () => effectiveSpots.filter((s) => s.estado === 'DISPONIBLE').length,
    [effectiveSpots]
  );

  const occupiedSpotsCount = useMemo(
    () => effectiveSpots.filter((s) => s.estado === 'OCUPADO').length,
    [effectiveSpots]
  );

  const filteredSpots = useMemo(() => {
    return effectiveSpots.filter((spot) => {
      const matchesZone = selectedZone === 'TODAS' || spot.zona === selectedZone;
      const matchesStatus = statusFilter === 'TODOS' || spot.estado === statusFilter;
      const q = mapSearch.trim().toUpperCase();
      const matchesQuery =
        !q ||
        spot.codigo.toUpperCase().includes(q) ||
        (spot.placaActual && spot.placaActual.toUpperCase().includes(q)) ||
        spot.tipoPermitido.toUpperCase().includes(q);
      return matchesZone && matchesStatus && matchesQuery;
    });
  }, [effectiveSpots, selectedZone, statusFilter, mapSearch]);

  const selectedSpot = useMemo(
    () => effectiveSpots.find((s) => s.codigo === selectedSpotCode) || effectiveSpots[0],
    [effectiveSpots, selectedSpotCode]
  );

  const selectedSpotActiveLog = useMemo(() => {
    if (!selectedSpot || selectedSpot.estado !== 'OCUPADO') return null;
    return activeLogs.find(
      (l) => l.spotCodigo === selectedSpot.codigo || l.placa === selectedSpot.placaActual
    );
  }, [selectedSpot, activeLogs]);

  // Select spot handler
  const handleSelectSpot = (spot: ParkingSpot) => {
    setSelectedSpotCode(spot.codigo);
    setEntryError(null);
    if (spot.estado === 'DISPONIBLE') {
      setEntryVehicleType(spot.tipoPermitido);
    } else if (spot.estado === 'OCUPADO' && spot.placaActual && spot.placaActual !== 'SIM-999') {
      const matchingLog = activeLogs.find((l) => l.placa === spot.placaActual);
      if (matchingLog) {
        setSelectedActiveLogId(matchingLog.id);
        setExitSearchQuery(matchingLog.placa);
      }
    }
  };

  // Auto-select an available spot when vehicle type changes
  const handleVehicleTypeChange = (type: VehicleType) => {
    setEntryVehicleType(type);
    setEntryError(null);
    const currentSpot = effectiveSpots.find((s) => s.codigo === selectedSpotCode);
    if (!currentSpot || currentSpot.estado !== 'DISPONIBLE' || currentSpot.tipoPermitido !== type) {
      const candidate = effectiveSpots.find(
        (s) => s.estado === 'DISPONIBLE' && s.tipoPermitido === type
      );
      if (candidate) {
        setSelectedSpotCode(candidate.codigo);
      }
    }
  };

  // Handle Entry Registration ("Happy Path 2.1" + Edge Cases)
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    setOperationalBanner(null);

    // Edge Case 1: Parqueadero Lleno (Aforo 100%)
    if (availableSpotsCount === 0) {
      setEntryError('PARQUEADERO LLENO: Aforo al 100%.Asignación de espacios deshabilitada hasta liberar bahías.');
      onLogAuditEvent(
        'ENTRY_BLOCKED_FULL_CAPACITY',
        'ESPACIOS',
        'Intento de ingreso rechazado por aforo al 100% (Parqueadero lleno)',
        'ALERTA'
      );
      return;
    }

    // Edge Case 2: Simulated DB Connection Failure (Transactional Rollback)
    if (simulateDbFailure) {
      setIsProcessingEntry(true);
      setTimeout(() => {
        setIsProcessingEntry(false);
        setOperationalBanner({
          type: 'error',
          title: 'Falla de Conexión a Base de Datos MySQL (Rollback Transaccional)',
          message:
            'Se interrumpió la conexión con el motor de persistencia. La transacción Prisma fue revertida para evitar registros incompletos. Desactive el simulador de falla o presione Reintentar.',
        });
        onLogAuditEvent(
          'DB_TRANSACTION_ROLLBACK',
          'FLUJO_VEHICULAR',
          `Rollback automático al intentar registrar placa ${entryPlate || 'N/A'} por desconexión a BD`,
          'ALERTA'
        );
      }, 180);
      return;
    }

    // Edge Case 3: Validate License Plate Format
    const validation = validateLicensePlate(entryPlate);
    if (!validation.valid) {
      setEntryError(validation.error || 'Formato de placa inválido.');
      onLogAuditEvent(
        'INVALID_PLATE_REJECTED',
        'FLUJO_VEHICULAR',
        `Placa rechazada por validación Zod: "${entryPlate}"`,
        'ALERTA'
      );
      return;
    }

    // Verify selected spot is available
    const targetSpot = effectiveSpots.find((s) => s.codigo === selectedSpotCode);
    if (!targetSpot || targetSpot.estado !== 'DISPONIBLE') {
      setEntryError(`El espacio ${selectedSpotCode} no está disponible. Seleccione un espacio libre (verde).`);
      return;
    }

    setIsProcessingEntry(true);
    setTimeout(() => {
      const result = onRegisterEntry({
        placa: validation.formatted,
        tipoVehiculo: entryVehicleType,
        spotCodigo: targetSpot.codigo,
        propietarioNombre: entryOwnerName.trim() || 'Cliente Visitante',
      });
      setIsProcessingEntry(false);

      if (!result.ok) {
        setEntryError(result.error || 'Error al registrar entrada.');
        return;
      }

      if (result.createdLog) {
        setEntryPlate('');
        setEntryOwnerName('');
        setGeneratedTicketModal(result.createdLog);
        // Move selector to next available spot
        const nextSpot = spots.find(
          (s) => s.estado === 'DISPONIBLE' && s.codigo !== targetSpot.codigo
        );
        if (nextSpot) setSelectedSpotCode(nextSpot.codigo);
      }
    }, 160);
  };

  // Handle Exit Search ("Happy Path 2.2" + Edge Case 4: Ticket/Placa no encontrado)
  const handleExitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setExitSearchError(null);
    const q = exitSearchQuery.trim().toUpperCase();
    if (!q) {
      setExitSearchError('Ingrese un número de placa o código de ticket para buscar.');
      return;
    }

    const found = activeLogs.find(
      (l) =>
        l.placa.toUpperCase() === q ||
        l.placa.replace('-', '').toUpperCase() === q.replace('-', '') ||
        l.ticketCodigo.toUpperCase() === q
    );

    if (!found) {
      setSelectedActiveLogId(null);
      setExitSearchError(
        `Registro no encontrado: No existe ninguna estancia activa asociada a "${exitSearchQuery.toUpperCase()}". Verifique la placa o número de ticket.`
      );
      onLogAuditEvent(
        'EXIT_LOOKUP_NOT_FOUND',
        'FLUJO_VEHICULAR',
        `Búsqueda de salida sin resultados para consulta "${exitSearchQuery.toUpperCase()}"`,
        'ALERTA'
      );
      return;
    }

    setSelectedActiveLogId(found.id);
    setSelectedSpotCode(found.spotCodigo);
  };

  const currentCheckoutLog = useMemo(() => {
    if (!selectedActiveLogId) return null;
    return activeLogs.find((l) => l.id === selectedActiveLogId) || null;
  }, [activeLogs, selectedActiveLogId]);

  const currentCheckoutBilling = useMemo(() => {
    if (!currentCheckoutLog) return null;
    const rate =
      rates.find((r) => r.tipoVehiculo === currentCheckoutLog.tipoVehiculo) || rates[0];
    const nowISO = new Date().toISOString();
    return {
      rate,
      nowISO,
      breakdown: calculateStayBilling(currentCheckoutLog.fechaIngreso, nowISO, rate),
    };
  }, [currentCheckoutLog, rates]);

  // Process Checkout & Release Spot
  const handleConfirmExitAndPayment = () => {
    if (!currentCheckoutLog || !currentCheckoutBilling) return;

    if (simulateDbFailure) {
      setOperationalBanner({
        type: 'error',
        title: 'Falla de Conexión a BD al Procesar Cobro',
        message:
          'Transacción abortada de forma segura: El espacio no fue liberado ni se registró un pago incompleto. Reintente tras restablecer conexión.',
      });
      return;
    }

    setIsProcessingExit(true);
    setTimeout(() => {
      const res = onRegisterExit({
        logId: currentCheckoutLog.id,
        metodoPago: paymentMethod,
        valorPagado: currentCheckoutBilling.breakdown.totalPagar,
        minutosTranscurridos: currentCheckoutBilling.breakdown.minutosTotales,
        cruzoMedianoche: currentCheckoutBilling.breakdown.cruzoMedianoche,
        fechaSalidaISO: currentCheckoutBilling.nowISO,
      });
      setIsProcessingExit(false);

      if (!res.ok) {
        setExitSearchError(res.error || 'No se pudo procesar la salida.');
        return;
      }

      if (res.completedLog) {
        setCompletedExitModal(res.completedLog);
        const remaining = activeLogs.filter((l) => l.id !== currentCheckoutLog.id);
        setSelectedActiveLogId(remaining.length > 0 ? remaining[0].id : null);
        setExitSearchQuery(remaining.length > 0 ? remaining[0].placa : '');
      }
    }, 160);
  };

  // Edge Case #6: Concurrency test simulation
  const handleConcurrencySimulation = () => {
    const target = effectiveSpots.find((s) => s.estado === 'DISPONIBLE');
    const spotLabel = target ? target.codigo : 'A-02';
    setOperationalBanner({
      type: 'warning',
      title: `Control de Concurrencia Activado en Bahía ${spotLabel}`,
      message: `Se detectaron 2 solicitudes simultáneas para ocupar el espacio ${spotLabel}. El bloqueo pesimista (SELECT FOR UPDATE en Prisma/MySQL) aceptó la primera transacción y rechazó la duplicada con código 409 Conflict.`,
    });
    onLogAuditEvent(
      'CONCURRENCY_LOCK_RESOLVED',
      'ESPACIOS',
      `Control de concurrencia evitó asignación simultánea doble en espacio ${spotLabel}`,
      'OK'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Operational Sub-Navigation & Edge Case Testing Bar */}
      <div className="cyber-panel-level1 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Segmented Control: Happy Path 2.1 vs 2.2 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveOperation('MAPA_ENTRADA');
              setOperationalBanner(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeOperation === 'MAPA_ENTRADA'
                ? 'bg-[#00f5ff] text-[#070b14] shadow-[0_0_16px_rgba(0,245,255,0.3)]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-[#e9feff] border border-white/10'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>1. Mapa de Espacios y Registro de Entrada</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveOperation('SALIDA_COBRO');
              setOperationalBanner(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeOperation === 'SALIDA_COBRO'
                ? 'bg-[#00f5ff] text-[#070b14] shadow-[0_0_16px_rgba(0,245,255,0.3)]'
                : 'bg-[#0b1120] text-[#b9caca] hover:text-[#e9feff] border border-white/10'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Registro de Salida, Cálculo de Tarifa y Cobro</span>
            <span className="font-mono-tabular px-1.5 py-0.5 rounded bg-black/20 text-[11px]">
              {activeLogs.length} activos
            </span>
          </button>
        </div>

        {/* Interactive Edge Case Validation Controls (PRD Section 3 & 5) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#849495] font-mono-tabular mr-1">SIMULAR CASOS BORDE:</span>

          <button
            type="button"
            onClick={() => {
              setSimulateFullCapacity((prev) => !prev);
              setEntryError(null);
            }}
            className={`px-3 py-1.5 rounded-lg border font-mono-tabular transition-colors whitespace-nowrap ${
              simulateFullCapacity
                ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366]'
                : 'bg-[#0b1120] border-white/15 text-[#b9caca] hover:border-[#00f5ff]/50'
            }`}
          >
            {simulateFullCapacity ? 'Aforo 100%: ACTIVO' : 'Aforo 100% (Lleno)'}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveOperation('MAPA_ENTRADA');
              setEntryPlate('KLM-456');
              setEntryError(
                'Vehículo dentro del parqueadero: La placa KLM-456 ya registra una estancia activa en la bahía B-01 (Ticket TCK-2026-8842). Se cancela la duplicación.'
              );
              onLogAuditEvent(
                'DUPLICATE_PLATE_BLOCKED',
                'FLUJO_VEHICULAR',
                'Rechazo automático por placa en estancia activa (KLM-456)',
                'ALERTA'
              );
            }}
            className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#0b1120] text-[#b9caca] hover:border-[#ffb800] hover:text-[#ffb800] font-mono-tabular transition-colors whitespace-nowrap"
          >
            Probar Placa Activa
          </button>

          <button
            type="button"
            onClick={handleConcurrencySimulation}
            className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#0b1120] text-[#b9caca] hover:border-[#00f5ff] hover:text-[#00f5ff] font-mono-tabular transition-colors whitespace-nowrap"
          >
            Concurrencia 2x
          </button>

          <button
            type="button"
            onClick={() => {
              setSimulateDbFailure((prev) => !prev);
              setOperationalBanner(null);
            }}
            className={`px-3 py-1.5 rounded-lg border font-mono-tabular transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              simulateDbFailure
                ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366]'
                : 'bg-[#0b1120] border-white/15 text-[#b9caca] hover:border-[#ff3366]/50'
            }`}
          >
            <DatabaseBackup className="w-3.5 h-3.5" />
            <span>{simulateDbFailure ? 'Falla BD: ACTIVA' : 'Simular Falla BD'}</span>
          </button>
        </div>
      </div>

      {/* Full Capacity Alert Banner (Edge Case #2) */}
      {availableSpotsCount === 0 && (
        <div className="p-4 rounded-xl bg-[#ff3366]/15 border border-[#ff3366]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[#ff3366]">
                ALERTA OPERATIVA: PARQUEADERO LLENO (AFORO AL 100%)
              </h3>
              <p className="text-xs text-[#ffdad6] mt-0.5">
                No existen bahías disponibles en este momento ({occupiedSpotsCount}/{effectiveSpots.length} ocupadas).
                El formulario de asignación de entradas se encuentra bloqueado preventivamente hasta registrar salidas.
              </p>
            </div>
          </div>
          {simulateFullCapacity && (
            <button
              type="button"
              onClick={() => setSimulateFullCapacity(false)}
              className="px-3.5 py-2 rounded-lg bg-[#ff3366] text-[#070b14] font-semibold text-xs whitespace-nowrap"
            >
              Restaurar Aforo Real
            </button>
          )}
        </div>
      )}

      {/* Operational Banner for Concurrency or DB Rollback */}
      {operationalBanner && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
            operationalBanner.type === 'error'
              ? 'bg-[#ff3366]/15 border-[#ff3366]/60 text-[#ffdad6]'
              : operationalBanner.type === 'warning'
              ? 'bg-[#ffb800]/15 border-[#ffb800]/60 text-[#fff3cd]'
              : 'bg-[#00ff87]/15 border-[#00ff87]/60 text-[#d1fae5]'
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                operationalBanner.type === 'error'
                  ? 'text-[#ff3366]'
                  : operationalBanner.type === 'warning'
                  ? 'text-[#ffb800]'
                  : 'text-[#00ff87]'
              }`}
            />
            <div>
              <h4 className="text-sm font-bold">{operationalBanner.title}</h4>
              <p className="text-xs mt-1 leading-relaxed">{operationalBanner.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {simulateDbFailure && (
              <button
                type="button"
                onClick={() => {
                  setSimulateDbFailure(false);
                  setOperationalBanner(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#00f5ff] text-[#070b14] font-semibold text-xs whitespace-nowrap"
              >
                Reconectar BD y Reintentar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOperationalBanner(null)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Cerrar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 12-Column Desktop Split Layout: 8 Cols Interactive Matrix / 4 Cols Action Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLUMNS: Interactive Parking Bay Matrix OR Active Vehicles Checkout Queue */}
        <section className="lg:col-span-8 cyber-panel-level1 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#00f5ff]">
                <span>MATRIZ DE TELEMETRÍA ESPACIAL</span>
                <span>·</span>
                <span>SINCRONIZACIÓN EN TIEMPO REAL</span>
              </div>
              <h2 className="text-xl font-bold text-[#e9feff] mt-0.5">
                Mapa Interactivo de Bahías ({availableSpotsCount} Disponibles / {occupiedSpotsCount} Ocupadas)
              </h2>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                placeholder="Buscar bahía o placa (ej. B-01)..."
                className="cyber-input w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono-tabular"
              />
            </div>
          </div>

          {/* Zone & Status Interactive Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#070b14]/90 p-1 rounded-lg border border-white/10">
              {['TODAS', 'Zona A · Estándar', 'Zona B · EV & VIP', 'Zona C · Motos', 'Zona D · Camionetas'].map(
                (zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedZone === zone
                        ? 'bg-[#00f5ff] text-[#070b14] font-semibold'
                        : 'text-[#b9caca] hover:text-[#e9feff]'
                    }`}
                  >
                    {zone === 'TODAS' ? 'Todas las Zonas' : zone.split(' · ')[0] + ' · ' + zone.split(' · ')[1]}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-[#070b14]/90 p-1 rounded-lg border border-white/10">
              {(['TODOS', 'DISPONIBLE', 'OCUPADO', 'BLOQUEADO'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-mono-tabular transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white/15 text-[#e9feff] font-semibold'
                      : 'text-[#849495] hover:text-[#dfe2f0]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* 2D Interactive Parking Stall Grid Nodes */}
          {filteredSpots.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/15 rounded-xl">
              <p className="text-sm font-semibold text-[#e9feff]">
                Sin resultados en la búsqueda de espacios
              </p>
              <p className="text-xs text-[#849495] mt-1">
                No se encontraron bahías que coincidan con el filtro seleccionado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedZone('TODAS');
                  setStatusFilter('TODOS');
                  setMapSearch('');
                }}
                className="mt-4 cyber-btn-ghost px-4 py-2 rounded-lg text-xs"
              >
                Restablecer Filtros del Mapa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredSpots.map((spot) => {
                const isSelected = spot.codigo === selectedSpotCode;
                const isAvailable = spot.estado === 'DISPONIBLE';
                const isOccupied = spot.estado === 'OCUPADO';
                const isBlocked = spot.estado === 'BLOQUEADO';

                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handleSelectSpot(spot)}
                    className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between min-h-[116px] ${
                      isSelected
                        ? 'ring-2 ring-[#00f5ff] bg-[#0f172a] border-[#00f5ff]'
                        : isAvailable
                        ? 'bg-[#0b1120]/85 border-[#00ff87]/35 hover:border-[#00ff87]'
                        : isOccupied
                        ? 'bg-[#0b1120]/90 border-[#a855f7]/45 hover:border-[#a855f7]'
                        : 'bg-[#0b1120]/50 border-[#ff3366]/40 opacity-80'
                    }`}
                  >
                    {/* Top Row: Bay Designation + Status Indicator */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-base font-bold font-mono-tabular text-[#e9feff]">
                        {spot.codigo}
                      </span>
                      <span
                        className={`text-[11px] font-mono-tabular font-semibold ${
                          isAvailable
                            ? 'text-[#00ff87]'
                            : isOccupied
                            ? 'text-[#c084fc]'
                            : 'text-[#ff3366]'
                        }`}
                      >
                        {spot.estado}
                      </span>
                    </div>

                    {/* Middle Row: Vehicle Plate or Available Type */}
                    <div className="my-2">
                      {isOccupied && spot.placaActual ? (
                        <div className="font-mono-tabular text-sm font-bold text-[#e9feff] tracking-wider bg-[#a855f7]/15 border border-[#a855f7]/40 px-2 py-1 rounded text-center">
                          {spot.placaActual}
                        </div>
                      ) : isBlocked ? (
                        <div className="text-xs font-mono-tabular text-[#ff3366]">
                          MANTENIMIENTO SENSOR
                        </div>
                      ) : (
                        <div className="text-xs text-[#b9caca]">{spot.tipoPermitido}</div>
                      )}
                    </div>

                    {/* Bottom Row: Telemetry Metadata (Unboxed with · separators) */}
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#849495] w-full pt-1 border-t border-white/5">
                      <span>{spot.nivel}</span>
                      {spot.potenciaEVKw ? (
                        <span className="text-[#00f5ff] flex items-center gap-0.5">
                          <Zap className="w-3 h-3" />
                          {spot.potenciaEVKw}kW
                        </span>
                      ) : spot.esVIP ? (
                        <span className="text-[#c084fc]">VIP BAY</span>
                      ) : (
                        <span>{spot.saludSensor}%</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend & Active Vehicles Quick Strip */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#849495]">
            <div className="flex flex-wrap items-center gap-4 font-mono-tabular">
              <span className="text-[#00ff87]">● DISPONIBLE ({availableSpotsCount})</span>
              <span className="text-[#c084fc]">● OCUPADO ({occupiedSpotsCount})</span>
              <span className="text-[#ff3366]">
                ● BLOQUEADO ({effectiveSpots.filter((s) => s.estado === 'BLOQUEADO').length})
              </span>
            </div>
            <div>
              Haga clic en cualquier bahía libre para asignarla o en una ocupada para liquidar su salida.
            </div>
          </div>
        </section>

        {/* RIGHT 4 COLUMNS: Live Stall Inspector + Entry Form OR Exit & Billing Console */}
        <aside className="lg:col-span-4 space-y-6">
          {activeOperation === 'MAPA_ENTRADA' ? (
            /* HAPPY PATH 2.1: REGISTRO DE ENTRADA Y GENERACIÓN DE TICKET */
            <div className="cyber-card-level2 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4">
                <div className="text-xs font-mono-tabular text-[#00f5ff]">
                  MÓDULO DE ACCESO VEHICULAR
                </div>
                <h3 className="text-lg font-bold text-[#e9feff] mt-0.5">
                  Registro de Entrada y Asignación
                </h3>
                <p className="text-xs text-[#849495] mt-0.5">
                  Valida formato de placa, verifica no duplicidad y genera ticket digital.
                </p>
              </div>

              {/* Selected Stall Telemetry Summary */}
              {selectedSpot && (
                <div className="p-3.5 rounded-xl bg-[#070b14]/90 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#849495]">Bahía Seleccionada en Mapa</div>
                    <div className="text-lg font-bold font-mono-tabular text-[#e9feff] mt-0.5">
                      {selectedSpot.codigo} · {selectedSpot.zona.split(' · ')[1]}
                    </div>
                    <div className="text-xs font-mono-tabular text-[#b9caca] mt-0.5">
                      Tipo: {selectedSpot.tipoPermitido} · Sensor {selectedSpot.saludSensor}%
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono-tabular font-bold ${
                        selectedSpot.estado === 'DISPONIBLE'
                          ? 'text-[#00ff87]'
                          : selectedSpot.estado === 'OCUPADO'
                          ? 'text-[#c084fc]'
                          : 'text-[#ff3366]'
                      }`}
                    >
                      {selectedSpot.estado}
                    </span>
                    {selectedSpot.estado === 'OCUPADO' && selectedSpotActiveLog && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActiveLogId(selectedSpotActiveLog.id);
                          setExitSearchQuery(selectedSpotActiveLog.placa);
                          setActiveOperation('SALIDA_COBRO');
                        }}
                        className="block mt-2 text-xs text-[#00f5ff] underline font-mono-tabular"
                      >
                        Procesar Salida ({selectedSpotActiveLog.placa}) →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {entryError && (
                <div className="p-3.5 rounded-lg bg-[#ff3366]/15 border border-[#ff3366]/50 text-xs text-[#ffdad6] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#ff3366] shrink-0 mt-0.5" />
                  <span>{entryError}</span>
                </div>
              )}

              <form onSubmit={handleEntrySubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="entry-plate" className="text-xs text-[#b9caca]">
                      Placa del Vehículo (Obligatorio)
                    </label>
                    <span className="text-[11px] font-mono-tabular text-[#849495]">
                      Ej: ABC-123 o XRT-82A
                    </span>
                  </div>
                  <input
                    id="entry-plate"
                    type="text"
                    value={entryPlate}
                    onChange={(e) => {
                      setEntryPlate(e.target.value.toUpperCase());
                      setEntryError(null);
                    }}
                    placeholder="ABC-123"
                    maxLength={8}
                    disabled={availableSpotsCount === 0}
                    className="cyber-input w-full px-3.5 py-2.5 rounded-lg text-base font-bold font-mono-tabular uppercase tracking-wider"
                  />
                  {/* Quick test plates */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-mono-tabular">
                    <span className="text-[#849495]">Autocompletar prueba:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryPlate('NVC-804');
                        setEntryError(null);
                      }}
                      className="text-[#00f5ff] hover:underline"
                    >
                      NVC-804 (Válida)
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryPlate('KLM-456');
                        setEntryError(null);
                      }}
                      className="text-[#ffb800] hover:underline"
                    >
                      KLM-456 (Duplicada)
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryPlate('AB@12');
                        setEntryError(null);
                      }}
                      className="text-[#ff3366] hover:underline"
                    >
                      AB@12 (Inválida)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#b9caca] mb-1.5">
                    Tipo de Vehículo y Tarifa Aplicable
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Automóvil', 'Motocicleta', 'Camioneta', 'Eléctrico EV'] as VehicleType[]).map(
                      (tipo) => {
                        const rate = rates.find((r) => r.tipoVehiculo === tipo);
                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => handleVehicleTypeChange(tipo)}
                            disabled={availableSpotsCount === 0}
                            className={`p-2.5 rounded-lg border text-left transition-colors ${
                              entryVehicleType === tipo
                                ? 'bg-[#00f5ff]/15 border-[#00f5ff] text-[#e9feff]'
                                : 'bg-[#0b1120] border-white/10 text-[#849495] hover:text-[#dfe2f0]'
                            }`}
                          >
                            <div className="text-xs font-semibold">{tipo}</div>
                            {rate && (
                              <div className="text-[11px] font-mono-tabular text-[#00f5ff] mt-0.5">
                                {formatCOP(rate.tarifaPorHora)}/h · {formatCOP(rate.tarifaPorMinuto)}/m
                              </div>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="entry-spot-select" className="block text-xs text-[#b9caca] mb-1.5">
                    Espacio Asignado (Sólo Bahías Disponibles)
                  </label>
                  <select
                    id="entry-spot-select"
                    value={selectedSpotCode}
                    onChange={(e) => setSelectedSpotCode(e.target.value)}
                    disabled={availableSpotsCount === 0}
                    className="cyber-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono-tabular"
                  >
                    {effectiveSpots
                      .filter((s) => s.estado === 'DISPONIBLE')
                      .map((s) => (
                        <option key={s.id} value={s.codigo} className="bg-[#0b1120] text-[#dfe2f0]">
                          {s.codigo} — {s.tipoPermitido} ({s.zona})
                        </option>
                      ))}
                    {availableSpotsCount === 0 && (
                      <option value="">SIN ESPACIOS DISPONIBLES (PARQUEADERO LLENO)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label htmlFor="entry-owner" className="block text-xs text-[#b9caca] mb-1.5">
                    Nombre del Conductor / Cliente (Opcional)
                  </label>
                  <input
                    id="entry-owner"
                    type="text"
                    value={entryOwnerName}
                    onChange={(e) => setEntryOwnerName(e.target.value)}
                    placeholder="Ej. Andrés Villamizar"
                    disabled={availableSpotsCount === 0}
                    className="cyber-input w-full px-3.5 py-2 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={availableSpotsCount === 0 || isProcessingEntry}
                  className="cyber-btn-primary w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {availableSpotsCount === 0 ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Parqueadero Lleno — Asignación Bloqueada</span>
                    </>
                  ) : isProcessingEntry ? (
                    <span>Registrando Entrada y Generando Ticket...</span>
                  ) : (
                    <>
                      <span>Asignar Espacio y Generar Ticket Digital</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* HAPPY PATH 2.2: REGISTRO DE SALIDA, CÁLCULO AUTOMÁTICO DE TARIFA Y COBRO */
            <div className="cyber-card-level2 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4">
                <div className="text-xs font-mono-tabular text-[#00f5ff]">
                  LIQUIDACIÓN Y SALIDA VEHICULAR
                </div>
                <h3 className="text-lg font-bold text-[#e9feff] mt-0.5">
                  Cálculo Automático de Tarifa y Cobro
                </h3>
                <p className="text-xs text-[#849495] mt-0.5">
                  Busque por placa o ticket, verifique permanencia y libere la bahía.
                </p>
              </div>

              {/* Search by Plate or Ticket ID */}
              <form onSubmit={handleExitSearch} className="space-y-2.5">
                <label htmlFor="exit-search" className="block text-xs text-[#b9caca]">
                  Buscar Estancia Activa (Placa o Código de Ticket)
                </label>
                <div className="flex gap-2">
                  <input
                    id="exit-search"
                    type="text"
                    value={exitSearchQuery}
                    onChange={(e) => {
                      setExitSearchQuery(e.target.value.toUpperCase());
                      setExitSearchError(null);
                    }}
                    placeholder="Ej. MDE-314 o TCK-2026-8839"
                    className="cyber-input flex-1 px-3 py-2 rounded-lg text-xs font-mono-tabular uppercase"
                  />
                  <button
                    type="submit"
                    className="cyber-btn-primary px-4 py-2 rounded-lg text-xs whitespace-nowrap"
                  >
                    Buscar
                  </button>
                </div>

                {/* Quick selector for active vehicles + nonexistent vehicle test */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono-tabular">
                  <span className="text-[#849495]">Activos:</span>
                  {activeLogs.slice(0, 4).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setSelectedActiveLogId(l.id);
                        setExitSearchQuery(l.placa);
                        setExitSearchError(null);
                        setSelectedSpotCode(l.spotCodigo);
                      }}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        selectedActiveLogId === l.id
                          ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff]'
                          : 'border-white/10 text-[#b9caca] hover:text-white'
                      }`}
                    >
                      {l.placa} ({l.spotCodigo})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setExitSearchQuery('NO-EXISTE-99');
                      setSelectedActiveLogId(null);
                      setExitSearchError(
                        'Registro no encontrado: No existe ninguna estancia activa asociada a "NO-EXISTE-99".'
                      );
                    }}
                    className="px-2 py-0.5 rounded border border-[#ff3366]/40 text-[#ff3366] hover:bg-[#ff3366]/10"
                  >
                    Probar Inexistente
                  </button>
                </div>
              </form>

              {exitSearchError && (
                <div className="p-3.5 rounded-lg bg-[#ff3366]/15 border border-[#ff3366]/50 text-xs text-[#ffdad6] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#ff3366] shrink-0 mt-0.5" />
                  <span>{exitSearchError}</span>
                </div>
              )}

              {/* Active Stay Billing Detail Card */}
              {currentCheckoutLog && currentCheckoutBilling ? (
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="p-4 rounded-xl bg-[#070b14]/90 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono-tabular text-[#849495]">
                          {currentCheckoutLog.ticketCodigo}
                        </span>
                        <div className="text-xl font-bold font-mono-tabular text-[#e9feff]">
                          {currentCheckoutLog.placa} · Bahía {currentCheckoutLog.spotCodigo}
                        </div>
                      </div>
                      <span className="text-xs font-mono-tabular text-[#00f5ff]">
                        {currentCheckoutLog.tipoVehiculo}
                      </span>
                    </div>

                    {/* Midnight Crossing Indicator (PRD Case #5) */}
                    {currentCheckoutBilling.breakdown.cruzoMedianoche && (
                      <div className="p-2.5 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/40 text-xs text-[#edd4ff] flex items-center justify-between">
                        <span>Cruce de Medianoche / Multi-día Detectado</span>
                        <span className="font-mono-tabular font-semibold text-[#c084fc]">
                          Precisión Garantizada
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3">
                      <div>
                        <span className="text-[#849495] block">Hora de Entrada</span>
                        <span className="font-mono-tabular text-[#dfe2f0]">
                          {new Date(currentCheckoutLog.fechaIngreso).toLocaleString('es-CO', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#849495] block">Tiempo de Permanencia</span>
                        <span className="font-mono-tabular font-bold text-[#00ff87]">
                          {currentCheckoutBilling.breakdown.formatoTiempo} (
                          {currentCheckoutBilling.breakdown.minutosTotales} min)
                        </span>
                      </div>
                    </div>

                    {/* Button to simulate +12h Midnight Crossing on any vehicle */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-[#849495]">Simulador Caso Crítico #5:</span>
                      <button
                        type="button"
                        onClick={() => onShiftEntryTimeForMidnightTest(currentCheckoutLog.id, 14)}
                        className="text-[#00f5ff] hover:underline font-mono-tabular flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Simular +14h (Cruce de Medianoche)</span>
                      </button>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-4 rounded-xl bg-[#0b1120] border border-[#00f5ff]/25 space-y-2 text-xs">
                    <div className="flex justify-between text-[#b9caca]">
                      <span>Regla Tarifaria Aplicada</span>
                      <span className="font-mono-tabular text-right">
                        {currentCheckoutBilling.breakdown.tarifaAplicadaDesc}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#849495]">
                      <span>Subtotal Base</span>
                      <span className="font-mono-tabular">
                        {formatCOP(currentCheckoutBilling.breakdown.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#849495]">
                      <span>IVA (19% Incluido)</span>
                      <span className="font-mono-tabular">
                        {formatCOP(currentCheckoutBilling.breakdown.impuestoIVA)}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-2.5 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-[#e9feff]">Total Exacto a Pagar</span>
                      <span className="text-2xl font-bold font-mono-tabular text-[#00ff87]">
                        {formatCOP(currentCheckoutBilling.breakdown.totalPagar)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs text-[#b9caca] mb-2">
                      Método de Pago en Punto de Salida
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'Efectivo', icon: Banknote },
                          { id: 'Tarjeta', icon: CreditCard },
                          { id: 'QR Digital', icon: QrCode },
                        ] as const
                      ).map(({ id, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPaymentMethod(id)}
                          className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                            paymentMethod === id
                              ? 'bg-[#00f5ff]/15 border-[#00f5ff] text-[#00f5ff]'
                              : 'bg-[#0b1120] border-white/10 text-[#849495] hover:text-[#dfe2f0]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmExitAndPayment}
                    disabled={isProcessingExit}
                    className="cyber-btn-primary w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isProcessingExit
                        ? 'Procesando Pago y Liberando Bahía...'
                        : `Registrar Pago (${formatCOP(currentCheckoutBilling.breakdown.totalPagar)}) y Liberar ${currentCheckoutLog.spotCodigo}`}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#849495] border border-dashed border-white/10 rounded-xl">
                  Seleccione un vehículo en estancia activa o ingrese su placa arriba para calcular la tarifa.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* SUCCESS MODAL 1: TICKET DIGITAL DE ENTRADA (UI State 4: Confirmación de Cierre) */}
      {generatedTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="cyber-modal-level3 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#00ff87]" />
                <div>
                  <h3 className="text-lg font-bold text-[#e9feff]">
                    Ingreso Registrado · Ticket Generado
                  </h3>
                  <p className="text-xs text-[#849495]">
                    Bahía {generatedTicketModal.spotCodigo} actualizada a estado OCUPADO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedTicketModal(null)}
                className="p-1 rounded-lg text-[#849495] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#070b14] border border-dashed border-[#00f5ff]/40 space-y-3 font-mono-tabular text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-[#849495]">TICKET ID</span>
                <span className="text-sm font-bold text-[#00f5ff]">
                  {generatedTicketModal.ticketCodigo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">PLACA VEHÍCULO</span>
                <span className="text-base font-bold text-[#e9feff]">
                  {generatedTicketModal.placa}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">ESPACIO ASIGNADO</span>
                <span className="text-sm font-bold text-[#00ff87]">
                  Bahía {generatedTicketModal.spotCodigo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">TIPO VEHÍCULO</span>
                <span className="text-[#dfe2f0]">{generatedTicketModal.tipoVehiculo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">FECHA Y HORA EXACTA</span>
                <span className="text-[#dfe2f0]">
                  {new Date(generatedTicketModal.fechaIngreso).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">OPERADOR DE TURNO</span>
                <span className="text-[#dfe2f0]">{currentUser.nombre}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setGeneratedTicketModal(null);
                  setActiveOperation('MAPA_ENTRADA');
                }}
                className="cyber-btn-primary flex-1 py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Regresar al Mapa General e Iniciar Siguiente Proceso</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL 2: COMPROBANTE DE SALIDA Y LIBERACIÓN DE ESPACIO */}
      {completedExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="cyber-modal-level3 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#00ff87]" />
                <div>
                  <h3 className="text-lg font-bold text-[#e9feff]">
                    Salida Procesada · Bahía Liberada
                  </h3>
                  <p className="text-xs text-[#00ff87]">
                    El espacio {completedExitModal.spotCodigo} pasó de inmediato a DISPONIBLE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletedExitModal(null)}
                className="p-1 rounded-lg text-[#849495] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#070b14] border border-white/15 space-y-2.5 font-mono-tabular text-xs">
              <div className="flex justify-between">
                <span className="text-[#849495]">COMPROBANTE</span>
                <span className="text-[#00f5ff] font-bold">{completedExitModal.ticketCodigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">PLACA / BAHÍA LIBERADA</span>
                <span className="text-[#e9feff] font-bold">
                  {completedExitModal.placa} · {completedExitModal.spotCodigo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">PERMANENCIA TOTAL</span>
                <span className="text-[#dfe2f0]">
                  {completedExitModal.minutosTranscurridos} minutos
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#849495]">MÉTODO DE PAGO</span>
                <span className="text-[#dfe2f0]">{completedExitModal.metodoPago}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                <span className="font-bold text-[#e9feff]">VALOR RECAUDADO</span>
                <span className="font-bold text-[#00ff87]">
                  {formatCOP(completedExitModal.valorPagado || 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedExitModal(null);
                setActiveOperation('MAPA_ENTRADA');
              }}
              className="cyber-btn-primary w-full py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Regresar al Mapa General e Iniciar Siguiente Proceso</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
