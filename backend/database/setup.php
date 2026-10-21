<?php
/**
 * ParkFlow - Script de Inicialización y Población de Base de Datos MySQL
 * Crea la base de datos 'parkflow_db' y siembra los datos iniciales reales.
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$rootPdo = $db->getRootServerConnection();

if (!$rootPdo) {
    if (php_sapi_name() === 'cli') {
        echo "ERROR: No se pudo conectar a MySQL en 127.0.0.1:3306 con usuario 'root' y sin contraseña.\n";
        echo "Asegúrate de que el módulo MySQL esté iniciado en el Panel de Control de XAMPP.\n";
        exit(1);
    } else {
        sendResponse(false, null, "No se pudo conectar a MySQL en XAMPP. Verifica que MySQL esté INICIADO en el Panel de Control de XAMPP.", 500);
    }
}

try {
    // 1. Crear base de datos si no existe
    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `parkflow_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $rootPdo->exec("USE `parkflow_db`;");

    // 2. Ejecutar esquema SQL
    $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
    $rootPdo->exec($schemaSql);

    $pdo = $db->getConnection();

    // 3. Sembrar Usuarios iniciales
    $users = [
        ['USR-001', 'Camila Mendoza', 'operador@parkpulse.co', 'Operador', 1, null, '2026-10-07 14:55:12'],
        ['USR-002', 'Alejandro Vargas', 'admin@parkpulse.co', 'Administrador', 1, null, '2026-10-07 15:02:40'],
        ['USR-003', 'Diana K. Pérez', 'cliente@parkpulse.co', 'Cliente', 1, 'KLM-456', '2026-10-07 15:08:19'],
        ['USR-004', 'Mateo Restrepo', 'm.restrepo@parkpulse.co', 'Operador', 1, null, '2026-10-07 08:15:00'],
        ['USR-005', 'Laura Castellanos', 'l.castellanos@clientes.co', 'Cliente', 1, 'BGT-902', '2026-10-06 19:42:10']
    ];

    $stmtUser = $pdo->prepare("INSERT INTO `usuarios` (`id`, `nombre`, `email`, `rol`, `activo`, `placa_asociada`, `ultimo_acceso`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`), `rol`=VALUES(`rol`), `activo`=VALUES(`activo`), `placa_asociada`=VALUES(`placa_asociada`), `ultimo_acceso`=VALUES(`ultimo_acceso`)");

    foreach ($users as $u) {
        $stmtUser->execute($u);
    }

    // 4. Sembrar Tarifas iniciales
    $rates = [
        ['RATE-AUTO', 'Automóvil', 110.00, 5800.00, 42000.00, 5, '2026-10-05 09:00'],
        ['RATE-MOTO', 'Motocicleta', 65.00, 3400.00, 24000.00, 5, '2026-10-05 09:00'],
        ['RATE-SUV', 'Camioneta', 135.00, 7200.00, 52000.00, 5, '2026-10-05 09:00'],
        ['RATE-EV', 'Eléctrico EV', 95.00, 5000.00, 38000.00, 10, '2026-10-05 09:00'],
        ['RATE-BICI', 'Bicicleta', 25.00, 1200.00, 8000.00, 15, '2026-10-21 10:00']
    ];

    $stmtRate = $pdo->prepare("INSERT INTO `tarifas` (`id`, `tipo_vehiculo`, `tarifa_por_minuto`, `tarifa_por_hora`, `tarifa_plena_dia`, `fraccion_gracia_min`, `actualizado_en`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `tarifa_por_minuto`=VALUES(`tarifa_por_minuto`), `tarifa_por_hora`=VALUES(`tarifa_por_hora`), `tarifa_plena_dia`=VALUES(`tarifa_plena_dia`), `fraccion_gracia_min`=VALUES(`fraccion_gracia_min`), `actualizado_en`=VALUES(`actualizado_en`)");

    foreach ($rates as $r) {
        $stmtRate->execute($r);
    }

    // 5. Sembrar Espacios / Bahías (28 espacios en Zonas A, B, C, D, E)
    $spots = [
        // Zona A · Estándar (Automóvil)
        ['SP-A01', 'A-01', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'OCUPADO', 0, null, 99.9, 'BGT-902', 'TCK-2026-8841'],
        ['SP-A02', 'A-02', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-A03', 'A-03', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'OCUPADO', 0, null, 99.7, 'MDE-314', 'TCK-2026-8839'],
        ['SP-A04', 'A-04', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-A05', 'A-05', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.6, null, null],
        ['SP-A06', 'A-06', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'BLOQUEADO', 0, null, 84.2, null, null],

        // Zona B · EV & VIP (Eléctrico EV)
        ['SP-B01', 'B-01', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'OCUPADO', 1, 22.0, 99.9, 'KLM-456', 'TCK-2026-8842'],
        ['SP-B02', 'B-02', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],
        ['SP-B03', 'B-03', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.8, null, null],
        ['SP-B04', 'B-04', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'OCUPADO', 1, 50.0, 99.9, 'EVX-108', 'TCK-2026-8844'],
        ['SP-B05', 'B-05', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.7, null, null],
        ['SP-B06', 'B-06', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],

        // Zona C · Motos
        ['SP-C01', 'C-01', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'OCUPADO', 0, null, 99.5, 'XRT-82A', 'TCK-2026-8843'],
        ['SP-C02', 'C-02', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C03', 'C-03', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C04', 'C-04', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-C05', 'C-05', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'OCUPADO', 0, null, 99.6, 'QWE-45F', 'TCK-2026-8845'],
        ['SP-C06', 'C-06', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],

        // Zona D · Camionetas
        ['SP-D01', 'D-01', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'OCUPADO', 1, null, 99.9, 'SUV-779', 'TCK-2026-8840'],
        ['SP-D02', 'D-02', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-D03', 'D-03', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-D04', 'D-04', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-D05', 'D-05', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'BLOQUEADO', 0, null, 78.5, null, null],
        ['SP-D06', 'D-06', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],

        // Zona E · Bicicletero Ecológico (Bicicleta)
        ['SP-E01', 'E-01', 'Nivel S1', 'Zona E · Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E02', 'E-02', 'Nivel S1', 'Zona E · Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-E03', 'E-03', 'Nivel S1', 'Zona E · Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E04', 'E-04', 'Nivel S1', 'Zona E · Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
    ];

    $stmtSpot = $pdo->prepare("INSERT INTO `espacios` (`id`, `codigo`, `nivel`, `zona`, `tipo_permitido`, `estado`, `es_vip`, `potencia_ev_kw`, `salud_sensor`, `placa_actual`, `ticket_actual_id`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `estado`=VALUES(`estado`), `placa_actual`=VALUES(`placa_actual`), `ticket_actual_id`=VALUES(`ticket_actual_id`), `salud_sensor`=VALUES(`salud_sensor`)");

    foreach ($spots as $s) {
        $stmtSpot->execute($s);
    }

    // 6. Sembrar Tickets iniciales (Activos e Históricos)
    $now = time();
    $isoAgo = function($mins) use ($now) {
        return gmdate('Y-m-d\TH:i:s\Z', $now - ($mins * 60));
    };

    $tickets = [
        // Activos
        ['LOG-1001', 'TCK-2026-8839', 'MDE-314', 'Automóvil', 'A-03', $isoAgo(1005), null, null, null, null, 'ACTIVO', 'Mateo Restrepo', null, 1, 'Carlos E. Giraldo'],
        ['LOG-1002', 'TCK-2026-8840', 'SUV-779', 'Camioneta', 'D-01', $isoAgo(260), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Inversiones Del Norte'],
        ['LOG-1003', 'TCK-2026-8841', 'BGT-902', 'Automóvil', 'A-01', $isoAgo(135), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Laura Castellanos'],
        ['LOG-1004', 'TCK-2026-8842', 'KLM-456', 'Eléctrico EV', 'B-01', $isoAgo(82), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Diana K. Pérez'],
        ['LOG-1005', 'TCK-2026-8843', 'XRT-82A', 'Motocicleta', 'C-01', $isoAgo(47), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Santiago Ríos'],
        ['LOG-1006', 'TCK-2026-8844', 'EVX-108', 'Eléctrico EV', 'B-04', $isoAgo(29), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Valeria Duque'],
        ['LOG-1007', 'TCK-2026-8845', 'QWE-45F', 'Motocicleta', 'C-05', $isoAgo(18), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Andrés Felipe Mora'],

        // Finalizados (Histórico)
        ['LOG-0991', 'TCK-2026-8810', 'KLM-456', 'Eléctrico EV', 'B-02', $isoAgo(1620), $isoAgo(1495), 125, 10475.00, 'QR Digital', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Diana K. Pérez'],
        ['LOG-0992', 'TCK-2026-8815', 'KLM-456', 'Eléctrico EV', 'B-01', $isoAgo(3100), $isoAgo(2920), 180, 15000.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Diana K. Pérez'],
        ['LOG-0993', 'TCK-2026-8821', 'JKL-901', 'Camioneta', 'D-02', $isoAgo(640), $isoAgo(400), 240, 28800.00, 'Tarjeta', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Roberto Gómez'],
        ['LOG-0994', 'TCK-2026-8825', 'ZXC-332', 'Automóvil', 'A-04', $isoAgo(1800), $isoAgo(960), 840, 42000.00, 'Efectivo', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 1, 'Elena Martínez'],
        ['LOG-0995', 'TCK-2026-8830', 'TYU-19B', 'Motocicleta', 'C-02', $isoAgo(320), $isoAgo(230), 90, 5350.00, 'Efectivo', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Julián Castro'],
        ['LOG-0996', 'TCK-2026-8834', 'HJK-512', 'Automóvil', 'A-02', $isoAgo(210), $isoAgo(90), 120, 11600.00, 'QR Digital', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Patricia Londoño']
    ];

    $stmtTck = $pdo->prepare("INSERT INTO `tickets` (`id`, `ticket_codigo`, `placa`, `tipo_vehiculo`, `spot_codigo`, `fecha_ingreso`, `fecha_salida`, `minutos_transcurridos`, `valor_pagado`, `metodo_pago`, `estado`, `operador_entrada`, `operador_salida`, `cruzo_medianoche`, `propietario_nombre`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `estado`=VALUES(`estado`), `fecha_salida`=VALUES(`fecha_salida`), `minutos_transcurridos`=VALUES(`minutos_transcurridos`), `valor_pagado`=VALUES(`valor_pagado`), `metodo_pago`=VALUES(`metodo_pago`)");

    foreach ($tickets as $t) {
        $stmtTck->execute($t);
    }

    // 7. Sembrar Auditoría inicial
    $audits = [
        ['AUD-9001', 'admin@parkpulse.co', 'Administrador', 'SYNC_RATES_CONFIG', 'TARIFAS', 'Verificación de matriz tarifaria 2026 con soporte de cruce de medianoche', '2026-10-07 14:10:05', 'OK'],
        ['AUD-9002', 'operador@parkpulse.co', 'Operador', 'ENTRY_REGISTERED', 'FLUJO_VEHICULAR', 'Ingreso vehículo KLM-456 asignado a bahía B-01 (Ticket TCK-2026-8842)', '2026-10-07 14:29:18', 'OK'],
        ['AUD-9003', 'operador@parkpulse.co', 'Operador', 'DUPLICATE_PLATE_BLOCKED', 'FLUJO_VEHICULAR', 'Intento de doble ingreso bloqueado para placa activa MDE-314 en A-03', '2026-10-07 14:42:51', 'ALERTA'],
        ['AUD-9004', 'cliente@parkpulse.co', 'Cliente', 'UNAUTHORIZED_ROUTE_ATTEMPT', 'RBAC_SECURITY', 'Bloqueo HTTP 403 Forbidden al intentar acceder a /admin/tarifas con rol Cliente', '2026-10-07 14:58:02', 'BLOQUEADO_403'],
        ['AUD-9005', 'sistema@parkflow.co', 'Administrador', 'MYSQL_XAMPP_INIT', 'AUTH', 'Base de datos parkflow_db inicializada y sincronizada con éxito en MySQL (XAMPP)', date('Y-m-d H:i:s'), 'OK']
    ];

    $stmtAudit = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `detalle`=VALUES(`detalle`)");

    foreach ($audits as $a) {
        $stmtAudit->execute($a);
    }

    $summary = [
        'database' => 'parkflow_db',
        'usuarios' => count($users),
        'tarifas'  => count($rates),
        'espacios' => count($spots),
        'tickets'  => count($tickets),
        'auditoria'=> count($audits),
        'status'   => 'Base de datos MySQL configurada y sembrada con éxito.'
    ];

    if (php_sapi_name() === 'cli') {
        echo "====================================================\n";
        echo " ParkFlow - MySQL & XAMPP DB Setup Exitoso\n";
        echo "====================================================\n";
        echo "Base de Datos:  parkflow_db\n";
        echo "Usuarios:       " . count($users) . "\n";
        echo "Tarifas:        " . count($rates) . "\n";
        echo "Espacios:       " . count($spots) . "\n";
        echo "Tickets:        " . count($tickets) . "\n";
        echo "Auditoría:      " . count($audits) . "\n";
        echo "Servidor:       127.0.0.1:3306 (XAMPP)\n";
        echo "====================================================\n";
    } else {
        sendResponse(true, $summary, "Base de datos parkflow_db creada y poblada exitosamente en MySQL (XAMPP).");
    }

} catch (PDOException $e) {
    if (php_sapi_name() === 'cli') {
        echo "ERROR PDO: " . $e->getMessage() . "\n";
        exit(1);
    } else {
        sendResponse(false, null, "Error al configurar MySQL: " . $e->getMessage(), 500);
    }
}
