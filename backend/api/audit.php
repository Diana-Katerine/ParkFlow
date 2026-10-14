<?php
/**
 * ParkFlow - API Endpoint: Registros de Auditoría y Seguridad
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
        $stmt = $pdo->query("SELECT * FROM `auditoria` ORDER BY `created_at` DESC LIMIT 100");
        $rows = $stmt->fetchAll();

        $audits = array_map(function($r) {
            return [
                'id'           => $r['id'],
                'usuarioEmail' => $r['usuario_email'],
                'rol'          => $r['rol'],
                'accion'       => $r['accion'],
                'modulo'       => $r['modulo'],
                'detalle'      => $r['detalle'],
                'timestamp'    => $r['timestamp'],
                'resultado'    => $r['resultado']
            ];
        }, $rows);

        sendResponse(true, $audits, 'Auditoría obtenida con éxito');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error consultando auditoría: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();

    $usuarioEmail = $input['usuarioEmail'] ?? 'anonimo@visitante.co';
    $rol = $input['rol'] ?? 'Cliente';
    $accion = $input['accion'] ?? 'ACTION';
    $modulo = $input['modulo'] ?? 'AUTH';
    $detalle = $input['detalle'] ?? '';
    $resultado = $input['resultado'] ?? 'OK';
    $timestamp = $input['timestamp'] ?? date('Y-m-d H:i:s');
    $id = 'AUD-' . (rand(9100, 99999));

    try {
        $stmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $usuarioEmail, $rol, $accion, $modulo, $detalle, $timestamp, $resultado]);

        $created = [
            'id'           => $id,
            'usuarioEmail' => $usuarioEmail,
            'rol'          => $rol,
            'accion'       => $accion,
            'modulo'       => $modulo,
            'detalle'      => $detalle,
            'timestamp'    => $timestamp,
            'resultado'    => $resultado
        ];

        sendResponse(true, $created, 'Registro de auditoría guardado en MySQL', 201);
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error guardando auditoría: ' . $e->getMessage(), 500);
    }
}

sendResponse(false, null, 'Método no soportado', 405);
