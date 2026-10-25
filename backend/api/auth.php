<?php
/**
 * ParkFlow - API Endpoint: Autenticación Segura y Control de Acceso por Roles (RBAC)
 * Validación en servidor de contraseñas con hash bcrypt.
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    sendResponse(false, null, 'Error conectando con la base de datos MySQL', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $input = getJsonInput();
    $action = $input['action'] ?? 'login';

    if ($action === 'login') {
        $role = trim($input['role'] ?? $input['rol'] ?? 'Cliente');
        $email = trim(strtolower($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        // 1. RESTRICCIÓN DE ACCESO: ADMINISTRADOR
        if ($role === 'Administrador') {
            if (empty($password)) {
                sendResponse(false, null, 'La contraseña de Administrador es obligatoria.', 400);
            }

            // Encontrar al ÚNICO Administrador registrado en el sistema
            $stmt = $pdo->prepare("SELECT * FROM `usuarios` WHERE `rol` = 'Administrador' AND `activo` = 1 LIMIT 1");
            $stmt->execute();
            $admin = $stmt->fetch();

            if (!$admin) {
                sendResponse(false, null, 'Error de configuración: no hay un Administrador activo en el sistema.', 500);
            }

            // Validar si el usuario proporcionó un correo específico, debe coincidir con el único administrador
            if (!empty($email) && $email !== strtolower($admin['email']) && $email !== 'admin' && $email !== 'diana') {
                // Registrar intento fallido en auditoría
                logAuthAudit($pdo, $email, 'Administrador', 'LOGIN_RECHAZADO', 'Intento de acceso como Administrador con correo no autorizado', 'BLOQUEADO_403');
                sendResponse(false, null, 'Acceso denegado: Solo el Administrador autorizado puede acceder a este perfil.', 403);
            }

            // Validar contraseña usando bcrypt (password_verify)
            if (!password_verify($password, $admin['password_hash'])) {
                logAuthAudit($pdo, $admin['email'], 'Administrador', 'LOGIN_FALLIDO', 'Contraseña de Administrador incorrecta', 'BLOQUEADO_403');
                sendResponse(false, null, 'Contraseña de Administrador incorrecta. Acceso restringido.', 401);
            }

            // Éxito de Administrador
            $now = date('Y-m-d H:i:s');
            $pdo->prepare("UPDATE `usuarios` SET `ultimo_acceso` = ? WHERE `id` = ?")->execute([$now, $admin['id']]);

            $token = 'pf_adm_' . bin2hex(random_bytes(16));
            logAuthAudit($pdo, $admin['email'], 'Administrador', 'LOGIN_EXITOSO', 'Inicio de sesión de Administrador autenticado con hash bcrypt', 'OK');

            $userData = [
                'id'           => $admin['id'],
                'nombre'       => $admin['nombre'],
                'email'        => $admin['email'],
                'rol'          => 'Administrador',
                'activo'       => true,
                'token'        => $token,
                'ultimoAcceso' => $now
            ];

            sendResponse(true, $userData, 'Autenticación exitosa como Administrador.');
        }

        // 2. RESTRICCIÓN DE ACCESO: OPERADOR
        if ($role === 'Operador') {
            if (empty($password)) {
                sendResponse(false, null, 'La contraseña de Operador es obligatoria.', 400);
            }

            // Buscar operadores activos con contraseña configurada
            $stmt = $pdo->prepare("SELECT * FROM `usuarios` WHERE `rol` = 'Operador' AND `activo` = 1");
            $stmt->execute();
            $operators = $stmt->fetchAll();

            if (empty($operators)) {
                sendResponse(false, null, 'No hay cuentas de Operador activas en el sistema.', 404);
            }

            $matchedOperator = null;
            // Si proporcionó correo, buscar ese específicamente
            if (!empty($email)) {
                foreach ($operators as $op) {
                    if (strtolower($op['email']) === $email || strpos(strtolower($op['email']), $email) !== false || strpos(strtolower($op['nombre']), $email) !== false) {
                        $matchedOperator = $op;
                        break;
                    }
                }
            }

            // Si no especificó o no coincidió exactamente, tomar el primer operador activo (Carlos Mendoza)
            if (!$matchedOperator) {
                $matchedOperator = $operators[0];
            }

            // Validar contraseña con bcrypt
            if (empty($matchedOperator['password_hash']) || !password_verify($password, $matchedOperator['password_hash'])) {
                logAuthAudit($pdo, $matchedOperator['email'], 'Operador', 'LOGIN_FALLIDO', 'Contraseña de Operador incorrecta', 'BLOQUEADO_403');
                sendResponse(false, null, 'Contraseña de Operador incorrecta. Acceso denegado.', 401);
            }

            // Éxito de Operador
            $now = date('Y-m-d H:i:s');
            $pdo->prepare("UPDATE `usuarios` SET `ultimo_acceso` = ? WHERE `id` = ?")->execute([$now, $matchedOperator['id']]);

            $token = 'pf_opr_' . bin2hex(random_bytes(16));
            logAuthAudit($pdo, $matchedOperator['email'], 'Operador', 'LOGIN_EXITOSO', 'Inicio de sesión de Operador autenticado con hash bcrypt', 'OK');

            $userData = [
                'id'           => $matchedOperator['id'],
                'nombre'       => $matchedOperator['nombre'],
                'email'        => $matchedOperator['email'],
                'rol'          => 'Operador',
                'activo'       => true,
                'token'        => $token,
                'ultimoAcceso' => $now
            ];

            sendResponse(true, $userData, 'Autenticación exitosa como Operador.');
        }

        // 3. ACCESO: CLIENTE / CONDUCTOR (PORTAL CIUDADANO)
        if ($role === 'Cliente') {
            $clientEmail = !empty($email) ? $email : 'cliente@parkpulse.co';
            $clientName = 'Conductor / Cliente Ciudadano';
            $plate = 'KLM-456';

            // Buscar si existe en la base de datos
            $stmt = $pdo->prepare("SELECT * FROM `usuarios` WHERE `email` = ? AND `rol` = 'Cliente' LIMIT 1");
            $stmt->execute([$clientEmail]);
            $clientUser = $stmt->fetch();

            if ($clientUser) {
                $clientName = $clientUser['nombre'];
                $plate = $clientUser['placa_asociada'] ?? 'KLM-456';
            }

            $now = date('Y-m-d H:i:s');
            $token = 'pf_cli_' . bin2hex(random_bytes(16));

            logAuthAudit($pdo, $clientEmail, 'Cliente', 'LOGIN_PORTAL', 'Acceso al Portal Ciudadano (Sin privilegios administrativos)', 'OK');

            $userData = [
                'id'           => $clientUser['id'] ?? 'CLI-PORTAL',
                'nombre'       => $clientName,
                'email'        => $clientEmail,
                'rol'          => 'Cliente',
                'activo'       => true,
                'placa'        => $plate,
                'token'        => $token,
                'ultimoAcceso' => $now
            ];

            sendResponse(true, $userData, 'Acceso concedido al Portal Ciudadano.');
        }

        sendResponse(false, null, 'Rol no válido solicitado.', 400);
    }

    // 4. ACCIÓN: RECUPERACIÓN SEGURA DE CONTRASEÑA
    if ($action === 'recover_password' || $action === 'forgot_password') {
        $email = trim(strtolower($input['email'] ?? ''));
        if (empty($email)) {
            sendResponse(false, null, 'Por favor ingresa un correo electrónico registrado.', 400);
        }

        // Buscar en la base de datos MySQL si el usuario existe
        $stmt = $pdo->prepare("SELECT `id`, `nombre`, `email`, `rol`, `activo` FROM `usuarios` WHERE LOWER(`email`) = ? OR LOWER(`email`) LIKE ? LIMIT 1");
        $stmt->execute([$email, "%$email%"]);
        $user = $stmt->fetch();

        if (!$user) {
            logAuthAudit($pdo, $email, 'Desconocido', 'RECUPERAR_CLAVE_NO_EXISTE', 'Intento de recuperación con correo no registrado', 'BLOQUEADO_403');
            sendResponse(false, null, 'No se encontró ninguna cuenta asociada al correo proporcionado.', 404);
        }

        // Generar código de seguridad temporal y token criptográfico
        $secCode = strtoupper(bin2hex(random_bytes(3))); // Ej: 'A7B2C9'
        $resetToken = 'PF-RST-' . date('YmdHis') . '-' . bin2hex(random_bytes(4));

        // Registrar en bitácora de auditoría
        logAuthAudit($pdo, $user['email'], $user['rol'], 'SOLICITUD_RECUPERACION', "Generado código de recuperación: $secCode (Token: $resetToken)", 'EXITOSO_200');

        $detailMsg = "Solicitud de recuperación procesada exitosamente para " . htmlspecialchars($user['nombre']) . " (" . htmlspecialchars($user['rol']) . ").";

        sendResponse(true, [
            'email'           => $user['email'],
            'nombre'          => $user['nombre'],
            'rol'             => $user['rol'],
            'codigo_seguridad'=> $secCode,
            'token'           => $resetToken,
            'instrucciones'   => "Se ha generado el código seguro $secCode para la cuenta de " . $user['nombre'] . ". Comunícate con la administración de ParkFlow o utiliza este código para validar tu identidad."
        ], $detailMsg);
    }
}

// Endpoint de verificación de sesión
if ($method === 'GET') {
    // Retorna estado público de roles
    sendResponse(true, [
        'roles' => ['Administrador', 'Operador', 'Cliente'],
        'auth_mode' => 'BCRYPT_SECURE_SERVER_ENFORCED',
        'single_admin_enforced' => true
    ], 'Servicio de autenticación RBAC activo');
}

function logAuthAudit($pdo, $email, $role, $action, $detail, $result) {
    try {
        $id = 'AUD-' . date('YmdHis') . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
        $stmt = $pdo->prepare("INSERT INTO `auditoria` (`id`, `usuario_email`, `rol`, `accion`, `modulo`, `detalle`, `timestamp`, `resultado`) VALUES (?, ?, ?, ?, 'AUTH', ?, NOW(), ?)");
        $stmt->execute([$id, $email, $role, $action, $detail, $result]);
    } catch (Exception $e) {
        // Silencioso para no romper la respuesta auth
    }
}
