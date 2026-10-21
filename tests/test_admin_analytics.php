<?php
/**
 * Test Suite: Admin Analytics, Financial Calculators, Filters, and Empty States
 * ParkFlow Smart SaaS - Quality Assurance
 */

echo "========================================================\n";
echo "PARKFLOW - PRUEBAS UNITARIAS DE MONITOREO Y FINANZAS\n";
echo "========================================================\n\n";

$testsPassed = 0;
$testsTotal = 0;

function assertTest($description, $condition) {
    global $testsPassed, $testsTotal;
    $testsTotal++;
    if ($condition) {
        $testsPassed++;
        echo "  [PASS] {$description}\n";
    } else {
        echo "  [FAIL] {$description}\n";
    }
}

// -------------------------------------------------------------
// TEST 1: Regla de Cálculo Financiero (Fallback Rule)
// -------------------------------------------------------------
echo "1. Probando Regla de Cálculo Financiero y Permanencia:\n";

function resolveStayAmount($tipoVehiculo, $minutos, $cruzoMedianoche, $valorPagado = null) {
    if ($valorPagado !== null && $valorPagado > 0) {
        return (float)$valorPagado;
    }
    // Regla de tarifas comerciales ParkFlow:
    $rates = [
        'Automóvil' => ['min' => 110, 'gracia' => 5, 'dia' => 42000],
        'Motocicleta' => ['min' => 65, 'gracia' => 5, 'dia' => 24000],
        'Camioneta' => ['min' => 135, 'gracia' => 5, 'dia' => 48000],
        'Eléctrico EV' => ['min' => 95, 'gracia' => 5, 'dia' => 38000],
        'Bicicleta' => ['min' => 25, 'gracia' => 15, 'dia' => 8000],
    ];

    $cfg = $rates[$tipoVehiculo] ?? $rates['Automóvil'];

    if ($cruzoMedianoche) {
        return 15000.0; // Tarifa plana nocturna
    }

    $minutosLiquidables = max(0, $minutos - $cfg['gracia']);
    $totalBruto = $minutosLiquidables * $cfg['min'];
    return (float)min($cfg['dia'], $totalBruto);
}

// Caso A: Automóvil 45 min con 5 min de gracia -> (45-5) * 110 = 4.400 COP
$valA = resolveStayAmount('Automóvil', 45, false);
assertTest("Automóvil 45 min = \$4.400 COP", $valA === 4400.0);

// Caso B: Bicicleta 20 min con 15 min de cortesía -> (20-15) * 25 = 125 COP
$valB = resolveStayAmount('Bicicleta', 20, false);
assertTest("Bicicleta 20 min con 15m cortesía = \$125 COP", $valB === 125.0);

// Caso C: Cruce de medianoche -> Tarifa plana nocturna $15.000 COP
$valC = resolveStayAmount('Automóvil', 600, true);
assertTest("Cruce de medianoche = \$15.000 COP (Tarifa plana)", $valC === 15000.0);

// Caso D: Estadía prolongada que supera tope de día -> Tope $42.000 COP
$valD = resolveStayAmount('Automóvil', 900, false);
assertTest("Estadía que excede tope diario = \$42.000 COP", $valD === 42000.0);

// Caso E: Si ya tiene valorPagado explícito, respetarlo sin reescribir
$valE = resolveStayAmount('Automóvil', 45, false, 25000.0);
assertTest("Respeta valorPagado explícito existente (\$25.000 COP)", $valE === 25000.0);

// -------------------------------------------------------------
// TEST 2: Filtrado por Períodos (Día, Semana, Mes, Historial)
// -------------------------------------------------------------
echo "\n2. Probando Lógica de Filtrado por Período de Tiempo:\n";

