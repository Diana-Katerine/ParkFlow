<?php
/**
 * ParkFlow - Script de Inicialización y Población de Base de Datos MySQL
 * Crea la base de datos 'parkflow_db' y siembra los datos iniciales reales y organizados.
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

    // Limpiar tablas para que no queden datos huérfanos o desorganizados
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `tickets`;");
    $pdo->exec("TRUNCATE TABLE `espacios`;");
    $pdo->exec("TRUNCATE TABLE `tarifas`;");
    $pdo->exec("TRUNCATE TABLE `usuarios`;");
    $pdo->exec("TRUNCATE TABLE `auditoria`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // 3. Sembrar Usuarios / Perfiles organizados por Roles (RBAC)
    $users = [
        // Administradores
        ['USR-001', 'Alejandro Vargas', 'admin@parkpulse.co', 'Administrador', 1, null, '2026-10-07 15:02:40'],
        ['USR-002', 'Diana Katerine Pérez', 'diana.admin@parkflow.co', 'Administrador', 1, null, '2026-10-07 15:10:00'],
        ['USR-003', 'Sofia Navarro', 's.navarro@parkflow.co', 'Administrador', 1, null, '2026-10-07 09:30:15'],

        // Operadores de Patio & Caja
        ['USR-004', 'Camila Mendoza', 'operador@parkpulse.co', 'Operador', 1, null, '2026-10-07 14:55:12'],
        ['USR-005', 'Mateo Restrepo', 'm.restrepo@parkpulse.co', 'Operador', 1, null, '2026-10-07 08:15:00'],
        ['USR-006', 'Andrés Felipe Mora', 'a.mora@parkflow.co', 'Operador', 1, null, '2026-10-06 22:45:00'],

        // Clientes y Conductores Registrados
        ['USR-007', 'Carlos E. Giraldo', 'carlos.giraldo@clientes.co', 'Cliente', 1, 'MDE-314', '2026-10-07 15:00:00'],
        ['USR-008', 'Laura Castellanos', 'l.castellanos@clientes.co', 'Cliente', 1, 'BGT-902', '2026-10-06 19:42:10'],
        ['USR-009', 'Diana K. Pérez', 'cliente@parkpulse.co', 'Cliente', 1, 'KLM-456', '2026-10-07 15:08:19'],
        ['USR-010', 'Santiago Ríos', 'santiago.rios@clientes.co', 'Cliente', 1, 'XRT-82A', '2026-10-07 14:35:10'],
        ['USR-011', 'Valeria Duque', 'valeria.duque@clientes.co', 'Cliente', 1, 'EVX-108', '2026-10-07 14:50:20'],
        ['USR-012', 'Roberto Gómez', 'roberto.gomez@empresas.co', 'Cliente', 1, 'JKL-901', '2026-10-07 13:20:00'],
        ['USR-013', 'Elena Martínez', 'elena.martinez@clientes.co', 'Cliente', 1, 'ZXC-332', '2026-10-06 18:10:00'],
        ['USR-014', 'Patricia Londoño', 'patricia.londono@clientes.co', 'Cliente', 1, 'HJK-512', '2026-10-07 12:45:00'],
        ['USR-015', 'Julián Castro', 'julian.castro@clientes.co', 'Cliente', 1, 'TYU-19B', '2026-10-07 11:30:00']
    ];

    $stmtUser = $pdo->prepare("INSERT INTO `usuarios` (`id`, `nombre`, `email`, `rol`, `activo`, `placa_asociada`, `ultimo_acceso`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    foreach ($users as $u) {
        $stmtUser->execute($u);
    }

    // 4. Sembrar Matriz Tarifaria Oficial (4 Categorías Comerciales)
    $rates = [
        ['RATE-AUTO', 'Automóvil', 110.00, 5800.00, 42000.00, 5, '2026-10-05 09:00'],
        ['RATE-MOTO', 'Motocicleta', 65.00, 3400.00, 24000.00, 5, '2026-10-05 09:00'],
        ['RATE-SUV', 'Camioneta', 135.00, 7200.00, 52000.00, 5, '2026-10-05 09:00'],
        ['RATE-EV', 'Eléctrico EV', 95.00, 5000.00, 38000.00, 10, '2026-10-05 09:00']
    ];

    $stmtRate = $pdo->prepare("INSERT INTO `tarifas` (`id`, `tipo_vehiculo`, `tarifa_por_minuto`, `tarifa_por_hora`, `tarifa_plena_dia`, `fraccion_gracia_min`, `actualizado_en`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");

    foreach ($rates as $r) {
        $stmtRate->execute($r);
    }

    // 5. Sembrar Espacios / Bahías (Exactamente 24 Bahías en 4 Zonas de 6 cupos)
    $spots = [
        // Zona A · Estándar (Automóvil) - Nivel S1
        ['SP-A01', 'A-01', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'OCUPADO', 0, null, 99.9, 'BGT-902', 'TCK-2026-8841'],
        ['SP-A02', 'A-02', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-A03', 'A-03', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'OCUPADO', 0, null, 99.7, 'MDE-314', 'TCK-2026-8839'],
        ['SP-A04', 'A-04', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-A05', 'A-05', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.6, null, null],
        ['SP-A06', 'A-06', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'BLOQUEADO', 0, null, 84.2, null, null],

        // Zona B · EV & VIP (Eléctrico EV) - Nivel S1
        ['SP-B01', 'B-01', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'OCUPADO', 1, 22.0, 99.9, 'KLM-456', 'TCK-2026-8842'],
        ['SP-B02', 'B-02', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],
        ['SP-B03', 'B-03', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.8, null, null],
        ['SP-B04', 'B-04', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'OCUPADO', 1, 50.0, 99.9, 'EVX-108', 'TCK-2026-8844'],
        ['SP-B05', 'B-05', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.7, null, null],
        ['SP-B06', 'B-06', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],

        // Zona C · Motos (Motocicleta) - Nivel S1
        ['SP-C01', 'C-01', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'OCUPADO', 0, null, 99.5, 'XRT-82A', 'TCK-2026-8843'],
        ['SP-C02', 'C-02', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C03', 'C-03', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C04', 'C-04', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-C05', 'C-05', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'OCUPADO', 0, null, 99.6, 'QWE-45F', 'TCK-2026-8845'],
        ['SP-C06', 'C-06', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],

        // Zona D · Camionetas (Camioneta / SUV) - Nivel S2
        ['SP-D01', 'D-01', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'OCUPADO', 1, null, 99.9, 'SUV-779', 'TCK-2026-8840'],
        ['SP-D02', 'D-02', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-D03', 'D-03', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-D04', 'D-04', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-D05', 'D-05', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'BLOQUEADO', 0, null, 78.5, null, null],
        ['SP-D06', 'D-06', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],

        // Zona A Extendida (A-07 a A-16)
        ['SP-A07', 'A-07', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-A08', 'A-08', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-A09', 'A-09', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-A10', 'A-10', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-A11', 'A-11', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-A12', 'A-12', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.6, null, null],
        ['SP-A13', 'A-13', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-A14', 'A-14', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-A15', 'A-15', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-A16', 'A-16', 'Nivel S1', 'Zona A · Estándar', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],

        // Zona B Extendida (B-07 a B-14)
        ['SP-B07', 'B-07', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],
        ['SP-B08', 'B-08', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.8, null, null],
        ['SP-B09', 'B-09', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 50.0, 99.9, null, null],
        ['SP-B10', 'B-10', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 22.0, 99.7, null, null],
        ['SP-B11', 'B-11', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.9, null, null],
        ['SP-B12', 'B-12', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 0, 11.4, 99.8, null, null],
        ['SP-B13', 'B-13', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 50.0, 99.9, null, null],
        ['SP-B14', 'B-14', 'Nivel S1', 'Zona B · EV & VIP', 'Eléctrico EV', 'DISPONIBLE', 1, 22.0, 99.8, null, null],

        // Zona C Extendida (C-07 a C-16)
        ['SP-C07', 'C-07', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-C08', 'C-08', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C09', 'C-09', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-C10', 'C-10', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-C11', 'C-11', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C12', 'C-12', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-C13', 'C-13', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-C14', 'C-14', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-C15', 'C-15', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-C16', 'C-16', 'Nivel S1', 'Zona C · Motos', 'Motocicleta', 'DISPONIBLE', 0, null, 99.8, null, null],

        // Zona D Extendida (D-07 a D-14)
        ['SP-D07', 'D-07', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 1, null, 99.9, null, null],
        ['SP-D08', 'D-08', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-D09', 'D-09', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-D10', 'D-10', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 1, null, 99.9, null, null],
        ['SP-D11', 'D-11', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-D12', 'D-12', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-D13', 'D-13', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-D14', 'D-14', 'Nivel S2', 'Zona D · Camionetas', 'Camioneta', 'DISPONIBLE', 1, null, 99.8, null, null],

        // Zona E: Estándar N2 (E-01 a E-12)
        ['SP-E01', 'E-01', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E02', 'E-02', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-E03', 'E-03', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-E04', 'E-04', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E05', 'E-05', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-E06', 'E-06', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E07', 'E-07', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-E08', 'E-08', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-E09', 'E-09', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-E10', 'E-10', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-E11', 'E-11', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-E12', 'E-12', 'Nivel S2', 'Zona E · Estándar N2', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],

        // Zona F: Flotas S3 (F-01 a F-12)
        ['SP-F01', 'F-01', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-F02', 'F-02', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-F03', 'F-03', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-F04', 'F-04', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-F05', 'F-05', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-F06', 'F-06', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-F07', 'F-07', 'Nivel S3', 'Zona F · Flotas S3', 'Camioneta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-F08', 'F-08', 'Nivel S3', 'Zona F · Flotas S3', 'Camioneta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-F09', 'F-09', 'Nivel S3', 'Zona F · Flotas S3', 'Camioneta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-F10', 'F-10', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-F11', 'F-11', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-F12', 'F-12', 'Nivel S3', 'Zona F · Flotas S3', 'Automóvil', 'DISPONIBLE', 0, null, 99.9, null, null],

        // Zona G: Eco & Bicicletas (G-01 a G-08)
        ['SP-G01', 'G-01', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-G02', 'G-02', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-G03', 'G-03', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-G04', 'G-04', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-G05', 'G-05', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.8, null, null],
        ['SP-G06', 'G-06', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
        ['SP-G07', 'G-07', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.7, null, null],
        ['SP-G08', 'G-08', 'Nivel S1', 'Zona G · Eco & Bicicletas', 'Bicicleta', 'DISPONIBLE', 0, null, 99.9, null, null],
    ];

    $stmtSpot = $pdo->prepare("INSERT INTO `espacios` (`id`, `codigo`, `nivel`, `zona`, `tipo_permitido`, `estado`, `es_vip`, `potencia_ev_kw`, `salud_sensor`, `placa_actual`, `ticket_actual_id`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($spots as $s) {
        $stmtSpot->execute($s);
    }

    // 6. Sembrar Flujo Vehicular y Tickets (Activos e Historial por Períodos)
    $now = time();
    $isoAgo = function($mins) use ($now) {
        return gmdate('Y-m-d\TH:i:s\Z', $now - ($mins * 60));
    };

    $tickets = [
        // 7 Tickets Activos (En Patio, exactamente correspondientes a las bahías ocupadas)
        ['LOG-1001', 'TCK-2026-8839', 'MDE-314', 'Automóvil', 'A-03', $isoAgo(1005), null, null, null, null, 'ACTIVO', 'Mateo Restrepo', null, 1, 'Carlos E. Giraldo'],
        ['LOG-1002', 'TCK-2026-8840', 'SUV-779', 'Camioneta', 'D-01', $isoAgo(260), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Inversiones Del Norte'],
        ['LOG-1003', 'TCK-2026-8841', 'BGT-902', 'Automóvil', 'A-01', $isoAgo(135), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Laura Castellanos'],
        ['LOG-1004', 'TCK-2026-8842', 'KLM-456', 'Eléctrico EV', 'B-01', $isoAgo(82), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Diana K. Pérez'],
        ['LOG-1005', 'TCK-2026-8843', 'XRT-82A', 'Motocicleta', 'C-01', $isoAgo(47), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Santiago Ríos'],
        ['LOG-1006', 'TCK-2026-8844', 'EVX-108', 'Eléctrico EV', 'B-04', $isoAgo(29), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Valeria Duque'],
        ['LOG-1007', 'TCK-2026-8845', 'QWE-45F', 'Motocicleta', 'C-05', $isoAgo(18), null, null, null, null, 'ACTIVO', 'Camila Mendoza', null, 0, 'Andrés Felipe Mora'],

        // Finalizados - HOY (Últimas 24h) -> 4 Tickets Finalizados
        ['LOG-0996', 'TCK-2026-8834', 'HJK-512', 'Automóvil', 'A-02', $isoAgo(210), $isoAgo(90), 120, 11600.00, 'QR Digital', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Patricia Londoño'],
        ['LOG-0995', 'TCK-2026-8830', 'TYU-19B', 'Motocicleta', 'C-02', $isoAgo(320), $isoAgo(230), 90, 5350.00, 'Efectivo', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Julián Castro'],
        ['LOG-0993', 'TCK-2026-8821', 'JKL-901', 'Camioneta', 'D-02', $isoAgo(640), $isoAgo(400), 240, 28800.00, 'Tarjeta', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Roberto Gómez'],
        ['LOG-0990', 'TCK-2026-8818', 'AUT-521', 'Automóvil', 'A-05', $isoAgo(120), $isoAgo(60), 60, 6050.00, 'Efectivo', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Esteban Morales'],

        // Finalizados - ESTA SEMANA (Hace 2 a 6 días) -> Total Semana: 9 Tickets
        ['LOG-0992', 'TCK-2026-8815', 'KLM-456', 'Eléctrico EV', 'B-01', $isoAgo(2920 + 180), $isoAgo(2920), 180, 15000.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Diana K. Pérez'],
        ['LOG-0991', 'TCK-2026-8810', 'KLM-456', 'Eléctrico EV', 'B-02', $isoAgo(4320 + 125), $isoAgo(4320), 125, 10475.00, 'QR Digital', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Diana K. Pérez'],
        ['LOG-0994', 'TCK-2026-8805', 'ZXC-332', 'Automóvil', 'A-04', $isoAgo(5760 + 840), $isoAgo(5760), 840, 42000.00, 'Efectivo', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 1, 'Elena Martínez'],
        ['LOG-0989', 'TCK-2026-8802', 'MTO-77C', 'Motocicleta', 'C-03', $isoAgo(7200 + 140), $isoAgo(7200), 140, 8200.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Fernando Ruiz'],
        ['LOG-0988', 'TCK-2026-8798', 'CAM-552', 'Camioneta', 'D-03', $isoAgo(8640 + 300), $isoAgo(8640), 300, 36000.00, 'Efectivo', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Gloria Estupiñán'],

        // Finalizados - ESTE MES (Hace 10 a 28 días) -> Total Mes: 15 Tickets
        ['LOG-0987', 'TCK-2026-8785', 'AUT-112', 'Automóvil', 'A-05', $isoAgo(14400 + 220), $isoAgo(14400), 220, 24500.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Mauricio Vega'],
        ['LOG-0986', 'TCK-2026-8772', 'EVX-220', 'Eléctrico EV', 'B-03', $isoAgo(20160 + 190), $isoAgo(20160), 190, 18900.00, 'QR Digital', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Sandra Ospina'],
        ['LOG-0985', 'TCK-2026-8760', 'SUV-331', 'Camioneta', 'D-04', $isoAgo(25920 + 380), $isoAgo(25920), 380, 42000.00, 'Efectivo', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Óscar Jiménez'],
        ['LOG-0984', 'TCK-2026-8751', 'MTO-33B', 'Motocicleta', 'C-04', $isoAgo(31680 + 140), $isoAgo(31680), 140, 8775.00, 'QR Digital', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Lucas Benítez'],
        ['LOG-0983', 'TCK-2026-8740', 'AUT-990', 'Automóvil', 'A-02', $isoAgo(36000 + 310), $isoAgo(36000), 310, 33550.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Paola Quintero'],
        ['LOG-0982', 'TCK-2026-8732', 'MTO-12D', 'Motocicleta', 'C-06', $isoAgo(40320 + 200), $isoAgo(40320), 200, 12000.00, 'Efectivo', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Diego Restrepo'],

        // Finalizados - TODO EL HISTORIAL (> 30 días) -> Total Historial: 21 Tickets
        ['LOG-0981', 'TCK-2026-8710', 'SUV-888', 'Camioneta', 'D-05', $isoAgo(50400 + 400), $isoAgo(50400), 400, 48000.00, 'Tarjeta', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Alfonso Castro'],
        ['LOG-0980', 'TCK-2026-8695', 'AUT-444', 'Automóvil', 'A-01', $isoAgo(64800 + 420), $isoAgo(64800), 420, 42000.00, 'Efectivo', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Carmen Villalobos'],
        ['LOG-0979', 'TCK-2026-8680', 'EVX-901', 'Eléctrico EV', 'B-05', $isoAgo(79200 + 320), $isoAgo(79200), 320, 29500.00, 'QR Digital', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Rodrigo Lara'],
        ['LOG-0978', 'TCK-2026-8665', 'MTO-66E', 'Motocicleta', 'C-02', $isoAgo(93600 + 250), $isoAgo(93600), 250, 14500.00, 'Tarjeta', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Alejandra Santos'],
        ['LOG-0977', 'TCK-2026-8650', 'AUT-777', 'Automóvil', 'A-04', $isoAgo(108000 + 450), $isoAgo(108000), 450, 42000.00, 'Efectivo', 'FINALIZADO', 'Camila Mendoza', 'Camila Mendoza', 0, 'Gustavo Rojas'],
        ['LOG-0976', 'TCK-2026-8630', 'CAM-999', 'Camioneta', 'D-06', $isoAgo(122400 + 480), $isoAgo(122400), 480, 48000.00, 'QR Digital', 'FINALIZADO', 'Mateo Restrepo', 'Camila Mendoza', 0, 'Isabel Cuéllar']
    ];

    $stmtTck = $pdo->prepare("INSERT INTO `tickets` (`id`, `ticket_codigo`, `placa`, `tipo_vehiculo`, `spot_codigo`, `fecha_ingreso`, `fecha_salida`, `minutos_transcurridos`, `valor_pagado`, `metodo_pago`, `estado`, `operador_entrada`, `operador_salida`, `cruzo_medianoche`, `propietario_nombre`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($tickets as $t) {
        $stmtTck->execute($t);
    }

    // 7. Sembrar Auditoría inicial
    $audits = [
        ['AUD-9001', 'admin@parkpulse.co', 'Administrador', 'SYNC_RATES_CONFIG', 'TARIFAS', 'Verificación de matriz tarifaria 2026 con soporte de cruce de medianoche', '2026-10-07 14:10:05', 'OK'],
        ['AUD-9002', 'operador@parkpulse.co', 'Operador', 'ENTRY_REGISTERED', 'FLUJO_VEHICULAR', 'Ingreso vehículo KLM-456 asignado a bahía B-01 (Ticket TCK-2026-8842)', '2026-10-07 14:29:18', 'OK'],
        ['AUD-9003', 'operador@parkpulse.co', 'Operador', 'DUPLICATE_PLATE_BLOCKED', 'FLUJO_VEHICULAR', 'Intento de doble ingreso bloqueado para placa activa MDE-314 en A-03', '2026-10-07 14:42:51', 'ALERTA'],
        ['AUD-9004', 'cliente@parkpulse.co', 'Cliente', 'UNAUTHORIZED_ROUTE_ATTEMPT', 'RBAC_SECURITY', 'Bloqueo HTTP 403 Forbidden al intentar acceder a /admin/tarifas con rol Cliente', '2026-10-07 14:58:02', 'BLOQUEADO_403'],
        ['AUD-9005', 'diana.admin@parkflow.co', 'Administrador', 'MYSQL_XAMPP_INIT', 'AUTH', 'Base de datos parkflow_db organizada y sincronizada con éxito en MySQL (XAMPP)', date('Y-m-d H:i:s'), 'OK']
    ];

    $stmtAudit = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

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
