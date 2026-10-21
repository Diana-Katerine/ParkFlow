<?php
/**
 * ParkFlow - Patrón Observer (Observador)
 * Monitoreo dinámico de disponibilidad: Cuando el sensor IoT o el operador cambia
 * el estado de un cupo, los observadores suscritos regeneran el mapa, actualizan contadores
 * y registran eventos de auditoría en tiempo real.
 */

interface IoTObserverInterface {
    public function update(array $eventData): void;
    public function getObserverName(): string;
}

interface IoTSensorSubjectInterface {
    public function attach(IoTObserverInterface $observer): void;
    public function detach(IoTObserverInterface $observer): void;
    public function notify(array $eventData): void;
}

class IoTSensorSubject implements IoTSensorSubjectInterface {
    /** @var IoTObserverInterface[] */
    private array $observers = [];
    private array $eventHistory = [];

    public function attach(IoTObserverInterface $observer): void {
        $this->observers[] = $observer;
    }

    public function detach(IoTObserverInterface $observer): void {
        $this->observers = array_filter(
            $this->observers, 
            fn($obs) => $obs !== $observer
        );
    }

    public function notify(array $eventData): void {
        $this->eventHistory[] = $eventData;
        foreach ($this->observers as $observer) {
            $observer->update($eventData);
        }
    }

    public function simulateSensorReading(string $spotCode, string $newState, ?string $plate = null): array {
        $event = [
            'eventId' => 'IOT-' . strtoupper(bin2hex(random_bytes(4))),
            'spotCode' => $spotCode,
            'newState' => $newState,
            'plate' => $plate,
            'timestamp' => date('Y-m-d H:i:s'),
            'sensorHealth' => 99.8,
            'dispatchedTo' => []
        ];

        foreach ($this->observers as $observer) {
            $observer->update($event);
            $event['dispatchedTo'][] = $observer->getObserverName();
        }

        return $event;
    }
}

class SpotMapObserver implements IoTObserverInterface {
    public function getObserverName(): string {
        return 'SpotMapObserver (Regenera Mapa SVG/DOM de Bahías)';
    }

    public function update(array $eventData): void {
        // En una arquitectura desacoplada, invalida cachés de telemetría y emite señal a UI
    }
}

class DashboardMetricsObserver implements IoTObserverInterface {
    public function getObserverName(): string {
        return 'DashboardMetricsObserver (Recalcula Ocupación y Contadores en Vivo)';
    }

    public function update(array $eventData): void {
        // Actualiza agregados de cupos libres vs ocupados
    }
}

class AuditLoggerObserver implements IoTObserverInterface {
    public function getObserverName(): string {
        return 'AuditLoggerObserver (Bitácora de Telemetría IoT en MySQL)';
    }

    public function update(array $eventData): void {
        // Registra evento en la bitácora de auditoría
    }
}
