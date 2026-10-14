<?php
/**
 * =============================================================================
 * ParkFlow - Sistema de Gestión Inteligente de Parqueaderos
 * Frontend y Backend Completo en PHP + MySQL + XAMPP
 * =============================================================================
 */

require_once __DIR__ . '/config/database.php';

$db = new Database();
$pdo = $db->getConnection();
$dbConnected = ($pdo !== null);
$dbVersion = 'Desconocido';
$tableCounts = [
    'usuarios' => 0,
    'espacios' => 0,
    'tarifas'  => 0,
    'tickets'  => 0,
    'auditoria'=> 0
];

if ($dbConnected) {
    try {
        $stmt = $pdo->query("SELECT VERSION() as v");
        $dbVersion = $stmt->fetch()['v'];
        foreach (array_keys($tableCounts) as $tbl) {
            $cStmt = $pdo->query("SELECT COUNT(*) as c FROM `{$tbl}`");
            $tableCounts[$tbl] = (int)$cStmt->fetch()['c'];
        }
    } catch (Exception $e) {
        $dbConnected = false;
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ParkFlow — Sistema Inteligente de Parqueadero · XAMPP PHP & MySQL</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-main: #070b14;
            --bg-card: #0b1120;
            --bg-card-sub: #0f172a;
            --border-subtle: rgba(255, 255, 255, 0.08);
            --border-hover: rgba(0, 245, 255, 0.35);
            --cyan: #00f5ff;
            --cyan-glow: rgba(0, 245, 255, 0.2);
            --emerald: #10b981;
            --emerald-bg: rgba(16, 185, 129, 0.15);
            --amber: #f59e0b;
            --amber-bg: rgba(245, 158, 11, 0.15);
            --rose: #ef4444;
            --rose-bg: rgba(239, 68, 68, 0.15);
            --text-main: #f1f5f9;
            --text-muted: #849495;
            --text-cyan: #e9feff;
            --radius-lg: 16px;
            --radius-md: 10px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            line-height: 1.5;
        }

        /* Top Navigation Bar */
        header.topbar {
            position: sticky;
            top: 0;
            z-index: 40;
            background: rgba(11, 17, 32, 0.92);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-subtle);
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .brand-zone {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .brand-logo {
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #ffffff 40%, var(--cyan) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .nav-tabs {
            display: flex;
            gap: 0.5rem;
        }

        .nav-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 0.85rem;
            font-weight: 600;
            padding: 0.5rem 1rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav-tab-btn:hover {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.04);
        }

        .nav-tab-btn.active {
            color: var(--cyan);
            background: rgba(0, 245, 255, 0.1);
            border: 1px solid rgba(0, 245, 255, 0.3);
        }

        .actions-zone {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .badge-status {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }

        .badge-online {
            background: var(--emerald-bg);
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.3);
        }

        .badge-offline {
            background: var(--rose-bg);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.3);
        }

        .badge-status:hover {
            transform: scale(1.03);
        }

        .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: currentColor;
            animation: pulse 1.8s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }

        .role-selector {
            background: var(--bg-card-sub);
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            font-size: 0.8rem;
            padding: 0.4rem 0.75rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            outline: none;
            font-family: inherit;
        }

        /* Container */
        main.app-container {
            max-width: 1440px;
            width: 100%;
            margin: 0 auto;
            padding: 1.5rem;
            flex: 1;
        }

        /* Banner de información de XAMPP */
        .telemetry-banner {
            background: linear-gradient(135deg, rgba(11, 17, 32, 0.95), rgba(15, 23, 42, 0.95));
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            padding: 1.25rem 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
        }

        .telemetry-meta {
            display: flex;
            align-items: center;
            gap: 1.75rem;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
        }

        .meta-label {
            font-size: 0.72rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .meta-value {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-cyan);
            font-family: 'JetBrains Mono', monospace;
        }

        /* Tab Content Containers */
        .tab-panel {
            display: none;
        }

        .tab-panel.active {
            display: block;
            animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Layout Grid for Operator */
        .operator-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }

        @media (min-width: 1024px) {
            .operator-grid {
                grid-template-columns: 380px 1fr;
            }
        }

        /* Cards */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--border-subtle);
        }

        .card-title {
            font-size: 1rem;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* Form elements */
        .form-group {
            margin-bottom: 1rem;
        }

        .form-label {
            display: block;
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 0.35rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .form-input, .form-select {
            width: 100%;
            background: var(--bg-main);
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            padding: 0.65rem 0.85rem;
            border-radius: var(--radius-md);
            font-size: 0.88rem;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s;
        }

        .form-input:focus, .form-select:focus {
            border-color: var(--cyan);
            box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.15);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.65rem 1.25rem;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-family: inherit;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #00d2ff, var(--cyan));
            color: #070b14;
        }

        .btn-primary:hover {
            opacity: 0.92;
            transform: translateY(-1px);
        }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
        }

        .btn-outline:hover {
            border-color: var(--cyan);
            color: var(--cyan);
        }

        .btn-success {
            background: var(--emerald-bg);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .btn-danger {
            background: var(--rose-bg);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-sm {
            padding: 0.35rem 0.75rem;
            font-size: 0.75rem;
        }

        /* 2D Parking Matrix */
        .zones-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.25rem;
        }

        .zone-card {
            background: var(--bg-card-sub);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 1rem;
        }

        .zone-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.75rem;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-cyan);
        }

        .spots-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.6rem;
        }

        .spot-tile {
            background: var(--bg-main);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 0.65rem 0.4rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .spot-tile:hover {
            transform: translateY(-2px);
            border-color: var(--cyan);
        }

        .spot-code {
            font-size: 0.95rem;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
        }

        .spot-plate {
            font-size: 0.72rem;
            font-family: 'JetBrains Mono', monospace;
            color: var(--cyan);
            margin-top: 0.2rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .spot-status-badge {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 0.15rem 0.35rem;
            border-radius: 4px;
            margin-top: 0.3rem;
            display: inline-block;
            text-transform: uppercase;
        }

        .status-DISPONIBLE {
            border-color: rgba(16, 185, 129, 0.4);
            color: #34d399;
        }
        .status-DISPONIBLE .spot-status-badge {
            background: var(--emerald-bg);
            color: #34d399;
        }

        .status-OCUPADO {
            border-color: rgba(239, 68, 68, 0.4);
            color: #f87171;
        }
        .status-OCUPADO .spot-status-badge {
            background: var(--rose-bg);
            color: #f87171;
        }

        .status-BLOQUEADO {
            border-color: rgba(100, 116, 139, 0.4);
            color: #94a3b8;
            opacity: 0.6;
        }
        .status-BLOQUEADO .spot-status-badge {
            background: rgba(100, 116, 139, 0.2);
            color: #94a3b8;
        }

        /* Tables */
        .table-responsive {
            width: 100%;
            overflow-x: auto;
        }

        table.cyber-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            text-align: left;
        }

        table.cyber-table th {
            background: rgba(255, 255, 255, 0.02);
            padding: 0.75rem 1rem;
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            border-bottom: 1px solid var(--border-subtle);
        }

        table.cyber-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border-subtle);
            color: var(--text-main);
        }

        table.cyber-table tr:hover td {
            background: rgba(255, 255, 255, 0.015);
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            z-index: 99;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .modal-overlay.open {
            display: flex;
        }

        .modal-box {
            background: var(--bg-card);
            border: 1px solid var(--border-hover);
            border-radius: var(--radius-lg);
            max-width: 650px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            overflow: hidden;
            animation: modalIn 0.2s ease-out;
        }

        @keyframes modalIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-subtle);
            background: var(--bg-main);
        }

        .modal-body {
            padding: 1.5rem;
            max-height: 75vh;
            overflow-y: auto;
        }

        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-subtle);
            background: var(--bg-main);
        }

        /* Ticket Receipt Styling */
        .ticket-receipt {
            background: #ffffff;
            color: #0b1120;
            padding: 1.5rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            margin-bottom: 1rem;
        }

        .ticket-receipt .title {
            text-align: center;
            font-weight: 800;
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
        }

        .ticket-receipt .subtitle {
            text-align: center;
            font-size: 0.75rem;
            color: #64748b;
            margin-bottom: 1rem;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 0.5rem;
        }

        .ticket-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.4rem;
        }

        .ticket-total {
            border-top: 2px dashed #0b1120;
            margin-top: 0.75rem;
            padding-top: 0.5rem;
            font-size: 1.1rem;
            font-weight: 800;
            display: flex;
            justify-content: space-between;
        }

        /* Footer */
        footer.app-footer {
            border-top: 1px solid var(--border-subtle);
            padding: 1rem 1.5rem;
            font-size: 0.78rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-card);
            margin-top: auto;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
    </style>