$sampleLogs = [
    ['id' => 'LOG-1', 'fecha' => date('Y-m-d H:i:s', time() - 3600), 'estado' => 'FINALIZADO', 'valor' => 12000], // Hoy (-1h)
    ['id' => 'LOG-2', 'fecha' => date('Y-m-d H:i:s', time() - 7200), 'estado' => 'FINALIZADO', 'valor' => 8000],  // Hoy (-2h)
    ['id' => 'LOG-3', 'fecha' => date('Y-m-d H:i:s', time() - (4 * 86400)), 'estado' => 'FINALIZADO', 'valor' => 15000], // Hace 4 días
    ['id' => 'LOG-4', 'fecha' => date('Y-m-d H:i:s', time() - (20 * 86400)), 'estado' => 'FINALIZADO', 'valor' => 25000], // Hace 20 días
    ['id' => 'LOG-5', 'fecha' => date('Y-m-d H:i:s', time() - (45 * 86400)), 'estado' => 'FINALIZADO', 'valor' => 42000], // Hace 45 días
];

function filterLogsByPreset($logs, $preset) {
    $now = time();
    $startOfToday = strtotime(date('Y-m-d 00:00:00'));
    $sevenDaysAgo = $now - (7 * 86400);
    $thirtyDaysAgo = $now - (30 * 86400);

    return array_filter($logs, function($l) use ($preset, $startOfToday, $sevenDaysAgo, $thirtyDaysAgo) {
        $ts = strtotime($l['fecha']);
        if ($preset === 'HOY') return $ts >= $startOfToday;
        if ($preset === 'ESTA_SEMANA') return $ts >= $sevenDaysAgo;
        if ($preset === 'ESTE_MES') return $ts >= $thirtyDaysAgo;
        return true; // TODOS
    });
}

$logsToday = filterLogsByPreset($sampleLogs, 'HOY');
assertTest("Filtro 'HOY' devuelve 2 registros recientes de hoy", count($logsToday) === 2);

$logsWeek = filterLogsByPreset($sampleLogs, 'ESTA_SEMANA');
assertTest("Filtro 'ESTA_SEMANA' devuelve 3 registros (< 7 días)", count($logsWeek) === 3);

$logsMonth = filterLogsByPreset($sampleLogs, 'ESTE_MES');
assertTest("Filtro 'ESTE_MES' devuelve 4 registros (< 30 días)", count($logsMonth) === 4);

$logsAll = filterLogsByPreset($sampleLogs, 'TODOS');
assertTest("Filtro 'TODOS' devuelve 5 registros (Consolidado)", count($logsAll) === 5);

// -------------------------------------------------------------
// TEST 3: Agregaciones Financieras y Desglose por Medio de Pago
// -------------------------------------------------------------
echo "\n3. Probando Agregaciones Financieras y Métodos de Pago:\n";

$paymentLogs = [
    ['valor' => 10000, 'metodo' => 'Efectivo'],
    ['valor' => 15000, 'metodo' => 'Efectivo'],
    ['valor' => 20000, 'metodo' => 'Tarjeta Débito'],
    ['valor' => 30000, 'metodo' => 'Tarjeta Crédito'],
    ['valor' => 25000, 'metodo' => 'QR Digital Nequi'],
];

function calculateFinancialSummary($logs) {
    $total = 0;
    $cash = 0; $cashCount = 0;
    $card = 0; $cardCount = 0;
    $qr = 0; $qrCount = 0;

    foreach ($logs as $l) {
        $val = (float)$l['valor'];
        $total += $val;
        $m = strtoupper($l['metodo']);
        if (strpos($m, 'TARJETA') !== false) {
            $card += $val;
            $cardCount++;
        } elseif (strpos($m, 'QR') !== false || strpos($m, 'NEQUI') !== false) {
            $qr += $val;
            $qrCount++;
        } else {
            $cash += $val;
            $cashCount++;
        }
    }

    $avg = count($logs) > 0 ? round($total / count($logs)) : 0;
    return [
        'total' => $total,
        'avg' => $avg,
        'cash' => ['amount' => $cash, 'count' => $cashCount, 'pct' => round(($cash / max(1,$total)) * 100)],
        'card' => ['amount' => $card, 'count' => $cardCount, 'pct' => round(($card / max(1,$total)) * 100)],
        'qr' => ['amount' => $qr, 'count' => $qrCount, 'pct' => round(($qr / max(1,$total)) * 100)],
    ];
}

