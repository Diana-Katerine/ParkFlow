<?php
/**
 * ParkFlow - API Endpoint: Gestión de Usuarios y Autenticación RBAC
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
        $stmt = $pdo->query("SELECT * FROM `usuarios` ORDER BY `created_at` ASC");
        $rows = $stmt->fetchAll();

        $users = array_map(function($r) {
            $u = [
                'id'           => $r['id'],
                'nombre'       => $r['nombre'],
                'email'        => $r['email'],
                'rol'          => $r['rol'],
                'activo'       => (bool)$r['activo'],
                'ultimoAcceso' => $r['ultimo_acceso']
            ];
            if (!empty($r['placa_asociada'])) {
                $u['placaAsociada'] = $r['placa_asociada'];
            }
            return $u;
        }, $rows);

        sendResponse(true, $users, 'Usuarios obtenidos con éxito');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error consultando usuarios: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();

    // Caso de login: delegar al manejador seguro de autenticación con bcrypt
    if (isset($input['action']) && $input['action'] === 'login') {
        require __DIR__ . '/auth.php';
        exit();
    }

    // Creación de nuevo usuario: solo Administrador
    $currentRole = $_SERVER['HTTP_X_USER_ROLE'] ?? ($input['currentUserRole'] ?? '');
    if ($currentRole !== 'Administrador') {
        sendResponse(false, null, 'Acceso denegado (403): Solo el Administrador autenticado puede crear o modificar cuentas de usuario.', 403);
    }

    $nombre = trim($input['nombre'] ?? '');
    $email = trim(strtolower($input['email'] ?? ''));
    $rol = $input['rol'] ?? 'Cliente';
    $activo = isset($input['activo']) ? (bool)$input['activo'] : true;
    $placa = !empty($input['placaAsociada']) ? strtoupper(trim($input['placaAsociada'])) : null;

    if (strlen($nombre) < 3) {
        sendResponse(false, null, 'El nombre debe tener al menos 3 caracteres.', 400);
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, null, 'Ingrese un correo electrónico válido.', 400);
    }

    try {
        $check = $pdo->prepare("SELECT id FROM `usuarios` WHERE `email` = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            sendResponse(false, null, 'Restricción UNIQUE: Ya existe un usuario registrado con ese correo.', 409);
        }

        $countStmt = $pdo->query("SELECT COUNT(*) as c FROM `usuarios`");
        $count = (int)$countStmt->fetch()['c'];
        $id = sprintf("USR-%03d", $count + 1);
        $ultimoAcceso = 'Recién creado';

        $ins = $pdo->prepare("INSERT INTO `usuarios` (`id`, `nombre`, `email`, `rol`, `activo`, `placa_asociada`, `ultimo_acceso`) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $ins->execute([$id, $nombre, $email, $rol, $activo ? 1 : 0, $placa, $ultimoAcceso]);

        // Registrar auditoría
        $aud = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $aud->execute([
            'AUD-' . uniqid(),
            $input['adminEmail'] ?? 'admin@parkflow.co',
            'Administrador',
            'USER_CREATED',
            'USUARIOS',
            "Nuevo usuario {$email} ({$rol}) creado en MySQL",
            date('Y-m-d H:i:s'),
            'OK'
        ]);

        $created = [
            'id'           => $id,
            'nombre'       => $nombre,
            'email'        => $email,
            'rol'          => $rol,
            'activo'       => $activo,
            'placaAsociada'=> $placa,
            'ultimoAcceso' => $ultimoAcceso
        ];

        sendResponse(true, $created, 'Usuario creado con éxito en MySQL', 201);
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al crear usuario: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $userId = $input['id'] ?? null;

    if (!$userId) {
        sendResponse(false, null, 'ID de usuario requerido', 400);
    }

    try {
        $fields = [];
        $params = [];

        if (isset($input['toggleActivo'])) {
            $stmt = $pdo->prepare("SELECT activo FROM `usuarios` WHERE id = ?");
            $stmt->execute([$userId]);
            $u = $stmt->fetch();
            if ($u) {
                $newActive = (int)$u['activo'] === 1 ? 0 : 1;
                $fields[] = "`activo` = ?";
                $params[] = $newActive;
            }
        } elseif (isset($input['activo'])) {
            $fields[] = "`activo` = ?";
            $params[] = $input['activo'] ? 1 : 0;
        }

        if (isset($input['rol'])) {
            $fields[] = "`rol` = ?";
            $params[] = $input['rol'];
        }

        if (empty($fields)) {
            sendResponse(false, null, 'No hay campos para actualizar', 400);
        }

        $params[] = $userId;
        $sql = "UPDATE `usuarios` SET " . implode(", ", $fields) . " WHERE `id` = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        sendResponse(true, ['id' => $userId], 'Usuario actualizado en MySQL');
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error actualizando usuario: ' . $e->getMessage(), 500);
    }
}

sendResponse(false, null, 'Método no soportado', 405);