</head>
<body>

    <!-- Header Navigation -->
    <header class="topbar">
        <div class="brand-zone">
            <a href="#top" class="brand-logo">
                <span>🅿️</span> ParkFlow
            </a>
            <span style="font-size:0.75rem; color:var(--text-muted); padding-left:0.5rem; border-left:1px solid var(--border-subtle);">
                XAMPP & MySQL
            </span>
        </div>

        <nav class="nav-tabs">
            <button type="button" class="nav-tab-btn active" onclick="switchTab('tab-operativo')">
                <span>🚗</span> Panel Operativo
            </button>
            <button type="button" class="nav-tab-btn" onclick="switchTab('tab-administrativo')">
                <span>📊</span> Panel Administrativo
            </button>
            <button type="button" class="nav-tab-btn" onclick="switchTab('tab-cliente')">
                <span>📱</span> Portal del Cliente
            </button>
        </nav>

        <div class="actions-zone">
            <div id="dbStatusBadge" class="badge-status <?= $dbConnected ? 'badge-online' : 'badge-offline' ?>" onclick="openModal('modalXamppStatus')">
                <span class="pulse-dot"></span>
                <span id="dbStatusText"><?= $dbConnected ? 'XAMPP · MySQL OK' : 'XAMPP Desconectado' ?></span>
            </div>

            <select id="userRoleSelect" class="role-selector" onchange="changeActiveRole(this.value)">
                <option value="Operador">Rol: Operador</option>
                <option value="Administrador">Rol: Administrador</option>
                <option value="Cliente">Rol: Cliente</option>
            </select>
        </div>
    </header>

    <!-- Main Content -->
    <main class="app-container">

        <!-- Telemetry Banner -->
        <div class="telemetry-banner">
            <div class="telemetry-meta">
                <div class="meta-item">
                    <span class="meta-label">Servidor Web</span>
                    <span class="meta-value">XAMPP Apache / PHP <?= htmlspecialchars(phpversion()) ?></span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Base de Datos</span>
                    <span class="meta-value"><?= htmlspecialchars($db->getDbName()) ?> (MySQL)</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Host & Puerto</span>
                    <span class="meta-value">127.0.0.1:3306</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Espacios Libres</span>
                    <span class="meta-value" id="freeSpotsCount" style="color: #34d399;">Calculando...</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Ocupación Total</span>
                    <span class="meta-value" id="occupancyRate">0%</span>
                </div>
            </div>

            <div style="display:flex; gap:0.5rem;">
                <button type="button" class="btn btn-outline btn-sm" onclick="syncAllFromDatabase()">
                    <span>🔄</span> Sincronizar MySQL
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="openModal('modalXamppStatus')">
                    <span>⚡</span> Diagnóstico XAMPP
                </button>
            </div>
        </div>

        <!-- 1. TAB PANEL OPERATIVO -->
        <div id="tab-operativo" class="tab-panel active">
            <div class="operator-grid">
                
                <!-- Columna Izquierda: Formulario de Entrada y Cobro de Salida -->
                <div style="display:flex; flex-direction:column; gap:1.5rem;">
                    
                    <!-- Tarjeta Registrar Entrada -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>📥</span> Registrar Entrada
                            </h3>
                            <span style="font-size:0.75rem; color:var(--cyan);">Emisión de Ticket</span>
                        </div>
                        <form id="formEntry" onsubmit="handleFormEntrySubmit(event)">
                            <div class="form-group">
                                <label class="form-label">Placa del Vehículo</label>
                                <input type="text" id="entryPlate" class="form-input" placeholder="Ej: ABC-123 o KLM-456" required uppercase style="text-transform:uppercase; font-family:'JetBrains Mono'; font-weight:700;">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo de Vehículo</label>
                                <select id="entryVehicleType" class="form-select" onchange="filterSpotsForEntry()">
                                    <option value="Automóvil">Automóvil (Zona A)</option>
                                    <option value="Eléctrico EV">Eléctrico EV (Zona B)</option>
                                    <option value="Motocicleta">Motocicleta (Zona C)</option>
                                    <option value="Camioneta">Camioneta / SUV (Zona D)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bahía Asignada (Disponibles)</label>
                                <select id="entrySpotCode" class="form-select" required>
                                    <option value="">Cargando bahías disponibles...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nombre del Conductor (Opcional)</label>
                                <input type="text" id="entryOwnerName" class="form-input" placeholder="Nombre completo">
                            </div>
                            <button type="submit" id="btnSubmitEntry" class="btn btn-primary" style="width:100%;">
                                <span>🎟️</span> Registrar Entrada & Guardar en MySQL
                            </button>
                        </form>
                    </div>

                    <!-- Tarjeta Registrar Salida & Cobro -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>📤</span> Cobro y Salida de Vehículo
                            </h3>
                            <span style="font-size:0.75rem; color:var(--emerald);">Liquidación</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Seleccionar Estancia Activa</label>
                            <select id="exitTicketSelect" class="form-select" onchange="previewExitCalculation()">
                                <option value="">Seleccione vehículo activo...</option>
                            </select>
                        </div>
                        <div id="exitPreviewBox" style="display:none; background:var(--bg-card-sub); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem;">
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;">
                                <span style="color:var(--text-muted);">Tiempo Estancia:</span>
                                <span id="previewMinutes" style="font-weight:700; color:var(--cyan);">0 mins</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;">
                                <span style="color:var(--text-muted);">Tarifa Aplicada:</span>
                                <span id="previewRateDesc">Automóvil</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; border-top:1px dashed var(--border-subtle); padding-top:0.5rem; margin-top:0.5rem;">
                                <span>Total a Cobrar:</span>
                                <span id="previewTotalAmount" style="color:#34d399;">$0</span>
                            </div>
                            <div class="form-group" style="margin-top:1rem; margin-bottom:0.5rem;">
                                <label class="form-label">Método de Pago</label>
                                <select id="exitPaymentMethod" class="form-select">
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                                    <option value="QR Digital">QR Digital (Bancolombia/Nequi)</option>
                                </select>
                            </div>
                            <button type="button" class="btn btn-primary" style="width:100%; margin-top:0.5rem;" onclick="processExitPayment()">
                                <span>💳</span> Cobrar, Imprimir Recibo y Liberar Bahía
                            </button>
                        </div>
                    </div>

                </div>

                <!-- Columna Derecha: Matriz Visual de Bahías y Tabla de Estancias Activas -->
                <div style="display:flex; flex-direction:column; gap:1.5rem;">
                    
                    <!-- Matriz de Bahías -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>🗺️</span> Telemetría de Bahías en Tiempo Real
                            </h3>
                            <div style="display:flex; gap:0.5rem; font-size:0.75rem;">
                                <span style="color:#34d399;">● Disponible</span>
                                <span style="color:#f87171;">● Ocupado</span>
                                <span style="color:#94a3b8;">● Bloqueado</span>
                            </div>
                        </div>
                        <div class="zones-grid" id="zonesContainer">
                            <!-- Inyectado dinámicamente por JS desde MySQL -->
                            <div style="color:var(--text-muted); font-size:0.85rem;">Cargando espacios desde MySQL...</div>
                        </div>
                    </div>

                    <!-- Tabla de Estancias Activas -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>⏱️</span> Estancias Activas en Parqueadero
                            </h3>
                            <span id="activeCountBadge" class="badge-status badge-online" style="cursor:default;">0 Activos</span>
                        </div>
                        <div class="table-responsive">
                            <table class="cyber-table">
                                <thead>
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Placa</th>
                                        <th>Vehículo</th>
                                        <th>Bahía</th>
                                        <th>Hora Entrada</th>
                                        <th>Cruce Medianoche</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody id="activeTicketsTableBody">
                                    <!-- Inyectado dinámicamente -->
                                    <tr>
                                        <td colspan="7" style="text-align:center; color:var(--text-muted);">Cargando tickets activos...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </div>

        <!-- 2. TAB PANEL ADMINISTRATIVO -->
        <div id="tab-administrativo" class="tab-panel">
            <div style="display:grid; grid-template-columns:1fr; gap:1.5rem;">
                
                <!-- Tarifas y Usuarios -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(450px, 1fr)); gap:1.5rem;">
                    
                    <!-- Matriz de Tarifas -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>💰</span> Configuración de Tarifas (MySQL)
                            </h3>
                            <span style="font-size:0.75rem; color:var(--cyan);">Valores en COP</span>
                        </div>
                        <div class="table-responsive">
                            <table class="cyber-table">
                                <thead>
                                    <tr>
                                        <th>Tipo Vehículo</th>
                                        <th>Minuto</th>
                                        <th>Hora</th>
                                        <th>Día Pleno</th>
                                        <th>Gracia</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody id="ratesTableBody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Gestión de Usuarios y Roles RBAC -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">
                                <span>👥</span> Gestión de Cuentas y Control RBAC
                            </h3>
                            <button type="button" class="btn btn-outline btn-sm" onclick="openModal('modalCreateUser')">
                                + Nuevo Usuario
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="cyber-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Estado</th>
                                        <th>Último Acceso</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <!-- Bitácora de Auditoría -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <span>🛡️</span> Registro de Auditoría y Seguridad RBAC
                        </h3>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Almacenado en tabla `auditoria` de MySQL</span>
                    </div>
                    <div class="table-responsive" style="max-height:400px; overflow-y:auto;">
                        <table class="cyber-table">
                            <thead>
                                <tr>
                                    <th>Fecha / Hora</th>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Módulo</th>
                                    <th>Acción</th>
                                    <th>Detalle</th>
                                    <th>Resultado</th>
                                </tr>
                            </thead>
                            <tbody id="auditTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

        <!-- 3. TAB PORTAL DEL CLIENTE -->
        <div id="tab-cliente" class="tab-panel">
            <div style="max-width:800px; margin:0 auto; display:flex; flex-direction:column; gap:1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <span>🔍</span> Consultar Estancia de Mi Vehículo
                        </h3>
                        <span style="font-size:0.75rem; color:var(--cyan);">Autoconsulta Ciudadana</span>
                    </div>
                    <div style="display:flex; gap:0.75rem; margin-bottom:1rem;">
                        <input type="text" id="clientSearchPlate" class="form-input" placeholder="Ingrese su placa (ej: KLM-456 o BGT-902)" uppercase style="text-transform:uppercase; font-family:'JetBrains Mono'; font-weight:700; font-size:1rem;">
                        <button type="button" class="btn btn-primary" onclick="handleClientSearch()">
                            <span>Buscar</span>
                        </button>
                    </div>

                    <div id="clientSearchResultBox" style="display:none; background:var(--bg-card-sub); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1.25rem;">
                        <!-- Contenido dinámico -->
                    </div>
                </div>

                <!-- Historial de Estancias del Cliente -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <span>📜</span> Histórico de Estancias Finalizadas
                        </h3>
                    </div>
                    <div class="table-responsive">
                        <table class="cyber-table">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Placa</th>
                                    <th>Bahía</th>
                                    <th>Duración</th>
                                    <th>Total Pagado</th>
                                    <th>Método</th>
                                    <th>Fecha Salida</th>
                                </tr>
                            </thead>
                            <tbody id="completedTicketsTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <!-- Modal: Diagnóstico XAMPP y MySQL -->
    <div id="modalXamppStatus" class="modal-overlay">
        <div class="modal-box">
            <div class="modal-header">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1.25rem;">🗄️</span>
                    <h3 style="font-size:1rem; font-weight:700;">Diagnóstico XAMPP & MySQL (`parkflow_db`)</h3>
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('modalXamppStatus')">✕</button>
            </div>
            <div class="modal-body">
                <div style="background:var(--bg-main); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                        <div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Servidor Web</div>
                            <div style="font-weight:700; color:var(--cyan);">Apache / PHP <?= phpversion() ?></div>
                        </div>
                        <div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Base de Datos</div>
                            <div style="font-weight:700; color:#34d399;"><?= $db->getDbName() ?> (MySQL)</div>
                        </div>
                        <div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Versión MySQL</div>
                            <div style="font-weight:700; color:#fbbf24;"><?= htmlspecialchars($dbVersion) ?></div>
                        </div>
                        <div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Host & Puerto</div>
                            <div style="font-weight:700; font-family:'JetBrains Mono';">127.0.0.1:3306</div>
                        </div>
                    </div>
                </div>

                <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-cyan);">
                    📊 Conteo de Registros por Tabla:
                </h4>
                <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:0.5rem; text-align:center; margin-bottom:1.5rem;">
                    <?php foreach ($tableCounts as $t => $cnt): ?>
                        <div style="background:var(--bg-main); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:0.6rem;">
                            <div style="font-size:1.2rem; font-weight:800; color:var(--cyan); font-family:'JetBrains Mono';" id="cnt-<?= $t ?>"><?= $cnt ?></div>
                            <div style="font-size:0.72rem; color:var(--text-muted); text-transform:capitalize;"><?= $t ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div style="background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.3); border-radius:var(--radius-md); padding:0.85rem; font-size:0.8rem; color:#34d399; margin-bottom:1rem;">
                    ✓ Conexión activa con XAMPP. Todas las operaciones de entrada, salida, tarifas y auditoría se persisten de forma inmediata en MySQL.
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger btn-sm" onclick="resetDatabaseFromUi()">
                    Restablecer Base de Datos Demo
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="closeModal('modalXamppStatus')">
                    Cerrar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal: Recibo de Ticket / Cobro -->
    <div id="modalReceipt" class="modal-overlay">
        <div class="modal-box" style="max-width:440px;">
            <div class="modal-header">
                <h3 style="font-size:1rem; font-weight:700;" id="receiptModalTitle">Comprobante Oficial</h3>
                <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('modalReceipt')">✕</button>
            </div>
            <div class="modal-body" id="receiptContentArea">
                <!-- Inyectado dinámicamente -->
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline btn-sm" onclick="window.print()">
                    🖨️ Imprimir
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="closeModal('modalReceipt')">
                    Aceptar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal: Crear Usuario -->
    <div id="modalCreateUser" class="modal-overlay">
        <div class="modal-box" style="max-width:450px;">
            <div class="modal-header">
                <h3 style="font-size:1rem; font-weight:700;">Crear Nuevo Usuario</h3>
                <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('modalCreateUser')">✕</button>
            </div>
            <form onsubmit="handleCreateUserSubmit(event)">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Nombre Completo</label>
                        <input type="text" id="newUserName" class="form-input" required placeholder="Ej: Santiago Ruiz">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correo Electrónico</label>
                        <input type="email" id="newUserEmail" class="form-input" required placeholder="s.ruiz@parkpulse.co">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rol en el Sistema</label>
                        <select id="newUserRole" class="form-select">
                            <option value="Operador">Operador (Entradas y Salidas)</option>
                            <option value="Administrador">Administrador (Control Total)</option>
                            <option value="Cliente">Cliente (Autoconsulta)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Placa Asociada (Para Clientes)</label>
                        <input type="text" id="newUserPlate" class="form-input" placeholder="Ej: ABC-123" uppercase style="text-transform:uppercase;">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('modalCreateUser')">Cancelar</button>
                    <button type="submit" class="btn btn-primary btn-sm">Guardar Usuario en MySQL</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Footer -->
    <footer class="app-footer">
        <div>
            ParkFlow © 2026 — Sistema Inteligente de Parqueadero · XAMPP PHP + MySQL Edition
        </div>
        <div>
            Conectado a MySQL: <strong style="color:var(--cyan); font-family:'JetBrains Mono';">127.0.0.1:3306 (parkflow_db)</strong>
        </div>
    </footer>

    <!-- Logica en JavaScript Conectada a la API de PHP -->
    <script>
        const API_URL = 'api';
        let appState = {
            spots: [],
            tickets: [],
            rates: [],
            users: [],
            audit: [],
            currentRole: 'Operador'
        };

        // Cambiar entre pestañas
        function switchTab(tabId) {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
            
            const target = document.getElementById(tabId);
            if (target) target.classList.add('active');
            
            event.currentTarget.classList.add('active');
        }

        // Modales
        function openModal(id) {
            document.getElementById(id).classList.add('open');
        }
        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        // Cambio de rol
        function changeActiveRole(role) {
            appState.currentRole = role;
            if (role === 'Cliente') {
                document.querySelectorAll('.nav-tab-btn')[2].click();
            } else if (role === 'Administrador') {
                document.querySelectorAll('.nav-tab-btn')[1].click();
            } else {
                document.querySelectorAll('.nav-tab-btn')[0].click();
            }
        }

        // 1. Sincronizar todos los datos desde MySQL vía PHP API
        async function syncAllFromDatabase() {
            try {
                // Estado del servidor
                const resStatus = await fetch(`${API_URL}/status.php`);
                const statusJson = await resStatus.json();
                if (statusJson.success && statusJson.data.connected) {
                    document.getElementById('dbStatusBadge').className = 'badge-status badge-online';
                    document.getElementById('dbStatusText').textContent = 'XAMPP · MySQL OK';
                    
                    if (statusJson.data.records) {
                        for (const [key, val] of Object.entries(statusJson.data.records)) {
                            const el = document.getElementById(`cnt-${key}`);
                            if (el) el.textContent = val;
                        }
                    }
                } else {
                    document.getElementById('dbStatusBadge').className = 'badge-status badge-offline';
                    document.getElementById('dbStatusText').textContent = 'XAMPP Desconectado';
                }

                // Cargar en paralelo
                const [spotsRes, ratesRes, ticketsRes, usersRes, auditRes] = await Promise.all([
                    fetch(`${API_URL}/spots.php`).then(r => r.json()),
                    fetch(`${API_URL}/rates.php`).then(r => r.json()),
                    fetch(`${API_URL}/tickets.php`).then(r => r.json()),
                    fetch(`${API_URL}/users.php`).then(r => r.json()),
                    fetch(`${API_URL}/audit.php`).then(r => r.json())
                ]);

                if (spotsRes.success) appState.spots = spotsRes.data;
                if (ratesRes.success) appState.rates = ratesRes.data;
                if (ticketsRes.success) appState.tickets = ticketsRes.data;
                if (usersRes.success) appState.users = usersRes.data;
                if (auditRes.success) appState.audit = auditRes.data;

                renderAll();
            } catch (err) {
                console.error('Error al sincronizar con MySQL:', err);
            }
        }

        function renderAll() {
            renderSpots();
            renderActiveTickets();
            renderRates();
            renderUsers();
            renderAudit();
            renderCompletedTickets();
            updateTelemetry();
            filterSpotsForEntry();
        }

        // Actualizar estadísticas de telemetría
        function updateTelemetry() {
            const total = appState.spots.length;
            const free = appState.spots.filter(s => s.estado === 'DISPONIBLE').length;
            const occupied = appState.spots.filter(s => s.estado === 'OCUPADO').length;
            const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

            document.getElementById('freeSpotsCount').textContent = `${free} de ${total}`;
            document.getElementById('occupancyRate').textContent = `${pct}%`;
            document.getElementById('activeCountBadge').textContent = `${occupied} Activos`;
        }

        // Renderizar Bahías
        function renderSpots() {
            const zones = {
                'Zona A · Estándar': [],
                'Zona B · EV & VIP': [],
                'Zona C · Motos': [],
                'Zona D · Camionetas': []
            };

            appState.spots.forEach(s => {
                if (zones[s.zona]) {
                    zones[s.zona].push(s);
                }
            });

            const container = document.getElementById('zonesContainer');
            container.innerHTML = '';

            for (const [zoneName, spots] of Object.entries(zones)) {
                const zoneDiv = document.createElement('div');
                zoneDiv.className = 'zone-card';

                const freeInZone = spots.filter(s => s.estado === 'DISPONIBLE').length;

                let spotsHtml = spots.map(s => `
                    <div class="spot-tile status-${s.estado}" onclick="handleSpotClick('${s.id}', '${s.codigo}', '${s.estado}')">
                        <div class="spot-code">${s.codigo}</div>
                        <div class="spot-plate">${s.placaActual || '—'}</div>
                        <span class="spot-status-badge">${s.estado}</span>
                    </div>
                `).join('');

                zoneDiv.innerHTML = `
                    <div class="zone-header">
                        <span>${zoneName}</span>
                        <span style="color:var(--text-muted); font-size:0.75rem;">${freeInZone}/${spots.length} Libres</span>
                    </div>
                    <div class="spots-grid">${spotsHtml}</div>
                `;
                container.appendChild(zoneDiv);
            }
        }

        // Filtro de bahías disponibles en formulario de entrada
        function filterSpotsForEntry() {
            const vehicleType = document.getElementById('entryVehicleType').value;
            const select = document.getElementById('entrySpotCode');
            select.innerHTML = '';

            const available = appState.spots.filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === vehicleType);

            if (available.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = `No hay bahías libres para ${vehicleType}`;
                select.appendChild(opt);
                return;
            }

            available.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.codigo;
                opt.textContent = `${s.codigo} (${s.nivel} · ${s.zona})`;
                select.appendChild(opt);
            });
        }

        // Registrar Entrada
        async function handleFormEntrySubmit(e) {
            e.preventDefault();
            const plate = document.getElementById('entryPlate').value.trim().toUpperCase();
            const vehicleType = document.getElementById('entryVehicleType').value;
            const spotCode = document.getElementById('entrySpotCode').value;
            const ownerName = document.getElementById('entryOwnerName').value.trim();

            if (!spotCode) {
                alert('Debe seleccionar una bahía disponible.');
                return;
            }

            const btn = document.getElementById('btnSubmitEntry');
            btn.disabled = true;
            btn.textContent = 'Guardando en MySQL...';

            try {
                const res = await fetch(`${API_URL}/tickets.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        placa: plate,
                        tipoVehiculo: vehicleType,
                        spotCodigo: spotCode,
                        operadorEntrada: 'Operador de Turno',
                        propietarioNombre: ownerName || 'Cliente Visitante'
                    })
                });

                const data = await res.json();
                if (!data.success) {
                    alert(data.message || 'Error al registrar entrada en MySQL.');
                    return;
                }

                // Éxito: Mostrar recibo de entrada
                showEntryReceipt(data.data);
                document.getElementById('entryPlate').value = '';
                document.getElementById('entryOwnerName').value = '';

                // Recargar datos desde MySQL
                await syncAllFromDatabase();
            } catch (err) {
                alert('Error de conexión con el servidor XAMPP: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>🎟️</span> Registrar Entrada & Guardar en MySQL';
            }
        }

        // Mostrar Comprobante de Entrada
        function showEntryReceipt(ticket) {
            document.getElementById('receiptModalTitle').textContent = 'Ticket de Ingreso Oficial';
            const html = `
                <div class="ticket-receipt">
                    <div class="title">PARKFLOW SMART PARKING</div>
                    <div class="subtitle">COMPROBANTE DE ENTRADA · XAMPP & MYSQL</div>
                    <div class="ticket-row"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                    <div class="ticket-row"><span>PLACA:</span><strong style="color:#0088cc; font-size:1.1rem;">${ticket.placa}</strong></div>
                    <div class="ticket-row"><span>TIPO:</span><span>${ticket.tipoVehiculo}</span></div>
                    <div class="ticket-row"><span>BAHÍA ASIGNADA:</span><strong>${ticket.spotCodigo}</strong></div>
                    <div class="ticket-row"><span>FECHA INGRESO:</span><span>${new Date(ticket.fechaIngreso).toLocaleString('es-CO')}</span></div>
                    <div class="ticket-row"><span>OPERADOR:</span><span>${ticket.operadorEntrada}</span></div>
                    <div style="text-align:center; margin-top:1rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem;">
                        <span style="font-size:0.7rem; color:#64748b;">Conserve este ticket para retirar su vehículo.</span>
                        <div style="font-family:'JetBrains Mono'; letter-spacing:0.3em; margin-top:0.3rem;">||| | |||| | ||||| |||| |</div>
                    </div>
                </div>
            `;
            document.getElementById('receiptContentArea').innerHTML = html;
            openModal('modalReceipt');
        }

        // Renderizar Tickets Activos
        function renderActiveTickets() {
            const active = appState.tickets.filter(t => t.estado === 'ACTIVO');
            const tbody = document.getElementById('activeTicketsTableBody');
            const selectExit = document.getElementById('exitTicketSelect');

            selectExit.innerHTML = '<option value="">Seleccione vehículo activo...</option>';

            if (active.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No hay vehículos dentro del parqueadero en este momento.</td></tr>';
                return;
            }

            tbody.innerHTML = active.map(t => {
                const entryDate = new Date(t.fechaIngreso);
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.placa} · ${t.tipoVehiculo} (Bahía ${t.spotCodigo})`;
                selectExit.appendChild(opt);

                return `
                    <tr>
                        <td><strong style="color:var(--cyan); font-family:'JetBrains Mono';">${t.ticketCodigo}</strong></td>
                        <td><strong style="color:#ffffff; font-family:'JetBrains Mono'; font-size:0.95rem;">${t.placa}</strong></td>
                        <td>${t.tipoVehiculo}</td>
                        <td><span style="color:#34d399; font-weight:700;">${t.spotCodigo}</span></td>
                        <td>${entryDate.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
                        <td>${t.cruzoMedianoche ? '<span style="color:#fbbf24; font-weight:700;">🌙 Sí (Nocturno)</span>' : '<span style="color:var(--text-muted);">Diurno</span>'}</td>
                        <td>
                            <div style="display:flex; gap:0.4rem;">
                                <button type="button" class="btn btn-primary btn-sm" onclick="selectTicketForExit('${t.id}')">Cobrar</button>
                                <button type="button" class="btn btn-outline btn-sm" title="Simular cruce de medianoche (-16h)" onclick="shiftMidnightTest('${t.id}')">🌙 -16h</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function selectTicketForExit(logId) {
            document.getElementById('exitTicketSelect').value = logId;
            previewExitCalculation();
        }

        // Simular cruce de medianoche
        async function shiftMidnightTest(logId) {
            try {
                const res = await fetch(`${API_URL}/tickets.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'shift_midnight',
                        logId: logId,
                        hoursBack: 16
                    })
                });
                const data = await res.json();
                if (data.success) {
                    await syncAllFromDatabase();
                    selectTicketForExit(logId);
                }
            } catch (e) {
                alert('Error al simular medianoche: ' + e.message);
            }
        }

        // Previsualizar cálculo de cobro
        function previewExitCalculation() {
            const logId = document.getElementById('exitTicketSelect').value;
            const box = document.getElementById('exitPreviewBox');

            if (!logId) {
                box.style.display = 'none';
                return;
            }

            const ticket = appState.tickets.find(t => t.id === logId);
            if (!ticket) return;

            const rate = appState.rates.find(r => r.tipoVehiculo === ticket.tipoVehiculo) || {
                tarifaPorMinuto: 110,
                tarifaPorHora: 5800,
                tarifaPlenaDia: 42000,
                fraccionGraciaMin: 5
            };

            const entryTime = new Date(ticket.fechaIngreso).getTime();
            const nowTime = Date.now();
            let totalMins = Math.max(1, Math.round((nowTime - entryTime) / 60000));

            // Si cruzó medianoche o supera 12 horas, aplica tarifa plena día
            let amount = 0;
            if (ticket.cruzoMedianoche || totalMins >= 720) {
                amount = rate.tarifaPlenaDia;
            } else if (totalMins <= rate.fraccionGraciaMin) {
                amount = 0;
            } else {
                const hours = Math.floor(totalMins / 60);
                const remMins = totalMins % 60;
                amount = (hours * rate.tarifaPorHora) + (remMins * rate.tarifaPorMinuto);
                if (amount > rate.tarifaPlenaDia) amount = rate.tarifaPlenaDia;
            }

            document.getElementById('previewMinutes').textContent = `${totalMins} minutos (${(totalMins/60).toFixed(1)} hrs)`;
            document.getElementById('previewRateDesc').textContent = `${ticket.tipoVehiculo} · $${rate.tarifaPorHora}/h`;
            document.getElementById('previewTotalAmount').textContent = `$${amount.toLocaleString('es-CO')}`;

            box.dataset.logId = logId;
            box.dataset.totalMins = totalMins;
            box.dataset.amount = amount;
            box.style.display = 'block';
        }

        // Procesar Cobro y Salida
        async function processExitPayment() {
            const box = document.getElementById('exitPreviewBox');
            const logId = box.dataset.logId;
            const amount = parseFloat(box.dataset.amount);
            const minutes = parseInt(box.dataset.totalMins);
            const paymentMethod = document.getElementById('exitPaymentMethod').value;

            try {
                const res = await fetch(`${API_URL}/tickets.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        logId: logId,
                        valorPagado: amount,
                        minutosTranscurridos: minutes,
                        metodoPago: paymentMethod,
                        operadorSalida: 'Operador de Turno'
                    })
                });

                const data = await res.json();
                if (!data.success) {
                    alert(data.message || 'Error al procesar salida.');
                    return;
                }

                // Mostrar recibo de liquidación final
                showExitReceipt(data.data);
                box.style.display = 'none';
                document.getElementById('exitTicketSelect').value = '';

                // Recargar desde MySQL
                await syncAllFromDatabase();
            } catch (e) {
                alert('Error al liquidar salida en MySQL: ' + e.message);
            }
        }

        // Mostrar Comprobante de Cobro
        function showExitReceipt(ticket) {
            document.getElementById('receiptModalTitle').textContent = 'Factura y Comprobante de Pago';
            const html = `
                <div class="ticket-receipt">
                    <div class="title">PARKFLOW SMART PARKING</div>
                    <div class="subtitle">FACTURA EQUIVALENTE DE PAGO · MYSQL STORED</div>
                    <div class="ticket-row"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                    <div class="ticket-row"><span>PLACA:</span><strong style="color:#0088cc; font-size:1.15rem;">${ticket.placa}</strong></div>
                    <div class="ticket-row"><span>TIPO VEHÍCULO:</span><span>${ticket.tipoVehiculo}</span></div>
                    <div class="ticket-row"><span>BAHÍA LIBERADA:</span><strong>${ticket.spotCodigo}</strong></div>
                    <div class="ticket-row"><span>TIEMPO TOTAL:</span><span>${ticket.minutosTranscurridos} minutos</span></div>
                    <div class="ticket-row"><span>MÉTODO DE PAGO:</span><span>${ticket.metodoPago}</span></div>
                    <div class="ticket-row"><span>FECHA SALIDA:</span><span>${new Date(ticket.fechaSalida).toLocaleString('es-CO')}</span></div>
                    <div class="ticket-total">
                        <span>TOTAL PAGADO:</span>
                        <span style="color:#10b981;">$${ticket.valorPagado.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div style="text-align:center; margin-top:1rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem; font-size:0.75rem; color:#64748b;">
                        ¡Gracias por su visita! Bahía liberada en MySQL.
                    </div>
                </div>
            `;
            document.getElementById('receiptContentArea').innerHTML = html;
            openModal('modalReceipt');
        }

        // Renderizar Tarifas
        function renderRates() {
            const tbody = document.getElementById('ratesTableBody');
            tbody.innerHTML = appState.rates.map(r => `
                <tr>
                    <td><strong>${r.tipoVehiculo}</strong></td>
                    <td>$${r.tarifaPorMinuto}</td>
                    <td>$${r.tarifaPorHora.toLocaleString('es-CO')}</td>
                    <td>$${r.tarifaPlenaDia.toLocaleString('es-CO')}</td>
                    <td>${r.fraccionGraciaMin} min</td>
                    <td>
                        <button type="button" class="btn btn-outline btn-sm" onclick="editRatePrompt('${r.id}', '${r.tipoVehiculo}', ${r.tarifaPorHora}, ${r.tarifaPorMinuto})">
                            Editar
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        async function editRatePrompt(id, tipo, currentHora, currentMin) {
            const nuevaHora = prompt(`Nueva tarifa por hora para ${tipo} (COP):`, currentHora);
            if (!nuevaHora || isNaN(nuevaHora)) return;

            const nuevoMin = prompt(`Nueva tarifa por minuto para ${tipo} (COP):`, currentMin);
            if (!nuevoMin || isNaN(nuevoMin)) return;

            try {
                const res = await fetch(`${API_URL}/rates.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: id,
                        tarifaPorHora: parseFloat(nuevaHora),
                        tarifaPorMinuto: parseFloat(nuevoMin)
                    })
                });
                const data = await res.json();
                if (data.success) {
                    await syncAllFromDatabase();
                }
            } catch (e) {
                alert('Error al actualizar tarifa: ' + e.message);
            }
        }

        // Renderizar Usuarios
        function renderUsers() {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = appState.users.map(u => `
                <tr>
                    <td><strong>${u.nombre}</strong></td>
                    <td>${u.email}</td>
                    <td>
                        <span style="padding:0.2rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem; ${u.rol==='Administrador'?'background:rgba(239,68,68,0.2); color:#f87171;':u.rol==='Operador'?'background:rgba(0,245,255,0.2); color:var(--cyan);':'background:rgba(16,185,129,0.2); color:#34d399;'}">
                            ${u.rol}
                        </span>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm ${u.activo ? 'btn-success' : 'btn-danger'}" onclick="toggleUserActiveState('${u.id}')">
                            ${u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                    </td>
                    <td style="color:var(--text-muted); font-size:0.78rem;">${u.ultimoAcceso}</td>
                </tr>
            `).join('');
        }

        async function toggleUserActiveState(userId) {
            try {
                await fetch(`${API_URL}/users.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: userId, toggleActivo: true })
                });
                await syncAllFromDatabase();
            } catch (e) {
                alert('Error al cambiar estado: ' + e.message);
            }
        }

        async function handleCreateUserSubmit(e) {
            e.preventDefault();
            const name = document.getElementById('newUserName').value.trim();
            const email = document.getElementById('newUserEmail').value.trim();
            const role = document.getElementById('newUserRole').value;
            const plate = document.getElementById('newUserPlate').value.trim();

            try {
                const res = await fetch(`${API_URL}/users.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: name,
                        email: email,
                        rol: role,
                        placaAsociada: plate
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    alert(data.message || 'Error creando usuario.');
                    return;
                }
                closeModal('modalCreateUser');
                await syncAllFromDatabase();
            } catch (err) {
                alert('Error al crear usuario en MySQL: ' + err.message);
            }
        }

        // Renderizar Auditoría
        function renderAudit() {
            const tbody = document.getElementById('auditTableBody');
            tbody.innerHTML = appState.audit.slice(0, 30).map(a => `
                <tr>
                    <td style="white-space:nowrap; color:var(--text-muted);">${a.timestamp}</td>
                    <td><strong>${a.usuarioEmail}</strong></td>
                    <td>${a.rol}</td>
                    <td><span style="color:var(--cyan);">${a.modulo}</span></td>
                    <td>${a.accion}</td>
                    <td style="font-size:0.8rem;">${a.detalle}</td>
                    <td>
                        <span style="font-size:0.72rem; font-weight:700; ${a.resultado==='OK'?'color:#34d399;':a.resultado==='ALERTA'?'color:#fbbf24;':'color:#f87171;'}">
                            ${a.resultado}
                        </span>
                    </td>
                </tr>
            `).join('');
        }

        // Renderizar Tickets Finalizados (Historial)
        function renderCompletedTickets() {
            const completed = appState.tickets.filter(t => t.estado === 'FINALIZADO');
            const tbody = document.getElementById('completedTicketsTableBody');

            if (completed.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">Sin estancias finalizadas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = completed.map(t => `
                <tr>
                    <td style="color:var(--cyan); font-family:'JetBrains Mono';">${t.ticketCodigo}</td>
                    <td><strong style="color:#ffffff; font-family:'JetBrains Mono';">${t.placa}</strong></td>
                    <td>${t.spotCodigo}</td>
                    <td>${t.minutosTranscurridos || 0} min</td>
                    <td style="color:#34d399; font-weight:700;">$${(t.valorPagado || 0).toLocaleString('es-CO')}</td>
                    <td>${t.metodoPago || '—'}</td>
                    <td style="color:var(--text-muted); font-size:0.78rem;">${new Date(t.fechaSalida || t.fechaIngreso).toLocaleString('es-CO')}</td>
                </tr>
            `).join('');
        }

        // Búsqueda del Cliente
        function handleClientSearch() {
            const query = document.getElementById('clientSearchPlate').value.trim().toUpperCase();
            const resBox = document.getElementById('clientSearchResultBox');

            if (!query) {
                alert('Ingrese una placa para consultar.');
                return;
            }

            const active = appState.tickets.find(t => t.estado === 'ACTIVO' && t.placa === query);

            if (!active) {
                resBox.style.display = 'block';
                resBox.innerHTML = `
                    <div style="color:#f87171; font-weight:700; margin-bottom:0.5rem;">Vehículo no encontrado en estancia activa</div>
                    <p style="font-size:0.85rem; color:var(--text-muted);">La placa <strong>${query}</strong> no registra ingreso vigente en el parqueadero.</p>
                `;
                return;
            }

            const entryTime = new Date(active.fechaIngreso);
            const mins = Math.max(1, Math.round((Date.now() - entryTime.getTime()) / 60000));

            resBox.style.display = 'block';
            resBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem;">
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; color:#ffffff; font-family:'JetBrains Mono';">${active.placa}</div>
                        <div style="font-size:0.8rem; color:var(--cyan);">${active.tipoVehiculo}</div>
                    </div>
                    <span class="badge-status badge-online">Estancia Activa</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">Bahía Asignada</div>
                        <div style="font-size:1.1rem; font-weight:800; color:#34d399;">${active.spotCodigo}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">Hora de Ingreso</div>
                        <div style="font-size:0.95rem; font-weight:700;">${entryTime.toLocaleTimeString('es-CO')}</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">Tiempo Transcurrido</div>
                        <div style="font-size:1.1rem; font-weight:800; color:var(--cyan);">${mins} minutos</div>
                    </div>
                </div>
            `;
        }

        // Alternar mantenimiento en bahía
        async function handleSpotClick(id, codigo, estado) {
            if (estado === 'OCUPADO') {
                alert(`La bahía ${codigo} está ocupada por un vehículo. Use el panel de cobro para liberarla.`);
                return;
            }

            if (!confirm(`¿Desea cambiar el estado de la bahía ${codigo}? (Disponible <-> Bloqueado por mantenimiento)`)) {
                return;
            }

            try {
                await fetch(`${API_URL}/spots.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, toggleMantenimiento: true })
                });
                await syncAllFromDatabase();
            } catch (e) {
                alert('Error al actualizar bahía: ' + e.message);
            }
        }

        // Restablecer DB desde UI
        async function resetDatabaseFromUi() {
            if (!confirm('¿Seguro que desea restablecer la base de datos `parkflow_db` en MySQL con los datos iniciales?')) return;
            try {
                const res = await fetch(`${API_URL}/setup.php`);
                const data = await res.json();
                if (data.success) {
                    alert('Base de datos restablecida con éxito en MySQL.');
                    closeModal('modalXamppStatus');
                    await syncAllFromDatabase();
                }
            } catch (e) {
                alert('Error al restablecer base de datos: ' + e.message);
            }
        }

        // Inicialización automática al cargar
        window.addEventListener('DOMContentLoaded', () => {
            syncAllFromDatabase();
            // Polling cada 15 segundos para refrescar estado en tiempo real
            setInterval(syncAllFromDatabase, 15000);
        });
    </script>
</body>
</html>
