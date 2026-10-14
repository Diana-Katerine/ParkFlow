<?php
/**
 * ParkFlow - Conexión de Base de Datos MySQL & XAMPP
 * Configuración PDO con cabeceras CORS para comunicación con el frontend
 */

// Permitir solicitudes CORS desde cualquier origen (Vite dev server, localhost, etc.)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Manejo de preflight OPTIONS request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Database {
    private $host = "127.0.0.1";
    private $port = 3306;
    private $db_name = "parkflow_db";
    private $username = "root";
    private $password = "";
    private $conn = null;

    public function getConnection() {
        if ($this->conn !== null) {
            return $this->conn;
        }

        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
            return $this->conn;
        } catch (PDOException $e) {
            return null;
        }
    }

    /**
     * Conexión a nivel de servidor (sin seleccionar DB aún), útil para crear la base de datos
     */
    public function getRootServerConnection() {
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            return new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            return null;
        }
    }

    public function getDbName() {
        return $this->db_name;
    }

    public function getHost() {
        return $this->host;
    }

    public function getPort() {
        return $this->port;
    }
}

// Función auxiliar para leer cuerpo JSON entrante
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// Función auxiliar para emitir respuestas JSON estandarizadas
function sendResponse($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success'   => $success,
        'message'   => $message,
        'data'      => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}
