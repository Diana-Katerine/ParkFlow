<?php
/**
 * ParkFlow - API Endpoint: Demostración de Patrones de Diseño y Dominios DDD
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../patterns/Strategy.php';
require_once __DIR__ . '/../patterns/Observer.php';
require_once __DIR__ . '/../patterns/State.php';
require_once __DIR__ . '/../patterns/DTO.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'overview';

// 1. GET: Resumen de Arquitectura, Dominios DDD y Patrones
if ($method === 'GET' && $action === 'overview') {
    $db = new Database();
    $pdo = $db->getConnection();

    // Capacidad por dominio
    $spotsQuery = $pdo->query("SELECT `tipo_permitido`, COUNT(*) as total, SUM(CASE WHEN `estado`='OCUPADO' THEN 1 ELSE 0 END) as ocupados FROM `espacios` GROUP BY `tipo_permitido`");
    $capacity = $spotsQuery->fetchAll();

    sendResponse(true, [
        'dddDomains' => [
            [
                'name' => 'Dominio de Acceso y Estacionamiento',
                'description' => 'Gestiona la ocupación, controlando el ingreso y salida de vehículos a través del número de placa. Administra la capacidad máxima instalada para automóviles, motocicletas y bicicletas.',
                'entities' => ['Vehículo', 'Espacio/Bahía', 'CapacidadMáxima', 'SensorIoT'],
                'metrics' => $capacity
            ],
            [
                'name' => 'Dominio de Facturación y Tarifas',
                'description' => 'Encargado del cálculo algorítmico de permanencia de los vehículos y la liquidación automática monetaria. Maneja los esquemas tarifarios dinámicos y la generación de los consecutivos únicos para los tickets digitales.',
                'entities' => ['TicketDigital', 'ConsecutivoÚnico', 'TarifaDinámica', 'AlgoritmoLiquidación'],
                'status' => 'Activo · Sincronizado MySQL'
            ],
            [
                'name' => 'Dominio de Identidad y Auditoría',
                'description' => 'Administra los perfiles de usuario y roles, específicamente Administrador y Operador. Controla la autenticación segura mediante tokens JWT y mantiene el log de auditoría de las acciones críticas.',
                'entities' => ['Usuario', 'RolRBAC', 'TokenJWT', 'LogAuditoría'],
                'status' => 'Activo · JWT Token Autenticado'
            ]
        ],
        'designPatterns' => [
            'Strategy' => 'Cálculo algorítmico de permanencia y costos intercambiable (Auto, Moto, Bici, Tarifa Nocturna)',
            'Observer' => 'Monitoreo dinámico de sensores IoT con notificación reactiva a mapa, contadores y bitácora',
            'State' => 'Ciclo de vida de bahías con transiciones válidas entre Libre, Ocupado y Mantenimiento',
            'DTO' => 'Data Transfer Objects para saneamiento y protección de la base de datos en respuestas JSON'
        ]
    ]);
}

// 2. POST: Simulación de Sensor IoT mediante Patrón Observer
if ($method === 'POST' && $action === 'simulate_observer') {
    $input = getJsonInput();
    $spotCode = trim($input['spotCode'] ?? 'A-02');
    $newState = trim($input['newState'] ?? 'OCUPADO');
    $plate = trim($input['plate'] ?? 'SIM-888');

    $subject = new IoTSensorSubject();
    $subject->attach(new SpotMapObserver());
    $subject->attach(new DashboardMetricsObserver());
    $subject->attach(new AuditLoggerObserver());

    $event = $subject->simulateSensorReading($spotCode, $newState, $plate);

    sendResponse(true, $event, 'Patrón Observer ejecutado: Notificación enviada con éxito a 3 observadores.');
}

// 3. POST: Ejecutar Patrón Strategy
if ($method === 'POST' && $action === 'calculate_strategy') {
    $input = getJsonInput();
    $category = $input['category'] ?? 'Automóvil';
    $minutes = (int)($input['minutes'] ?? 60);
    $isNight = !empty($input['isNight']);

    $db = new Database();
    $pdo = $db->getConnection();
    $stmt = $pdo->prepare("SELECT * FROM `tarifas` WHERE `tipo_vehiculo` = ?");
    $stmt->execute([$category]);
    $rateRow = $stmt->fetch() ?: ['tarifa_por_minuto' => 110, 'tarifa_por_hora' => 5800, 'tarifa_plena_dia' => 42000, 'fraccion_gracia_min' => 5];

    $context = BillingStrategyContext::createForCategory($category, $isNight);
    $result = $context->executeCalculation($minutes, $rateRow, $isNight);

    sendResponse(true, $result, 'Patrón Strategy ejecutado: Cálculo algorítmico resuelto.');
}
