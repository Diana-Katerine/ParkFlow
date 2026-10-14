<?php
/**
 * ParkFlow - API Endpoint: Configuración de Tarifas
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    sendResponse(false, null, 'Error de conexión a la base de datos MySQL', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `tarifas` ORDER BY `id` ASC");
        $rows = $stmt->fetchAll();

        $rates = array_map(function($r) {
            return [
                'id'                => $r['id'],
                'tipoVehiculo'      => $r['tipo_vehiculo'],
                'tarifaPorMinuto'   => (float)$r['tarifa_por_minuto'],
                'tarifaPorHora'     => (float)$r['tarifa_por_hora'],
                'tarifaPlenaDia'    => (float)$r['tarifa_plena_dia'],
                'fraccionGraciaMin' => (int)$r['fraccion_gracia_min'],
                'actualizadoEn'     => $r['actualizado_en']
            ];
        }, $rows);

        sendResponse(true, $rates, 'Tarifas obtenidas con éxito');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error consultando tarifas: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $id = $input['id'] ?? null;
    $tarifaPorMinuto = $input['tarifaPorMinuto'] ?? null;
    $tarifaPorHora = $input['tarifaPorHora'] ?? null;
    $tarifaPlenaDia = $input['tarifaPlenaDia'] ?? null;
    $fraccionGraciaMin = $input['fraccionGraciaMin'] ?? null;
    $actualizadoEn = date('Y-m-d H:i');

    if (!$id) {
        sendResponse(false, null, 'ID de tarifa requerido', 400);
    }

    try {
        $stmt = $pdo->prepare("UPDATE `tarifas` SET 
            `tarifa_por_minuto` = COALESCE(?, `tarifa_por_minuto`),
            `tarifa_por_hora` = COALESCE(?, `tarifa_por_hora`),
            `tarifa_plena_dia` = COALESCE(?, `tarifa_plena_dia`),
            `fraccion_gracia_min` = COALESCE(?, `fraccion_gracia_min`),
            `actualizado_en` = ?
            WHERE `id` = ?");
        $stmt->execute([
            $tarifaPorMinuto !== null ? (float)$tarifaPorMinuto : null,
            $tarifaPorHora !== null ? (float)$tarifaPorHora : null,
            $tarifaPlenaDia !== null ? (float)$tarifaPlenaDia : null,
            $fraccionGraciaMin !== null ? (int)$fraccionGraciaMin : null,
            $actualizadoEn,
            $id
        ]);

        sendResponse(true, ['id' => $id, 'actualizadoEn' => $actualizadoEn], 'Tarifa actualizada correctamente en MySQL');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error actualizando tarifa: ' . $e->getMessage(), 500);
    }
}

sendResponse(false, null, 'Método no soportado', 405);
