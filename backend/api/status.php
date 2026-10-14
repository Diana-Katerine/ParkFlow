<?php
/**
 * ParkFlow - API Endpoint: Estado de Conexión XAMPP & MySQL
 */

require_once __DIR__ . '/../config/database.php';

$db = new Database();
$pdo = $db->getConnection();

if (!$pdo) {
    sendResponse(false, [
        'connected' => false,
        'php_version' => phpversion(),
        'host' => $db->getHost(),
        'port' => $db->getPort(),
        'database' => $db->getDbName(),
        'error' => 'No se pudo conectar al servidor MySQL en XAMPP. Asegúrese de que el servicio MySQL esté iniciado.'
    ], 'Fallo al conectar con MySQL en XAMPP', 503);
}

try {
    // Consultar versión del servidor MySQL
    $versionStmt = $pdo->query("SELECT VERSION() as server_version, DATABASE() as current_db");
    $serverInfo = $versionStmt->fetch();

    // Contar registros de las tablas
    $counts = [];
    $tables = ['usuarios', 'espacios', 'tarifas', 'tickets', 'auditoria'];
    foreach ($tables as $t) {
        $cStmt = $pdo->query("SELECT COUNT(*) as total FROM `{$t}`");
        $counts[$t] = (int)$cStmt->fetch()['total'];
    }

    sendResponse(true, [
        'connected'     => true,
        'service'       => 'XAMPP Apache / PHP + MySQL',
        'php_version'   => phpversion(),
        'mysql_version' => $serverInfo['server_version'],
        'database'      => $serverInfo['current_db'],
        'host'          => $db->getHost(),
        'port'          => $db->getPort(),
        'records'       => $counts,
        'server_time'   => date('Y-m-d H:i:s')
    ], 'Conexión a MySQL y XAMPP establecida exitosamente.');
} catch (PDOException $e) {
    sendResponse(false, [
        'connected' => false,
        'error' => $e->getMessage()
    ], 'Error consultando información de la base de datos', 500);
}
