<?php
/**
 * ParkFlow - API Endpoint: Espacios / Bahías de Parqueo
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
        $stmt = $pdo->query("SELECT * FROM `espacios` ORDER BY `codigo` ASC");
        $rows = $stmt->fetchAll();

        $spots = array_map(function($r) {
            $spot = [
                'id'            => $r['id'],
                'codigo'        => $r['codigo'],
                'nivel'         => $r['nivel'],
                'zona'          => $r['zona'],
                'tipoPermitido' => $r['tipo_permitido'],
                'estado'        => $r['estado'],
                'saludSensor'   => (float)$r['salud_sensor'],
            ];
            if ((int)$r['es_vip'] === 1) {
                $spot['esVIP'] = true;
            }
            if ($r['potencia_ev_kw'] !== null) {
                $spot['potenciaEVKw'] = (float)$r['potencia_ev_kw'];
            }
            if (!empty($r['placa_actual'])) {
                $spot['placaActual'] = $r['placa_actual'];
            }
            if (!empty($r['ticket_actual_id'])) {
                $spot['ticketActualId'] = $r['ticket_actual_id'];
            }
            return $spot;
        }, $rows);

        sendResponse(true, $spots, 'Espacios recuperados con éxito');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al consultar espacios: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $spotId = $input['id'] ?? null;
    $nuevoEstado = $input['estado'] ?? null;

    if (!$spotId) {
        sendResponse(false, null, 'Falta el parámetro id del espacio', 400);
    }

    try {
        // Verificar espacio
        $checkStmt = $pdo->prepare("SELECT * FROM `espacios` WHERE `id` = ?");
        $checkStmt->execute([$spotId]);
        $spot = $checkStmt->fetch();

        if (!$spot) {
            sendResponse(false, null, 'Espacio no encontrado', 404);
        }

        // Si se pide alternar mantenimiento
        if (isset($input['toggleMantenimiento']) && $input['toggleMantenimiento']) {
            if ($spot['estado'] === 'OCUPADO') {
                sendResponse(false, null, 'No se puede bloquear un espacio ocupado', 400);
            }
            $nuevoEstado = ($spot['estado'] === 'BLOQUEADO') ? 'DISPONIBLE' : 'BLOQUEADO';
        }

        $stmt = $pdo->prepare("UPDATE `espacios` SET `estado` = COALESCE(?, `estado`), `salud_sensor` = COALESCE(?, `salud_sensor`) WHERE `id` = ?");
        $stmt->execute([
            $nuevoEstado,
            isset($input['saludSensor']) ? (float)$input['saludSensor'] : null,
            $spotId
        ]);

        sendResponse(true, ['id' => $spotId, 'estado' => $nuevoEstado], 'Espacio actualizado correctamente');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al actualizar espacio: ' . $e->getMessage(), 500);
    }
}

sendResponse(false, null, 'Método no soportado', 405);
