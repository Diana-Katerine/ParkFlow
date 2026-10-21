<?php
/**
 * ParkFlow - Patrón Strategy (Estrategia)
 * Aísla el cálculo algorítmico de permanencia y costos para diferentes categorías
 * vehiculares (Automóvil, Motocicleta, Bicicleta) y esquemas especiales (Tarifa Nocturna).
 */

interface BillingStrategyInterface {
    public function getCategoryName(): string;
    public function calculateFee(int $minutes, array $rateData, bool $isNightMode = false): array;
}

class AutomovilBillingStrategy implements BillingStrategyInterface {
    public function getCategoryName(): string {
        return 'Automóvil';
    }

    public function calculateFee(int $minutes, array $rateData, bool $isNightMode = false): array {
        $ratePerMin = (float)($rateData['tarifa_por_minuto'] ?? 110.0);
        $ratePerHour = (float)($rateData['tarifa_por_hora'] ?? 5800.0);
        $ratePerDay = (float)($rateData['tarifa_plena_dia'] ?? 42000.0);
        $grace = (int)($rateData['fraccion_gracia_min'] ?? 5);

        if ($minutes <= $grace) {
            return [
                'strategy' => $this->getCategoryName(),
                'minutes' => $minutes,
                'billableMinutes' => 0,
                'ratePerMinute' => $ratePerMin,
                'total' => 0.0,
                'formula' => "Cortesía por gracia ({$minutes}m <= {$grace}m) = $0 COP"
            ];
        }

        if ($isNightMode) {
            $nightRate = $ratePerMin * 0.85; // 15% descuento nocturno o esquema plano
            $total = round($minutes * $nightRate);
            return [
                'strategy' => 'Tarifa Nocturna Automóvil',
                'minutes' => $minutes,
                'billableMinutes' => $minutes,
                'ratePerMinute' => $nightRate,
                'total' => min($total, $ratePerDay),
                'formula' => "{$minutes}m x $" . number_format($nightRate, 0) . "/min (Esquema Nocturno)"
            ];
        }

        $total = min($minutes * $ratePerMin, $ratePerDay);
        return [
            'strategy' => $this->getCategoryName(),
            'minutes' => $minutes,
            'billableMinutes' => $minutes,
            'ratePerMinute' => $ratePerMin,
            'total' => round($total),
            'formula' => "{$minutes}m x $" . number_format($ratePerMin, 0) . "/min"
        ];
    }
}

class MotocicletaBillingStrategy implements BillingStrategyInterface {
    public function getCategoryName(): string {
        return 'Motocicleta';
    }

    public function calculateFee(int $minutes, array $rateData, bool $isNightMode = false): array {
        $ratePerMin = (float)($rateData['tarifa_por_minuto'] ?? 65.0);
        $ratePerDay = (float)($rateData['tarifa_plena_dia'] ?? 24000.0);
        $grace = (int)($rateData['fraccion_gracia_min'] ?? 5);

        if ($minutes <= $grace) {
            return [
                'strategy' => $this->getCategoryName(),
                'minutes' => $minutes,
                'billableMinutes' => 0,
                'ratePerMinute' => $ratePerMin,
                'total' => 0.0,
                'formula' => "Cortesía Moto ({$minutes}m <= {$grace}m) = $0 COP"
            ];
        }

        $total = min($minutes * $ratePerMin, $ratePerDay);
        return [
            'strategy' => $this->getCategoryName(),
            'minutes' => $minutes,
            'billableMinutes' => $minutes,
            'ratePerMinute' => $ratePerMin,
            'total' => round($total),
            'formula' => "{$minutes}m x $" . number_format($ratePerMin, 0) . "/min"
        ];
    }
}

class BicicletaBillingStrategy implements BillingStrategyInterface {
    public function getCategoryName(): string {
        return 'Bicicleta';
    }

    public function calculateFee(int $minutes, array $rateData, bool $isNightMode = false): array {
        $ratePerMin = (float)($rateData['tarifa_por_minuto'] ?? 25.0);
        $ratePerDay = (float)($rateData['tarifa_plena_dia'] ?? 8000.0);
        $grace = (int)($rateData['fraccion_gracia_min'] ?? 15); // 15 min cortesía ecológica

        if ($minutes <= $grace) {
            return [
                'strategy' => $this->getCategoryName(),
                'minutes' => $minutes,
                'billableMinutes' => 0,
                'ratePerMinute' => $ratePerMin,
                'total' => 0.0,
                'formula' => "Cortesía Bici ({$minutes}m <= {$grace}m) = $0 COP"
            ];
        }

        $total = min($minutes * $ratePerMin, $ratePerDay);
        return [
            'strategy' => $this->getCategoryName(),
            'minutes' => $minutes,
            'billableMinutes' => $minutes,
            'ratePerMinute' => $ratePerMin,
            'total' => round($total),
            'formula' => "{$minutes}m x $" . number_format($ratePerMin, 0) . "/min (Tarifa Ecológica)"
        ];
    }
}

class TarifaNocturnaBillingStrategy implements BillingStrategyInterface {
    public function getCategoryName(): string {
        return 'Tarifa Nocturna / Cruce de Medianoche';
    }

    public function calculateFee(int $minutes, array $rateData, bool $isNightMode = true): array {
        $ratePerDay = (float)($rateData['tarifa_plena_dia'] ?? 42000.0);
        return [
            'strategy' => $this->getCategoryName(),
            'minutes' => $minutes,
            'billableMinutes' => $minutes,
            'ratePerMinute' => 0,
            'total' => $ratePerDay,
            'formula' => "Estadía nocturna / Cruce de medianoche -> Tarifa Plena $" . number_format($ratePerDay, 0) . " COP"
        ];
    }
}

class BillingStrategyContext {
    private BillingStrategyInterface $strategy;

    public function __construct(BillingStrategyInterface $strategy) {
        $this->strategy = $strategy;
    }

    public function setStrategy(BillingStrategyInterface $strategy): void {
        $this->strategy = $strategy;
    }

    public function executeCalculation(int $minutes, array $rateData, bool $isNightMode = false): array {
        return $this->strategy->calculateFee($minutes, $rateData, $isNightMode);
    }

    public static function createForCategory(string $category, bool $isMidnight = false): self {
        if ($isMidnight) {
            return new self(new TarifaNocturnaBillingStrategy());
        }

        switch (trim($category)) {
            case 'Motocicleta':
                return new self(new MotocicletaBillingStrategy());
            case 'Bicicleta':
                return new self(new BicicletaBillingStrategy());
            case 'Automóvil':
            case 'Camioneta':
            case 'Eléctrico EV':
            default:
                return new self(new AutomovilBillingStrategy());
        }
    }
}