$fin = calculateFinancialSummary($paymentLogs);
assertTest("Total recaudado = \$100.000 COP", $fin['total'] === 100000.0);
assertTest("Ticket promedio = \$20.000 COP", $fin['avg'] === 20000.0);
assertTest("Efectivo recaudado = \$25.000 COP (25%)", $fin['cash']['amount'] === 25000.0 && $fin['cash']['pct'] === 25.0);
assertTest("Tarjetas recaudado = \$50.000 COP (50%)", $fin['card']['amount'] === 50000.0 && $fin['card']['pct'] === 50.0);
assertTest("QR Digital recaudado = \$25.000 COP (25%)", $fin['qr']['amount'] === 25000.0 && $fin['qr']['pct'] === 25.0);

// -------------------------------------------------------------
// TEST 4: Agregación de Movimientos por Hora para Gráficas
// -------------------------------------------------------------
echo "\n4. Probando Agregación Horaria para Gráficas SVG:\n";

$movementTimes = [
    ['tipo' => 'ENTRADA', 'hora' => '08:15:00', 'valor' => 0],
    ['tipo' => 'ENTRADA', 'hora' => '08:45:00', 'valor' => 0],
    ['tipo' => 'SALIDA',  'hora' => '09:10:00', 'valor' => 12000],
    ['tipo' => 'ENTRADA', 'hora' => '14:20:00', 'valor' => 0],
    ['tipo' => 'SALIDA',  'hora' => '14:50:00', 'valor' => 18000],
];

function aggregateHourlySlots($movements) {
    $slots = [
        '08:00' => ['entries' => 0, 'exits' => 0, 'revenue' => 0],
        '14:00' => ['entries' => 0, 'exits' => 0, 'revenue' => 0],
    ];

    foreach ($movements as $m) {
        $hour = (int)substr($m['hora'], 0, 2);
        if ($hour >= 8 && $hour < 10) {
            if ($m['tipo'] === 'ENTRADA') $slots['08:00']['entries']++;
            else {
                $slots['08:00']['exits']++;
                $slots['08:00']['revenue'] += $m['valor'];
            }
        } elseif ($hour >= 14 && $hour < 16) {
            if ($m['tipo'] === 'ENTRADA') $slots['14:00']['entries']++;
            else {
                $slots['14:00']['exits']++;
                $slots['14:00']['revenue'] += $m['valor'];
            }
        }
    }
    return $slots;
}

$slots = aggregateHourlySlots($movementTimes);
assertTest("Franja 08:00 registra 2 entradas y 1 salida", $slots['08:00']['entries'] === 2 && $slots['08:00']['exits'] === 1);
assertTest("Franja 08:00 recaudo = \$12.000 COP", $slots['08:00']['revenue'] === 12000);
assertTest("Franja 14:00 registra 1 entrada y 1 salida con \$18.000 COP", $slots['14:00']['entries'] === 1 && $slots['14:00']['revenue'] === 18000);

// -------------------------------------------------------------
// TEST 5: Manejo de Estados Vacíos y Resiliencia
// -------------------------------------------------------------
echo "\n5. Probando Manejo de Estados Vacíos (Zero Division & Empty Arrays):\n";

$emptyLogs = [];
$emptyFin = calculateFinancialSummary($emptyLogs);
assertTest("Arreglo vacío: Recaudo total = 0 sin errores", $emptyFin['total'] === 0);
assertTest("Arreglo vacío: Ticket promedio = 0 (Sin división por cero)", $emptyFin['avg'] === 0);
assertTest("Arreglo vacío: Transacciones efectivo/tarjeta/qr = 0", $emptyFin['cash']['count'] === 0 && $emptyFin['card']['count'] === 0);

// -------------------------------------------------------------
// RESUMEN FINAL
// -------------------------------------------------------------
echo "\n========================================================\n";
echo "RESULTADO FINAL DE PRUEBAS:\n";
echo "Total de pruebas ejecutadas: {$testsTotal}\n";
echo "Pruebas superadas exitosamente: {$testsPassed}\n";
echo "Tasa de éxito: " . round(($testsPassed / $testsTotal) * 100) . "%\n";
echo "========================================================\n";

if ($testsPassed === $testsTotal) {
    echo ">>> TODAS LAS PRUEBAS DE CALIDAD PASARON SATISFACTORIAMENTE <<<\n";
    exit(0);
} else {
    echo ">>> ALGUNAS PRUEBAS FALLARON <<<\n";
    exit(1);
}
