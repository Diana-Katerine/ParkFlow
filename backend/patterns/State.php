<?php
/**
 * ParkFlow - Patrón State (Estado)
 * Gestiona el ciclo de vida de los espacios de parqueo y valida transiciones permitidas:
 * - "Libre" (Verde / DISPONIBLE)
 * - "Ocupado" (Rojo / OCUPADO)
 * - "Mantenimiento" (Gris / BLOQUEADO)
 */

interface SpotStateInterface {
    public function getStateName(): string;
    public function getColorCode(): string;
    public function occupy(SpotContext $context, string $plate): bool;
    public function vacate(SpotContext $context): bool;
    public function setMaintenance(SpotContext $context): bool;
    public function releaseMaintenance(SpotContext $context): bool;
}

class LibreState implements SpotStateInterface {
    public function getStateName(): string { return 'DISPONIBLE'; }
    public function getColorCode(): string { return '#10b981'; /* Verde */ }

    public function occupy(SpotContext $context, string $plate): bool {
        $context->setCurrentPlate($plate);
        $context->setState(new OcupadoState());
        return true;
    }

    public function vacate(SpotContext $context): bool {
        // Ya está libre
        return false;
    }

    public function setMaintenance(SpotContext $context): bool {
        $context->setCurrentPlate(null);
        $context->setState(new MantenimientoState());
        return true;
    }

    public function releaseMaintenance(SpotContext $context): bool {
        return false; // Ya está disponible
    }
}

class OcupadoState implements SpotStateInterface {
    public function getStateName(): string { return 'OCUPADO'; }
    public function getColorCode(): string { return '#ef4444'; /* Rojo */ }

    public function occupy(SpotContext $context, string $plate): bool {
        // Transición inválida: ya está ocupado
        return false;
    }

    public function vacate(SpotContext $context): bool {
        $context->setCurrentPlate(null);
        $context->setState(new LibreState());
        return true;
    }

    public function setMaintenance(SpotContext $context): bool {
        // Transición inválida: no se puede bloquear una bahía con vehículo dentro
        return false;
    }

    public function releaseMaintenance(SpotContext $context): bool {
        return false;
    }
}

class MantenimientoState implements SpotStateInterface {
    public function getStateName(): string { return 'BLOQUEADO'; }
    public function getColorCode(): string { return '#64748b'; /* Gris */ }

    public function occupy(SpotContext $context, string $plate): bool {
        // Transición inválida: un espacio en mantenimiento no admite vehículos
        return false;
    }

    public function vacate(SpotContext $context): bool {
        return false;
    }

    public function setMaintenance(SpotContext $context): bool {
        return false; // Ya está en mantenimiento
    }

    public function releaseMaintenance(SpotContext $context): bool {
        $context->setState(new LibreState());
        return true;
    }
}

class SpotContext {
    private string $spotCode;
    private SpotStateInterface $state;
    private ?string $currentPlate = null;

    public function __construct(string $spotCode, ?SpotStateInterface $initialState = null) {
        $this->spotCode = $spotCode;
        $this->state = $initialState ?? new LibreState();
    }

    public function setState(SpotStateInterface $state): void {
        $this->state = $state;
    }

    public function getState(): SpotStateInterface {
        return $this->state;
    }

    public function setCurrentPlate(?string $plate): void {
        $this->currentPlate = $plate;
    }

    public function getCurrentPlate(): ?string {
        return $this->currentPlate;
    }

    public function getSpotCode(): string {
        return $this->spotCode;
    }

    // Acciones delegadas al estado
    public function parkVehicle(string $plate): bool {
        return $this->state->occupy($this, $plate);
    }

    public function releaseVehicle(): bool {
        return $this->state->vacate($this);
    }

    public function lockForMaintenance(): bool {
        return $this->state->setMaintenance($this);
    }

    public function unlockFromMaintenance(): bool {
        return $this->state->releaseMaintenance($this);
    }
}
