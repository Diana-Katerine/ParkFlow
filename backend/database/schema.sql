-- =============================================================================
-- ParkFlow - Sistema de Gestión Inteligente de Parqueaderos
-- Base de Datos MySQL / MariaDB (XAMPP)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `parkflow_db` 
    DEFAULT CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `parkflow_db`;

-- 1. Tabla de Usuarios y Operadores
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `nombre` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `rol` ENUM('Cliente', 'Operador', 'Administrador') NOT NULL DEFAULT 'Cliente',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `placa_asociada` VARCHAR(20) NULL,
    `ultimo_acceso` VARCHAR(60) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Tarifas
CREATE TABLE IF NOT EXISTS `tarifas` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `tipo_vehiculo` ENUM('Automóvil', 'Motocicleta', 'Camioneta', 'Eléctrico EV') NOT NULL UNIQUE,
    `tarifa_por_minuto` DECIMAL(10,2) NOT NULL,
    `tarifa_por_hora` DECIMAL(10,2) NOT NULL,
    `tarifa_plena_dia` DECIMAL(10,2) NOT NULL,
    `fraccion_gracia_min` INT NOT NULL DEFAULT 5,
    `actualizado_en` VARCHAR(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Espacios / Bahías de Parqueadero
CREATE TABLE IF NOT EXISTS `espacios` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nivel` VARCHAR(50) NOT NULL,
    `zona` VARCHAR(100) NOT NULL,
    `tipo_permitido` ENUM('Automóvil', 'Motocicleta', 'Camioneta', 'Eléctrico EV') NOT NULL,
    `estado` ENUM('DISPONIBLE', 'OCUPADO', 'RESERVADO', 'BLOQUEADO') NOT NULL DEFAULT 'DISPONIBLE',
    `es_vip` TINYINT(1) NOT NULL DEFAULT 0,
    `potencia_ev_kw` DECIMAL(5,2) NULL,
    `salud_sensor` DECIMAL(5,2) NOT NULL DEFAULT 99.9,
    `placa_actual` VARCHAR(20) NULL,
    `ticket_actual_id` VARCHAR(50) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Tickets y Registros de Estancia
CREATE TABLE IF NOT EXISTS `tickets` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `ticket_codigo` VARCHAR(50) NOT NULL UNIQUE,
    `placa` VARCHAR(20) NOT NULL,
    `tipo_vehiculo` ENUM('Automóvil', 'Motocicleta', 'Camioneta', 'Eléctrico EV') NOT NULL,
    `spot_codigo` VARCHAR(20) NOT NULL,
    `fecha_ingreso` VARCHAR(60) NOT NULL,
    `fecha_salida` VARCHAR(60) NULL,
    `minutos_transcurridos` INT NULL,
    `valor_pagado` DECIMAL(12,2) NULL,
    `metodo_pago` ENUM('Efectivo', 'Tarjeta', 'QR Digital') NULL,
    `estado` ENUM('ACTIVO', 'FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
    `operador_entrada` VARCHAR(150) NOT NULL,
    `operador_salida` VARCHAR(150) NULL,
    `cruzo_medianoche` TINYINT(1) NOT NULL DEFAULT 0,
    `propietario_nombre` VARCHAR(150) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_placa` (`placa`),
    INDEX `idx_estado` (`estado`),
    INDEX `idx_spot` (`spot_codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Registro de Auditoría y Seguridad RBAC
CREATE TABLE IF NOT EXISTS `auditoria` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `usuario_email` VARCHAR(150) NOT NULL,
    `rol` ENUM('Cliente', 'Operador', 'Administrador') NOT NULL,
    `accion` VARCHAR(100) NOT NULL,
    `modulo` ENUM('AUTH', 'ESPACIOS', 'FLUJO_VEHICULAR', 'TARIFAS', 'USUARIOS', 'RBAC_SECURITY') NOT NULL,
    `detalle` TEXT NOT NULL,
    `timestamp` VARCHAR(60) NOT NULL,
    `resultado` ENUM('OK', 'ALERTA', 'BLOQUEADO_403') NOT NULL DEFAULT 'OK',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
