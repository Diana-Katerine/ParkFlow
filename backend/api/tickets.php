<?php
/**
 * ParkFlow - API Endpoint: Flujo Vehicular y Tickets
 * Registro de Entrada, Salida/Cobro, y Consulta de Estancias
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    sendResponse(false, null, 'Error de conexión a la base de datos MySQL', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. OBTENER TICKETS / HISTORIAL
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `tickets` ORDER BY `created_at` DESC");
        $rows = $stmt->fetchAll();

        $logs = array_map(function($r) {
            $item = [
                'id'                  => $r['id'],
                'ticketCodigo'        => $r['ticket_codigo'],
                'placa'               => $r['placa'],
                'tipoVehiculo'        => $r['tipo_vehiculo'],
                'spotCodigo'          => $r['spot_codigo'],
                'fechaIngreso'        => $r['fecha_ingreso'],
                'estado'              => $r['estado'],
                'operadorEntrada'     => $r['operador_entrada'],
                'cruzoMedianoche'     => (bool)$r['cruzo_medianoche']
            ];
            if (!empty($r['fecha_salida'])) {
                $item['fechaSalida'] = $r['fecha_salida'];
            }
            if ($r['minutos_transcurridos'] !== null) {
                $item['minutosTranscurridos'] = (int)$r['minutos_transcurridos'];
            }
            if ($r['valor_pagado'] !== null) {
                $item['valorPagado'] = (float)$r['valor_pagado'];
            }
            if (!empty($r['metodo_pago'])) {
                $item['metodoPago'] = $r['metodo_pago'];
            }
            if (!empty($r['operador_salida'])) {
                $item['operadorSalida'] = $r['operador_salida'];
            }
            if (!empty($r['propietario_nombre'])) {
                $item['propietarioNombre'] = $r['propietario_nombre'];
            }
            return $item;
        }, $rows);

        sendResponse(true, $logs, 'Tickets recuperados con éxito');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error consultando tickets: ' . $e->getMessage(), 500);
    }
}

// 2. REGISTRAR ENTRADA DE VEHÍCULO (POST)
if ($method === 'POST') {
    $input = getJsonInput();

    // Soporte para simular cruce de medianoche vía POST si viene acción
    if (isset($input['action']) && $input['action'] === 'shift_midnight') {
        $logId = $input['logId'] ?? null;
        $hoursBack = (int)($input['hoursBack'] ?? 16);
        if (!$logId) {
            sendResponse(false, null, 'ID de ticket requerido', 400);
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM `tickets` WHERE `id` = ?");
            $stmt->execute([$logId]);
            $ticket = $stmt->fetch();
            if (!$ticket) {
                sendResponse(false, null, 'Ticket no encontrado', 404);
            }

            $currentIngreso = strtotime($ticket['fecha_ingreso']);
            $shiftedISO = gmdate('Y-m-d\TH:i:s\Z', $currentIngreso - ($hoursBack * 3600));

            $upd = $pdo->prepare("UPDATE `tickets` SET `fecha_ingreso` = ?, `cruzo_medianoche` = 1 WHERE `id` = ?");
            $upd->execute([$shiftedISO, $logId]);

            // Registrar auditoría
            $audStmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $audStmt->execute([
                'AUD-' . uniqid(),
                $input['operadorEmail'] ?? 'operador@parkflow.co',
                'Operador',
                'MIDNIGHT_CROSSING_SIMULATION',
                'TARIFAS',
                "Ajuste temporal en MySQL (-{$hoursBack}h) en ticket {$ticket['ticket_codigo']} para prueba de cruce de medianoche",
                date('Y-m-d H:i:s'),
                'OK'
            ]);

            sendResponse(true, ['id' => $logId, 'fechaIngreso' => $shiftedISO, 'cruzoMedianoche' => true], 'Hora de ingreso ajustada');
        } catch (PDOException $e) {
            sendResponse(false, null, 'Error al ajustar hora: ' . $e->getMessage(), 500);
        }
    }

    $placa = strtoupper(trim($input['placa'] ?? ''));
    $tipoVehiculo = $input['tipoVehiculo'] ?? '';
    $spotCodigo = trim($input['spotCodigo'] ?? '');
    $operadorEntrada = $input['operadorEntrada'] ?? 'Operador de Turno';
    $operadorEmail = $input['operadorEmail'] ?? 'operador@parkflow.co';
    $propietarioNombre = $input['propietarioNombre'] ?? null;

    if (empty($placa) || empty($tipoVehiculo) || empty($spotCodigo)) {
        sendResponse(false, null, 'Placa, tipo de vehículo y código de bahía son requeridos', 400);
    }

    try {
        $pdo->beginTransaction();

        // Regla 1: Validar que no haya una estancia activa para esta placa
        $checkPlateStmt = $pdo->prepare("SELECT * FROM `tickets` WHERE `placa` = ? AND `estado` = 'ACTIVO'");
        $checkPlateStmt->execute([$placa]);
        $existing = $checkPlateStmt->fetch();

        if ($existing) {
            $pdo->rollBack();
            // Registrar auditoría del rechazo
            $audStmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $audStmt->execute([
                'AUD-' . uniqid(),
                $operadorEmail,
                'Operador',
                'DUPLICATE_ACTIVE_PLATE_REJECTED',
                'FLUJO_VEHICULAR',
                "Rechazo en MySQL: Placa {$placa} ya tiene estancia activa en bahía {$existing['spot_codigo']} (Ticket {$existing['ticket_codigo']})",
                date('Y-m-d H:i:s'),
                'ALERTA'
            ]);

            sendResponse(false, null, "Vehículo dentro del parqueadero: La placa {$placa} ya registra una estancia activa en la bahía {$existing['spot_codigo']} (Ticket {$existing['ticket_codigo']}).", 409);
        }

        // Regla 2: Validar que la bahía exista y esté disponible
        $checkSpotStmt = $pdo->prepare("SELECT * FROM `espacios` WHERE `codigo` = ? FOR UPDATE");
        $checkSpotStmt->execute([$spotCodigo]);
        $spot = $checkSpotStmt->fetch();

        if (!$spot) {
            $pdo->rollBack();
            sendResponse(false, null, "La bahía {$spotCodigo} no existe", 404);
        }

        if ($spot['estado'] !== 'DISPONIBLE') {
            $pdo->rollBack();
            sendResponse(false, null, "La bahía {$spotCodigo} no está disponible (Estado actual: {$spot['estado']})", 409);
        }

        // Generar IDs
        $countStmt = $pdo->query("SELECT COUNT(*) as c FROM `tickets`");
        $ticketCount = (int)$countStmt->fetch()['c'];
        $nextNumber = 8846 + $ticketCount;
        $ticketCodigo = "TCK-2026-" . $nextNumber;
        $ticketId = "LOG-" . (1008 + $ticketCount);
        $fechaIngreso = gmdate('Y-m-d\TH:i:s\Z');

        // Insertar ticket
        $insTicket = $pdo->prepare("INSERT INTO `tickets` (`id`, `ticket_codigo`, `placa`, `tipo_vehiculo`, `spot_codigo`, `fecha_ingreso`, `estado`, `operador_entrada`, `cruzo_medianoche`, `propietario_nombre`) 
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', ?, 0, ?)");
        $insTicket->execute([
            $ticketId,
            $ticketCodigo,
            $placa,
            $tipoVehiculo,
            $spotCodigo,
            $fechaIngreso,
            $operadorEntrada,
            $propietarioNombre
        ]);

        // Actualizar estado del espacio
        $updSpot = $pdo->prepare("UPDATE `espacios` SET `estado` = 'OCUPADO', `placa_actual` = ?, `ticket_actual_id` = ? WHERE `codigo` = ?");
        $updSpot->execute([$placa, $ticketCodigo, $spotCodigo]);

        // Registrar auditoría
        $audStmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $audStmt->execute([
            'AUD-' . uniqid(),
            $operadorEmail,
            'Operador',
            'VEHICLE_ENTRY_REGISTERED',
            'FLUJO_VEHICULAR',
            "Ingreso en MySQL de {$placa} ({$tipoVehiculo}) en bahía {$spotCodigo} · Ticket {$ticketCodigo}",
            date('Y-m-d H:i:s'),
            'OK'
        ]);

        $pdo->commit();

        $created = [
            'id'              => $ticketId,
            'ticketCodigo'    => $ticketCodigo,
            'placa'           => $placa,
            'tipoVehiculo'    => $tipoVehiculo,
            'spotCodigo'      => $spotCodigo,
            'fechaIngreso'    => $fechaIngreso,
            'estado'          => 'ACTIVO',
            'operadorEntrada' => $operadorEntrada,
            'cruzoMedianoche' => false,
            'propietarioNombre' => $propietarioNombre
        ];

        sendResponse(true, $created, "Ingreso registrado con éxito en MySQL (Ticket {$ticketCodigo})", 201);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(false, null, 'Error registrando entrada en MySQL: ' . $e->getMessage(), 500);
    }
}

// 3. REGISTRAR SALIDA Y COBRO DE VEHÍCULO (PUT)
if ($method === 'PUT') {
    $input = getJsonInput();
    $logId = $input['logId'] ?? null;
    $metodoPago = $input['metodoPago'] ?? 'Efectivo';
    $valorPagado = (float)($input['valorPagado'] ?? 0);
    $minutosTranscurridos = (int)($input['minutosTranscurridos'] ?? 0);
    $cruzoMedianoche = !empty($input['cruzoMedianoche']);
    $fechaSalida = $input['fechaSalidaISO'] ?? gmdate('Y-m-d\TH:i:s\Z');
    $operadorSalida = $input['operadorSalida'] ?? 'Operador de Turno';
    $operadorEmail = $input['operadorEmail'] ?? 'operador@parkflow.co';

    if (!$logId) {
        sendResponse(false, null, 'Falta el ID del ticket', 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM `tickets` WHERE `id` = ? AND `estado` = 'ACTIVO' FOR UPDATE");
        $stmt->execute([$logId]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            $pdo->rollBack();
            sendResponse(false, null, 'Registro activo no encontrado en la base de datos', 404);
        }

        // Actualizar ticket
        $updTicket = $pdo->prepare("UPDATE `tickets` SET 
            `fecha_salida` = ?, 
            `minutos_transcurridos` = ?, 
            `valor_pagado` = ?, 
            `metodo_pago` = ?, 
            `estado` = 'FINALIZADO', 
            `operador_salida` = ?, 
            `cruzo_medianoche` = ? 
            WHERE `id` = ?");
        $updTicket->execute([
            $fechaSalida,
            $minutosTranscurridos,
            $valorPagado,
            $metodoPago,
            $operadorSalida,
            $cruzoMedianoche ? 1 : 0,
            $logId
        ]);

        // Liberar espacio en MySQL
        $updSpot = $pdo->prepare("UPDATE `espacios` SET `estado` = 'DISPONIBLE', `placa_actual` = NULL, `ticket_actual_id` = NULL WHERE `codigo` = ?");
        $updSpot->execute([$ticket['spot_codigo']]);

        // Registrar auditoría
        $audStmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $audStmt->execute([
            'AUD-' . uniqid(),
            $operadorEmail,
            'Operador',
            'VEHICLE_EXIT_AND_PAYMENT',
            'FLUJO_VEHICULAR',
            "Salida en MySQL de {$ticket['placa']} · Bahía {$ticket['spot_codigo']} liberada · Cobro $" . number_format($valorPagado, 0, ',', '.') . " ({$metodoPago})",
            date('Y-m-d H:i:s'),
            'OK'
        ]);

        $pdo->commit();

        $completed = [
            'id'                  => $ticket['id'],
            'ticketCodigo'        => $ticket['ticket_codigo'],
            'placa'               => $ticket['placa'],
            'tipoVehiculo'        => $ticket['tipo_vehiculo'],
            'spotCodigo'          => $ticket['spot_codigo'],
            'fechaIngreso'        => $ticket['fecha_ingreso'],
            'fechaSalida'         => $fechaSalida,
            'minutosTranscurridos' => $minutosTranscurridos,
            'valorPagado'         => $valorPagado,
            'metodoPago'          => $metodoPago,
            'estado'              => 'FINALIZADO',
            'operadorEntrada'     => $ticket['operador_entrada'],
            'operadorSalida'      => $operadorSalida,
            'cruzoMedianoche'     => $cruzoMedianoche,
            'propietarioNombre'   => $ticket['propietario_nombre']
        ];

        sendResponse(true, $completed, "Salida y cobro procesados correctamente en MySQL");
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(false, null, 'Error al registrar salida en MySQL: ' . $e->getMessage(), 500);
    }
}

sendResponse(false, null, 'Método no permitido', 405);
