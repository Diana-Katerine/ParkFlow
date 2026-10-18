<?php
/**
 * =============================================================================
 * ParkFlow Enterprise - SaaS Smart Parking Management Platform
 * Modern Dashboard / SaaS Architecture with PHP 8.2 + MySQL (XAMPP)
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
<html lang="es" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ParkFlow SaaS — Enterprise Smart Parking Cloud</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #060911;
            --bg-surface: #0b1120;
            --bg-surface-elevated: #111a2e;
            --bg-surface-hover: #16223b;
            --border: rgba(255, 255, 255, 0.08);
            --border-strong: rgba(255, 255, 255, 0.15);
            --border-focus: #00f5ff;
            --primary: #00f5ff;
            --primary-glow: rgba(0, 245, 255, 0.25);
            --indigo: #6366f1;
            --indigo-subtle: rgba(99, 102, 241, 0.15);
            --emerald: #10b981;
            --emerald-subtle: rgba(16, 185, 129, 0.15);
            --amber: #f59e0b;
            --amber-subtle: rgba(245, 158, 11, 0.15);
            --rose: #f43f5e;
            --rose-subtle: rgba(244, 63, 94, 0.15);
            --text-heading: #f8fafc;
            --text-body: #cbd5e1;
            --text-muted: #64748b;
            --sidebar-width: 260px;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --radius-xl: 20px;
            --shadow-subtle: 0 4px 20px rgba(0, 0, 0, 0.4);
            --shadow-glow: 0 0 25px rgba(0, 245, 255, 0.15);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg-base);
            color: var(--text-body);
            min-height: 100vh;
            display: flex;
            overflow-x: hidden;
            font-size: 14px;
            line-height: 1.5;
        }

        /* SaaS App Layout */
        .saas-layout {
            display: flex;
            width: 100%;
            min-height: 100vh;
        }

        /* Modern Sidebar */
        aside.saas-sidebar {
            width: var(--sidebar-width);
            background: var(--bg-surface);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 50;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-brand {
            padding: 1.25rem 1.25rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
        }

        .brand-logo-wrap {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            text-decoration: none;
        }

        .brand-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--primary), var(--indigo));
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: #060911;
            font-size: 1.1rem;
            box-shadow: 0 0 12px var(--primary-glow);
        }

        .brand-text {
            display: flex;
            flex-direction: column;
        }

        .brand-name {
            font-weight: 800;
            font-size: 1.1rem;
            letter-spacing: -0.02em;
            color: var(--text-heading);
        }

        .brand-plan {
            font-size: 0.68rem;
            color: var(--primary);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        /* Nav Section */
        .sidebar-nav {
            padding: 1rem 0.75rem;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .nav-group-label {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            font-weight: 700;
            padding: 0.75rem 0.75rem 0.35rem;
        }

        .nav-item-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0.6rem 0.75rem;
            border-radius: var(--radius-md);
            color: var(--text-body);
            background: transparent;
            border: 1px solid transparent;
            font-size: 0.84rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
            text-decoration: none;
            font-family: inherit;
        }

        .nav-item-btn:hover {
            background: var(--bg-surface-elevated);
            color: var(--text-heading);
        }

        .nav-item-btn.active {
            background: rgba(0, 245, 255, 0.08);
            border-color: rgba(0, 245, 255, 0.25);
            color: var(--primary);
        }

        .nav-item-left {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .nav-item-icon {
            font-size: 1.05rem;
            width: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nav-pill-badge {
            font-size: 0.68rem;
            padding: 0.15rem 0.45rem;
            border-radius: 9999px;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        .pill-emerald { background: var(--emerald-subtle); color: var(--emerald); }
        .pill-primary { background: rgba(0, 245, 255, 0.15); color: var(--primary); }

        /* Sidebar Footer / User Profile */
        .sidebar-footer {
            padding: 0.85rem 0.75rem;
            border-top: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            background: rgba(6, 9, 17, 0.4);
        }

        .user-profile-card {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.5rem;
            border-radius: var(--radius-md);
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border);
        }

        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: #060911;
            font-size: 0.82rem;
            shrink-0: 0;
        }

        .user-info {
            flex: 1;
            min-width: 0;
        }

        .user-name {
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-heading);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .user-role-select {
            background: transparent;
            border: none;
            color: var(--primary);
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            outline: none;
            font-family: inherit;
            padding: 0;
        }

        /* Main View Area */
        .saas-main {
            margin-left: var(--sidebar-width);
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 100vh;
        }

        /* SaaS Topbar */
        header.saas-topbar {
            height: 64px;
            background: rgba(11, 17, 32, 0.85);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--border);
            padding: 0 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 40;
        }

        .topbar-left {
            display: flex;
            align-items: center;
            gap: 1.25rem;
        }

        .mobile-toggle {
            display: none;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-body);
            padding: 0.4rem 0.6rem;
            border-radius: var(--radius-sm);
            cursor: pointer;
        }

        .breadcrumb {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.82rem;
        }

        .breadcrumb-item { color: var(--text-muted); font-weight: 500; }
        .breadcrumb-sep { color: var(--text-muted); opacity: 0.4; }
        .breadcrumb-active { color: var(--text-heading); font-weight: 700; }

        /* Quick Search Bar in Topbar */
        .topbar-search {
            position: relative;
            width: 260px;
        }

        .topbar-search input {
            width: 100%;
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border);
            color: var(--text-heading);
            padding: 0.45rem 0.75rem 0.45rem 2rem;
            border-radius: var(--radius-md);
            font-size: 0.8rem;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
        }

        .topbar-search input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.12);
            width: 300px;
        }

        .search-icon-abs {
            position: absolute;
            left: 0.65rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8rem;
            color: var(--text-muted);
            pointer-events: none;
        }

        .topbar-right {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }

        /* Server Heartbeat Badge */
        .heartbeat-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
        }

        .hb-connected {
            background: var(--emerald-subtle);
            color: var(--emerald);
            border-color: rgba(16, 185, 129, 0.3);
        }

        .hb-disconnected {
            background: var(--rose-subtle);
            color: var(--rose);
            border-color: rgba(244, 63, 94, 0.3);
        }

        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: currentColor;
            animation: pulse-ring 2s infinite;
        }

        @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.55rem 1rem;
            border-radius: var(--radius-md);
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
            font-family: inherit;
            text-decoration: none;
            white-space: nowrap;
        }

        .btn-primary {
            background: linear-gradient(135deg, #00f5ff, #0284c7);
            color: #060911;
            font-weight: 700;
            box-shadow: 0 2px 10px rgba(0, 245, 255, 0.25);
        }

        .btn-primary:hover {
            opacity: 0.92;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(0, 245, 255, 0.35);
        }

        .btn-secondary {
            background: var(--bg-surface-elevated);
            color: var(--text-heading);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover {
            border-color: var(--border-strong);
            background: var(--bg-surface-hover);
        }

        .btn-danger {
            background: var(--rose-subtle);
            color: var(--rose);
            border: 1px solid rgba(244, 63, 94, 0.3);
        }

        .btn-sm {
            padding: 0.35rem 0.7rem;
            font-size: 0.75rem;
            border-radius: var(--radius-sm);
        }

        /* SaaS Content Container */
        .saas-content {
            padding: 1.5rem 1.75rem 3rem;
            flex: 1;
            max-width: 1560px;
            width: 100%;
            margin: 0 auto;
        }

        /* View Panels */
        .view-panel { display: none; }
        .view-panel.active { display: block; animation: fadeIn 0.2s ease-out; }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* SaaS Metric KPI Cards Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .kpi-card {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            transition: border-color 0.2s, transform 0.2s;
        }

        .kpi-card:hover {
            border-color: rgba(0, 245, 255, 0.3);
            transform: translateY(-2px);
        }

        .kpi-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.75rem;
        }

        .kpi-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .kpi-icon-badge {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }

        .kpi-value {
            font-size: 1.75rem;
            font-weight: 800;
            color: var(--text-heading);
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: -0.03em;
            line-height: 1.1;
            margin-bottom: 0.5rem;
        }

        .kpi-bottom {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
        }

        .trend-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.2rem;
            padding: 0.15rem 0.45rem;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 0.7rem;
        }

        .trend-up { background: var(--emerald-subtle); color: var(--emerald); }
        .trend-down { background: var(--rose-subtle); color: var(--rose); }

        .progress-track {
            width: 100%;
            height: 6px;
            background: var(--bg-surface-elevated);
            border-radius: 9999px;
            overflow: hidden;
            margin-top: 0.4rem;
        }

        .progress-bar-fill {
            height: 100%;
            border-radius: 9999px;
            background: linear-gradient(90deg, var(--primary), var(--indigo));
            transition: width 0.5s ease;
        }

        /* SaaS Analytics Row (Chart & Distribution) */
        .analytics-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1.25rem;
            margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
            .analytics-grid { grid-template-columns: 1fr; }
        }

        .saas-card {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
        }

        .card-header-flex {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .card-heading-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-heading);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .card-heading-sub {
            font-size: 0.72rem;
            color: var(--text-muted);
            margin-top: 0.15rem;
        }

        /* SVG Chart Container */
        .chart-container {
            width: 100%;
            height: 200px;
            position: relative;
        }

        /* Donut Legend */
        .donut-legend {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            margin-top: 1rem;
        }

        .legend-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.78rem;
        }

        .legend-left {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .legend-color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        /* SaaS Data Table */
        .table-card {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            margin-bottom: 1.5rem;
        }

        .table-toolbar {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .table-search-box {
            position: relative;
            max-width: 320px;
            width: 100%;
        }

        .table-search-box input {
            width: 100%;
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border);
            color: var(--text-heading);
            padding: 0.45rem 0.75rem 0.45rem 2rem;
            border-radius: var(--radius-md);
            font-size: 0.8rem;
            outline: none;
            font-family: inherit;
        }

        .table-responsive {
            width: 100%;
            overflow-x: auto;
        }

        table.saas-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.82rem;
            text-align: left;
        }

        table.saas-table th {
            background: rgba(255, 255, 255, 0.015);
            padding: 0.75rem 1.25rem;
            color: var(--text-muted);
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border);
        }

        table.saas-table td {
            padding: 0.85rem 1.25rem;
            border-bottom: 1px solid var(--border);
            color: var(--text-body);
            vertical-align: middle;
        }

        table.saas-table tr:last-child td { border-bottom: none; }
        table.saas-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

        /* Status Pills */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.2rem 0.55rem;
            border-radius: 9999px;
            font-size: 0.72rem;
            font-weight: 700;
        }

        .badge-active-live { background: rgba(0, 245, 255, 0.12); color: var(--primary); }
        .badge-completed { background: var(--emerald-subtle); color: var(--emerald); }
        .badge-blocked { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

        /* License Plate Pill */
        .plate-pill {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 800;
            font-size: 0.82rem;
            background: #ffffff;
            color: #060911;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            display: inline-block;
            letter-spacing: 0.05em;
        }

        /* 2D Parking Bay Visual Grid */
        .bay-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.25rem;
        }

        .zone-box {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
        }

        .zone-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
            padding-bottom: 0.6rem;
            border-bottom: 1px solid var(--border);
        }

        .zone-title {
            font-weight: 700;
            font-size: 0.88rem;
            color: var(--text-heading);
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .bays-matrix {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.65rem;
        }

        .bay-cell {
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 0.75rem 0.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .bay-cell:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
        }

        .bay-code {
            font-size: 1rem;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
        }

        .bay-plate-text {
            font-size: 0.72rem;
            font-family: 'JetBrains Mono', monospace;
            color: var(--primary);
            margin-top: 0.2rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bay-state-tag {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 0.1rem 0.35rem;
            border-radius: 4px;
            margin-top: 0.35rem;
            display: inline-block;
            text-transform: uppercase;
        }

        .bay-disponible { border-color: rgba(16, 185, 129, 0.4); color: var(--emerald); }
        .bay-disponible .bay-state-tag { background: var(--emerald-subtle); color: var(--emerald); }

        .bay-ocupado { border-color: rgba(244, 63, 94, 0.4); color: var(--rose); }
        .bay-ocupado .bay-state-tag { background: var(--rose-subtle); color: var(--rose); }

        .bay-bloqueado { border-color: rgba(100, 116, 139, 0.4); color: #94a3b8; opacity: 0.6; }
        .bay-bloqueado .bay-state-tag { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

        /* Modal Overlay & Card */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(6, 9, 17, 0.85);
            backdrop-filter: blur(10px);
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .modal-backdrop.open { display: flex; }

        .modal-container {
            background: var(--bg-surface);
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-xl);
            max-width: 540px;
            width: 100%;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
            overflow: hidden;
            animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalScale {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .modal-header-saas {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-surface-elevated);
        }

        .modal-title-saas {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-heading);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .modal-body-saas {
            padding: 1.5rem;
            max-height: 75vh;
            overflow-y: auto;
        }

        .modal-footer-saas {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            background: var(--bg-surface-elevated);
        }

        /* Form Controls */
        .form-row { margin-bottom: 1rem; }
        .form-label-saas {
            display: block;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.35rem;
        }

        .form-control-saas {
            width: 100%;
            background: var(--bg-base);
            border: 1px solid var(--border);
            color: var(--text-heading);
            padding: 0.65rem 0.85rem;
            border-radius: var(--radius-md);
            font-size: 0.88rem;
            font-family: inherit;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-control-saas:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.15);
        }

        /* Printable Receipt Card */
        .saas-receipt {
            background: #ffffff;
            color: #0f172a;
            border-radius: var(--radius-md);
            padding: 1.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .receipt-brand {
            text-align: center;
            font-weight: 800;
            font-size: 1.15rem;
            letter-spacing: -0.02em;
        }

        .receipt-sub {
            text-align: center;
            font-size: 0.72rem;
            color: #64748b;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .receipt-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.35rem;
        }

        .receipt-total-bar {
            border-top: 2px dashed #0f172a;
            margin-top: 0.75rem;
            padding-top: 0.5rem;
            display: flex;
            justify-content: space-between;
            font-size: 1.15rem;
            font-weight: 800;
        }

        /* Responsive Mobile Breakpoint */
        @media (max-width: 900px) {
            aside.saas-sidebar {
                transform: translateX(-100%);
            }
            aside.saas-sidebar.mobile-open {
                transform: translateX(0);
            }
            .saas-main {
                margin-left: 0;
            }
            .mobile-toggle {
                display: flex;
            }
            .topbar-search {
                display: none;
            }
        }
    </style>
</head>
<body>

<div class="saas-layout">

    <!-- SaaS Sidebar -->
    <aside class="saas-sidebar" id="saasSidebar">
        <!-- Brand -->
        <div class="sidebar-brand">
            <a href="#dashboard" class="brand-logo-wrap">
                <div class="brand-icon">P</div>
                <div class="brand-text">
                    <span class="brand-name">ParkFlow</span>
                    <span class="brand-plan">SaaS Enterprise</span>
                </div>
            </a>
            <button type="button" class="btn btn-secondary btn-sm mobile-toggle" onclick="toggleMobileSidebar()">✕</button>
        </div>

        <!-- Navigation Menu -->
        <div class="sidebar-nav">
            <div class="nav-group-label">Vistas del Sistema</div>

            <button type="button" class="nav-item-btn active" onclick="switchSaasView('view-overview', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">📊</span>
                    <span>Dashboard General</span>
                </div>
                <span class="nav-pill-badge pill-emerald">En Vivo</span>
            </button>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-operations', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">🚗</span>
                    <span>Flujo & Estancias</span>
                </div>
                <span class="nav-pill-badge pill-primary" id="sidebarActiveStaysBadge">0</span>
            </button>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-matrix', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">🗺️</span>
                    <span>Telemetría de Bahías</span>
                </div>
            </button>

            <div class="nav-group-label">Administración</div>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-rates', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">💰</span>
                    <span>Matriz Tarifaria</span>
                </div>
            </button>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-users', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">👥</span>
                    <span>Cuentas & RBAC</span>
                </div>
            </button>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-audit', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">🛡️</span>
                    <span>Seguridad & Logs</span>
                </div>
            </button>

            <div class="nav-group-label">Servicios</div>

            <button type="button" class="nav-item-btn" onclick="switchSaasView('view-client-portal', this)">
                <div class="nav-item-left">
                    <span class="nav-item-icon">📱</span>
                    <span>Portal Ciudadano</span>
                </div>
            </button>
        </div>

        <!-- User Profile Card in Sidebar -->
        <div class="sidebar-footer">
            <div class="user-profile-card">
                <div class="user-avatar" id="sidebarAvatar">A</div>
                <div class="user-info">
                    <div class="user-name" id="sidebarUserName">Diana Katerine</div>
                    <select class="user-role-select" id="saasRoleSelector" onchange="handleRoleChange(this.value)">
                        <option value="Administrador">Rol: Administrador</option>
                        <option value="Operador">Rol: Operador</option>
                        <option value="Cliente">Rol: Cliente</option>
                    </select>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main SaaS Area -->
    <div class="saas-main">

        <!-- SaaS Topbar -->
        <header class="saas-topbar">
            <div class="topbar-left">
                <button type="button" class="mobile-toggle" onclick="toggleMobileSidebar()">☰</button>
                <div class="breadcrumb">
                    <span class="breadcrumb-item">ParkFlow</span>
                    <span class="breadcrumb-sep">/</span>
                    <span class="breadcrumb-active" id="currentViewBreadcrumb">Dashboard General</span>
                </div>
            </div>

            <!-- Global Live Filter Search -->
            <div class="topbar-search">
                <span class="search-icon-abs">🔍</span>
                <input type="text" id="globalSearchInput" placeholder="Buscar placa, ticket o bahía..." oninput="handleGlobalSearch(this.value)">
            </div>

            <div class="topbar-right">
                <!-- Server Status Chip -->
                <div id="saasDbBadge" class="heartbeat-badge <?= $dbConnected ? 'hb-connected' : 'hb-disconnected' ?>" onclick="openSaasModal('modalXamppDiagnostics')">
                    <span class="status-dot"></span>
                    <span id="saasDbStatusText"><?= $dbConnected ? 'XAMPP MySQL: 3306' : 'MySQL Desconectado' ?></span>
                </div>

                <!-- Primary Action -->
                <button type="button" class="btn btn-primary btn-sm" onclick="openSaasModal('modalCheckIn')">
                    <span>+</span> Registrar Entrada
                </button>
            </div>
        </header>

        <!-- Main SaaS Workspace Content -->
        <main class="saas-content">

            <!-- ======================================================== -->
            <!-- 1. VIEW: DASHBOARD GENERAL (SaaS Overview & Analytics)   -->
            <!-- ======================================================== -->
            <div id="view-overview" class="view-panel active">
                
                <!-- KPI Stat Cards -->
                <div class="kpi-grid">
                    <!-- KPI 1: Ingresos Totales -->
                    <div class="kpi-card">
                        <div class="kpi-top">
                            <span class="kpi-label">Recaudo Acumulado</span>
                            <div class="kpi-icon-badge" style="background:var(--emerald-subtle); color:var(--emerald);">💵</div>
                        </div>
                        <div class="kpi-value" id="kpiTotalRevenue">$0</div>
                        <div class="kpi-bottom">
                            <span class="trend-chip trend-up">↑ +14.8%</span>
                            <span style="color:var(--text-muted);">vs periodo anterior</span>
                        </div>
                    </div>

                    <!-- KPI 2: Ocupación en Tiempo Real -->
                    <div class="kpi-card">
                        <div class="kpi-top">
                            <span class="kpi-label">Ocupación Actual</span>
                            <div class="kpi-icon-badge" style="background:rgba(0,245,255,0.15); color:var(--primary);">🅿️</div>
                        </div>
                        <div class="kpi-value" id="kpiOccupancyPct">0%</div>
                        <div class="kpi-bottom" style="flex-direction:column; align-items:flex-start; width:100%;">
                            <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; color:var(--text-muted);">
                                <span id="kpiOccupiedSpotsText">0 ocupados</span>
                                <span id="kpiFreeSpotsText">24 disponibles</span>
                            </div>
                            <div class="progress-track">
                                <div class="progress-bar-fill" id="kpiOccupancyBar" style="width:0%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- KPI 3: Vehículos Activos -->
                    <div class="kpi-card">
                        <div class="kpi-top">
                            <span class="kpi-label">Estancias Activas</span>
                            <div class="kpi-icon-badge" style="background:var(--indigo-subtle); color:var(--indigo);">🚘</div>
                        </div>
                        <div class="kpi-value" id="kpiActiveVehicles">0</div>
                        <div class="kpi-bottom">
                            <span class="status-badge badge-active-live">En parqueadero</span>
                            <span id="kpiMidnightCount" style="color:var(--amber); font-weight:700;">0 nocturnos</span>
                        </div>
                    </div>

                    <!-- KPI 4: Telemetría Sensores IoT -->
                    <div class="kpi-card">
                        <div class="kpi-top">
                            <span class="kpi-label">Salud de Red IoT</span>
                            <div class="kpi-icon-badge" style="background:rgba(245,158,11,0.15); color:var(--amber);">📡</div>
                        </div>
                        <div class="kpi-value" id="kpiSensorHealth">99.8%</div>
                        <div class="kpi-bottom">
                            <span class="trend-chip trend-up">✓ Nominal</span>
                            <span style="color:var(--text-muted);">24 nodos activos</span>
                        </div>
                    </div>
                </div>

                <!-- SaaS Interactive Charts Row -->
                <div class="analytics-grid">
                    <!-- Curva de Tráfico y Flujo (SVG Bezier Graph) -->
                    <div class="saas-card">
                        <div class="card-header-flex">
                            <div>
                                <h3 class="card-heading-title">📈 Flujo Vehicular & Ingresos por Franja Horaria</h3>
                                <p class="card-heading-sub">Monitoreo de afluencia de vehículos en las últimas 24 horas</p>
                            </div>
                            <div style="display:flex; gap:0.5rem;">
                                <span class="nav-pill-badge pill-primary">Tiempo Real</span>
                            </div>
                        </div>
                        <div class="chart-container">
                            <svg viewBox="0 0 700 180" style="width:100%; height:100%; overflow:visible;">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.35"/>
                                        <stop offset="100%" stop-color="#00f5ff" stop-opacity="0.0"/>
                                    </linearGradient>
                                </defs>
                                <!-- Grid lines -->
                                <line x1="0" y1="30" x2="700" y2="30" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
                                <line x1="0" y1="80" x2="700" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
                                <line x1="0" y1="130" x2="700" y2="130" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4"/>
                                <!-- Area fill -->
                                <path d="M 0,160 Q 70,140 140,90 T 280,60 T 420,110 T 560,40 T 700,80 L 700,170 L 0,170 Z" fill="url(#chartGradient)" />
                                <!-- Spline Stroke -->
                                <path d="M 0,160 Q 70,140 140,90 T 280,60 T 420,110 T 560,40 T 700,80" fill="none" stroke="#00f5ff" stroke-width="3" stroke-linecap="round" />
                                <!-- Highlights -->
                                <circle cx="280" cy="60" r="5" fill="#00f5ff" stroke="#060911" stroke-width="2" />
                                <circle cx="560" cy="40" r="5" fill="#00f5ff" stroke="#060911" stroke-width="2" />
                                <text x="280" y="45" fill="#00f5ff" font-size="11" font-family="'JetBrains Mono'" text-anchor="middle" font-weight="700">Pico 14:00 (18 autos)</text>
                                <text x="560" y="25" fill="#00f5ff" font-size="11" font-family="'JetBrains Mono'" text-anchor="middle" font-weight="700">Pico 19:30 (22 autos)</text>
                            </svg>
                        </div>
                    </div>

                    <!-- Donut Distribution of Fleet -->
                    <div class="saas-card">
                        <div class="card-header-flex">
                            <div>
                                <h3 class="card-heading-title">🚗 Distribución por Flota</h3>
                                <p class="card-heading-sub">Proporción por tipo de vehículo</p>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:center; height:120px;">
                            <svg viewBox="0 0 100 100" style="width:120px; height:120px; transform:rotate(-90deg);">
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#0f172a" stroke-width="12"/>
                                <!-- Autos: 45% -->
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#00f5ff" stroke-width="12" stroke-dasharray="107 239" stroke-dashoffset="0"/>
                                <!-- Motos: 25% -->
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#6366f1" stroke-width="12" stroke-dasharray="60 239" stroke-dashoffset="-107"/>
                                <!-- EV: 15% -->
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" stroke-width="12" stroke-dasharray="36 239" stroke-dashoffset="-167"/>
                                <!-- Camionetas: 15% -->
                                <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="36 239" stroke-dashoffset="-203"/>
                            </svg>
                        </div>
                        <div class="donut-legend">
                            <div class="legend-row">
                                <div class="legend-left"><div class="legend-color-dot" style="background:#00f5ff;"></div><span>Automóviles</span></div>
                                <span style="font-weight:700; color:var(--text-heading);" id="distAutoCount">45%</span>
                            </div>
                            <div class="legend-row">
                                <div class="legend-left"><div class="legend-color-dot" style="background:#6366f1;"></div><span>Motocicletas</span></div>
                                <span style="font-weight:700; color:var(--text-heading);" id="distMotoCount">25%</span>
                            </div>
                            <div class="legend-row">
                                <div class="legend-left"><div class="legend-color-dot" style="background:#10b981;"></div><span>Eléctricos EV</span></div>
                                <span style="font-weight:700; color:var(--text-heading);" id="distEvCount">15%</span>
                            </div>
                            <div class="legend-row">
                                <div class="legend-left"><div class="legend-color-dot" style="background:#f59e0b;"></div><span>Camionetas / SUV</span></div>
                                <span style="font-weight:700; color:var(--text-heading);" id="distSuvCount">15%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Active Stays Quick Table -->
                <div class="table-card">
                    <div class="table-toolbar">
                        <div>
                            <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-heading);">Vehículos en Estancia Activa</h3>
                            <p style="font-size:0.75rem; color:var(--text-muted);">Sincronizado en tiempo real con MySQL</p>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="switchSaasView('view-operations')">
                            Ver Todas las Operaciones →
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="saas-table">
                            <thead>
                                <tr>
                                    <th>Ticket</th>
                                    <th>Placa</th>
                                    <th>Tipo Vehículo</th>
                                    <th>Bahía</th>
                                    <th>Hora Entrada</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody id="overviewActiveTableBody">
                                <tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Cargando estancias desde MySQL...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- ======================================================== -->
            <!-- 2. VIEW: OPERACIONES Y FLUJO VEHICULAR                   -->
            <!-- ======================================================== -->
            <div id="view-operations" class="view-panel">
                <div class="table-card">
                    <div class="table-toolbar">
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <h3 style="font-size:1rem; font-weight:700; color:var(--text-heading);">Control de Flujo Vehicular</h3>
                            <div class="table-search-box">
                                <span class="search-icon-abs">🔍</span>
                                <input type="text" id="operationsFilterInput" placeholder="Filtrar por placa o bahía..." oninput="filterOperationsTable(this.value)">
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="syncAllFromDatabase()">
                                <span>🔄</span> Actualizar
                            </button>
                            <button type="button" class="btn btn-primary btn-sm" onclick="openSaasModal('modalCheckIn')">
                                <span>+</span> Registrar Entrada
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="saas-table">
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Placa</th>
                                    <th>Tipo</th>
                                    <th>Bahía Asignada</th>
                                    <th>Hora Ingreso</th>
                                    <th>Cruce Medianoche</th>
                                    <th>Estado</th>
                                    <th style="text-align:right;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="operationsFullTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 3. VIEW: TELEMETRÍA DE BAHÍAS (MAPA 2D INTERACTIVO)     -->
            <!-- ======================================================== -->
            <div id="view-matrix" class="view-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                    <div>
                        <h2 style="font-size:1.15rem; font-weight:800; color:var(--text-heading);">Matriz de Ocupación por Zonas</h2>
                        <p style="font-size:0.75rem; color:var(--text-muted);">Haz clic en cualquier bahía para cambiar su disponibilidad o inspeccionar el vehículo</p>
                    </div>
                    <div style="display:flex; gap:0.75rem; font-size:0.75rem;">
                        <span style="color:var(--emerald);">● Disponible</span>
                        <span style="color:var(--rose);">● Ocupado</span>
                        <span style="color:#94a3b8;">● Bloqueado</span>
                    </div>
                </div>

                <div class="bay-grid-container" id="saasZonesContainer">
                    <!-- Inyectado dinámicamente -->
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 4. VIEW: MATRIZ TARIFARIA                                -->
            <!-- ======================================================== -->
            <div id="view-rates" class="view-panel">
                <div class="table-card" style="max-width:960px; margin:0 auto;">
                    <div class="table-toolbar">
                        <div>
                            <h3 style="font-size:1rem; font-weight:700; color:var(--text-heading);">Configuración de Tarifas y Cobro</h3>
                            <p style="font-size:0.75rem; color:var(--text-muted);">Valores en Pesos Colombianos (COP) sincronizados con tabla `tarifas` en MySQL</p>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="saas-table">
                            <thead>
                                <tr>
                                    <th>Tipo de Vehículo</th>
                                    <th>Por Minuto</th>
                                    <th>Por Hora</th>
                                    <th>Día Pleno</th>
                                    <th>Fracción Gracia</th>
                                    <th>Último Cambio</th>
                                    <th style="text-align:right;">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="saasRatesTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 5. VIEW: GESTIÓN DE USUARIOS Y RBAC                      -->
            <!-- ======================================================== -->
            <div id="view-users" class="view-panel">
                <div class="table-card">
                    <div class="table-toolbar">
                        <div>
                            <h3 style="font-size:1rem; font-weight:700; color:var(--text-heading);">Cuentas y Matriz RBAC</h3>
                            <p style="font-size:0.75rem; color:var(--text-muted);">Control de privilegios por roles (`Administrador`, `Operador`, `Cliente`)</p>
                        </div>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openSaasModal('modalNewUser')">
                            + Crear Usuario
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="saas-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre Completo</th>
                                    <th>Correo Electrónico</th>
                                    <th>Rol Asignado</th>
                                    <th>Estado</th>
                                    <th>Último Acceso</th>
                                    <th style="text-align:right;">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="saasUsersTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 6. VIEW: BITÁCORA DE AUDITORÍA Y SEGURIDAD              -->
            <!-- ======================================================== -->
            <div id="view-audit" class="view-panel">
                <div class="table-card">
                    <div class="table-toolbar">
                        <div>
                            <h3 style="font-size:1rem; font-weight:700; color:var(--text-heading);">Bitácora Inmutable de Auditoría</h3>
                            <p style="font-size:0.75rem; color:var(--text-muted);">Registro cronológico de eventos en tabla `auditoria` de MySQL</p>
                        </div>
                        <span class="nav-pill-badge pill-emerald">Integridad Verificada</span>
                    </div>
                    <div class="table-responsive" style="max-height:550px; overflow-y:auto;">
                        <table class="saas-table">
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
                            <tbody id="saasAuditTableBody">
                                <!-- Inyectado dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- 7. VIEW: PORTAL DEL CLIENTE                              -->
            <!-- ======================================================== -->
            <div id="view-client-portal" class="view-panel">
                <div style="max-width:760px; margin:0 auto; display:flex; flex-direction:column; gap:1.5rem;">
                    <div class="saas-card">
                        <div class="card-header-flex">
                            <div>
                                <h3 class="card-heading-title">📱 Portal de Consulta Ciudadana</h3>
                                <p class="card-heading-sub">Consulta el estado, tiempo transcurrido y tarifa de tu vehículo en tiempo real</p>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.75rem; margin-bottom:1rem;">
                            <input type="text" id="saasClientPlateSearch" class="form-control-saas" placeholder="Ingresa tu placa (Ej: KLM-456, BGT-902, SUV-779)" style="text-transform:uppercase; font-family:'JetBrains Mono'; font-weight:700; font-size:1rem;">
                            <button type="button" class="btn btn-primary" onclick="handleSaasClientSearch()">
                                Consultar
                            </button>
                        </div>

                        <div id="saasClientResultCard" style="display:none; background:var(--bg-surface-elevated); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
                            <!-- Inyectado dinámicamente -->
                        </div>
                    </div>

                    <!-- Completed Stays History -->
                    <div class="table-card">
                        <div class="table-toolbar">
                            <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-heading);">Historial de Estancias Finalizadas</h3>
                        </div>
                        <div class="table-responsive">
                            <table class="saas-table">
                                <thead>
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Placa</th>
                                        <th>Bahía</th>
                                        <th>Minutos</th>
                                        <th>Valor Pagado</th>
                                        <th>Método</th>
                                        <th>Fecha Salida</th>
                                    </tr>
                                </thead>
                                <tbody id="saasCompletedTableBody">
                                    <!-- Inyectado dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    </div>
</div>

<!-- ================================================================= -->
<!-- MODALES INTERACTIVOS (SAAS STYLE)                                -->
<!-- ================================================================= -->

<!-- Modal: Registrar Entrada Vehicular -->
<div id="modalCheckIn" class="modal-backdrop">
    <div class="modal-container">
        <div class="modal-header-saas">
            <h3 class="modal-title-saas"><span>🎟️</span> Registrar Entrada de Vehículo</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalCheckIn')">✕</button>
        </div>
        <form onsubmit="handleSaasEntrySubmit(event)">
            <div class="modal-body-saas">
                <div class="form-row">
                    <label class="form-label-saas">Placa del Vehículo</label>
                    <input type="text" id="checkInPlate" class="form-control-saas" placeholder="ABC-123 o XRT-82A" required style="text-transform:uppercase; font-family:'JetBrains Mono'; font-weight:700;">
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Tipo de Vehículo</label>
                    <select id="checkInType" class="form-control-saas" onchange="filterAvailableBaysForCheckIn()">
                        <option value="Automóvil">Automóvil (Zona A)</option>
                        <option value="Eléctrico EV">Eléctrico EV (Zona B)</option>
                        <option value="Motocicleta">Motocicleta (Zona C)</option>
                        <option value="Camioneta">Camioneta / SUV (Zona D)</option>
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Bahía de Parqueo Asignada</label>
                    <select id="checkInBay" class="form-control-saas" required>
                        <option value="">Cargando bahías disponibles...</option>
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Nombre del Propietario / Conductor</label>
                    <input type="text" id="checkInOwner" class="form-control-saas" placeholder="Cliente Visitante">
                </div>
            </div>
            <div class="modal-footer-saas">
                <button type="button" class="btn btn-secondary" onclick="closeSaasModal('modalCheckIn')">Cancelar</button>
                <button type="submit" id="btnSubmitCheckIn" class="btn btn-primary">Registrar en MySQL</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Cobro y Liquidación de Salida -->
<div id="modalCheckOut" class="modal-backdrop">
    <div class="modal-container">
        <div class="modal-header-saas">
            <h3 class="modal-title-saas"><span>💳</span> Liquidación de Estancia & Cobro</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalCheckOut')">✕</button>
        </div>
        <div class="modal-body-saas">
            <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <span style="color:var(--text-muted); font-size:0.8rem;">Vehículo & Placa:</span>
                    <span class="plate-pill" id="coPlateDisplay">---</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.8rem;">
                    <span style="color:var(--text-muted);">Bahía Asignada:</span>
                    <span style="color:var(--primary); font-weight:700;" id="coBayDisplay">---</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.8rem;">
                    <span style="color:var(--text-muted);">Tiempo Transcurrido:</span>
                    <span style="font-weight:700; color:var(--text-heading);" id="coDurationDisplay">0 mins</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:1.25rem; font-weight:800; border-top:1px dashed var(--border); padding-top:0.75rem; margin-top:0.75rem;">
                    <span>Total a Pagar:</span>
                    <span style="color:var(--emerald);" id="coTotalAmountDisplay">$0</span>
                </div>
            </div>

            <div class="form-row">
                <label class="form-label-saas">Método de Pago</label>
                <select id="coPaymentMethod" class="form-control-saas">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                    <option value="QR Digital">QR Digital (Bancolombia / Nequi)</option>
                </select>
            </div>
        </div>
        <div class="modal-footer-saas">
            <button type="button" class="btn btn-secondary" onclick="closeSaasModal('modalCheckOut')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="confirmCheckOutPayment()">
                Confirmar Cobro y Liberar Bahía
            </button>
        </div>
    </div>
</div>

<!-- Modal: Factura / Recibo Oficial -->
<div id="modalReceiptSaas" class="modal-backdrop">
    <div class="modal-container" style="max-width:440px;">
        <div class="modal-header-saas">
            <h3 class="modal-title-saas" id="saasReceiptHeaderTitle">Comprobante Oficial</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalReceiptSaas')">✕</button>
        </div>
        <div class="modal-body-saas" id="saasReceiptBody">
            <!-- Inyectado dinámicamente -->
        </div>
        <div class="modal-footer-saas">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Imprimir</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="closeSaasModal('modalReceiptSaas')">Cerrar</button>
        </div>
    </div>
</div>

<!-- Modal: Diagnóstico XAMPP y MySQL -->
<div id="modalXamppDiagnostics" class="modal-backdrop">
    <div class="modal-container">
        <div class="modal-header-saas">
            <h3 class="modal-title-saas"><span>🗄️</span> Telemetría de Servidor XAMPP & MySQL</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalXamppDiagnostics')">✕</button>
        </div>
        <div class="modal-body-saas">
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.75rem; margin-bottom:1.25rem;">
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem;">
                    <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Servidor Web</span>
                    <div style="font-weight:700; color:var(--primary); font-size:0.9rem;">Apache / PHP <?= phpversion() ?></div>
                </div>
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem;">
                    <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Motor Base Datos</span>
                    <div style="font-weight:700; color:var(--emerald); font-size:0.9rem;"><?= htmlspecialchars($dbVersion) ?></div>
                </div>
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem;">
                    <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Host & Puerto</span>
                    <div style="font-weight:700; font-family:'JetBrains Mono'; font-size:0.9rem;">127.0.0.1:3306</div>
                </div>
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem;">
                    <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Base de Datos</span>
                    <div style="font-weight:700; color:var(--primary); font-size:0.9rem;"><?= htmlspecialchars($db->getDbName()) ?></div>
                </div>
            </div>

            <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-md); padding:0.85rem; font-size:0.8rem; color:var(--emerald); margin-bottom:1rem;">
                ✓ Servidor y base de datos relacional conectados y sincronizados en tiempo real mediante PDO.
            </div>
        </div>
        <div class="modal-footer-saas" style="justify-content:space-between;">
            <button type="button" class="btn btn-danger btn-sm" onclick="resetDatabaseFromSaas()">
                Restablecer Base de Datos Demo
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalXamppDiagnostics')">
                Entendido
            </button>
        </div>
    </div>
</div>

<!-- Modal: Crear Usuario -->
<div id="modalNewUser" class="modal-backdrop">
    <div class="modal-container">
        <div class="modal-header-saas">
            <h3 class="modal-title-saas"><span>👤</span> Crear Cuenta de Usuario</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeSaasModal('modalNewUser')">✕</button>
        </div>
        <form onsubmit="handleNewUserSubmit(event)">
            <div class="modal-body-saas">
                <div class="form-row">
                    <label class="form-label-saas">Nombre Completo</label>
                    <input type="text" id="nuName" class="form-control-saas" placeholder="Ej: Camilo Torres" required>
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Correo Electrónico</label>
                    <input type="email" id="nuEmail" class="form-control-saas" placeholder="camilo@parkflow.co" required>
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Rol RBAC</label>
                    <select id="nuRole" class="form-control-saas">
                        <option value="Operador">Operador (Entradas, Cobros y Bahías)</option>
                        <option value="Administrador">Administrador (Control Total & Finanzas)</option>
                        <option value="Cliente">Cliente (Autoconsulta)</option>
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label-saas">Placa Asociada (Opcional)</label>
                    <input type="text" id="nuPlate" class="form-control-saas" placeholder="Ej: KLM-456" style="text-transform:uppercase;">
                </div>
            </div>
            <div class="modal-footer-saas">
                <button type="button" class="btn btn-secondary" onclick="closeSaasModal('modalNewUser')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar en MySQL</button>
            </div>
        </form>
    </div>
</div>

<!-- ================================================================= -->
<!-- LOGICA CLIENTE EN JAVASCRIPT CONEXIÓN A API PHP REST             -->
<!-- ================================================================= -->
<script>
    const API_BASE = 'api';
    let saasState = {
        spots: [],
        tickets: [],
        rates: [],
        users: [],
        audit: [],
        currentRole: 'Administrador',
        pendingCheckOutTicket: null
    };

    // Control de Vistas / Pestañas SaaS
    function switchSaasView(viewId, btnElement) {
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item-btn').forEach(b => b.classList.remove('active'));

        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');

        if (btnElement) {
            btnElement.classList.add('active');
        } else {
            // Find corresponding button
            document.querySelectorAll('.nav-item-btn').forEach(b => {
                if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(viewId)) {
                    b.classList.add('active');
                }
            });
        }

        // Update breadcrumb
        const breadcrumbNames = {
            'view-overview': 'Dashboard General',
            'view-operations': 'Flujo & Estancias',
            'view-matrix': 'Telemetría de Bahías',
            'view-rates': 'Matriz Tarifaria',
            'view-users': 'Cuentas & RBAC',
            'view-audit': 'Seguridad & Logs',
            'view-client-portal': 'Portal Ciudadano'
        };
        document.getElementById('currentViewBreadcrumb').textContent = breadcrumbNames[viewId] || 'Dashboard';
    }

    function toggleMobileSidebar() {
        document.getElementById('saasSidebar').classList.toggle('mobile-open');
    }

    // Modales
    function openSaasModal(id) {
        document.getElementById(id).classList.add('open');
        if (id === 'modalCheckIn') filterAvailableBaysForCheckIn();
    }
    function closeSaasModal(id) {
        document.getElementById(id).classList.remove('open');
    }

    // Cambio de Rol RBAC
    function handleRoleChange(role) {
        saasState.currentRole = role;
        document.getElementById('sidebarAvatar').textContent = role.charAt(0);
        if (role === 'Cliente') {
            switchSaasView('view-client-portal');
        } else if (role === 'Operador') {
            switchSaasView('view-operations');
        } else {
            switchSaasView('view-overview');
        }
    }

    // 1. Sincronización completa con MySQL vía API PHP
    async function syncAllFromDatabase() {
        try {
            // Healthcheck
            const statusRes = await fetch(`${API_BASE}/status.php`);
            const statusJson = await statusRes.json();
            const badge = document.getElementById('saasDbBadge');
            const badgeText = document.getElementById('saasDbStatusText');

            if (statusJson.success && statusJson.data.connected) {
                badge.className = 'heartbeat-badge hb-connected';
                badgeText.textContent = `XAMPP MySQL: ${statusJson.data.port || 3306}`;
            } else {
                badge.className = 'heartbeat-badge hb-disconnected';
                badgeText.textContent = 'MySQL Desconectado';
            }

            // Datos de entidades en paralelo
            const [spotsRes, ratesRes, ticketsRes, usersRes, auditRes] = await Promise.all([
                fetch(`${API_BASE}/spots.php`).then(r => r.json()),
                fetch(`${API_BASE}/rates.php`).then(r => r.json()),
                fetch(`${API_BASE}/tickets.php`).then(r => r.json()),
                fetch(`${API_BASE}/users.php`).then(r => r.json()),
                fetch(`${API_BASE}/audit.php`).then(r => r.json())
            ]);

            if (spotsRes.success) saasState.spots = spotsRes.data;
            if (ratesRes.success) saasState.rates = ratesRes.data;
            if (ticketsRes.success) saasState.tickets = ticketsRes.data;
            if (usersRes.success) saasState.users = usersRes.data;
            if (auditRes.success) saasState.audit = auditRes.data;

            renderSaasInterface();
        } catch (err) {
            console.error('Error sincronizando con API de PHP:', err);
        }
    }

    function renderSaasInterface() {
        renderKpis();
        renderOverviewTable();
        renderOperationsTable();
        renderBayMatrix();
        renderRatesTable();
        renderUsersTable();
        renderAuditTable();
        renderCompletedTable();
    }

    // Renderizar KPIs
    function renderKpis() {
        const total = saasState.spots.length;
        const occupied = saasState.spots.filter(s => s.estado === 'OCUPADO').length;
        const free = total - occupied;
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

        // Total revenue
        const completed = saasState.tickets.filter(t => t.estado === 'FINALIZADO');
        const revenue = completed.reduce((sum, t) => sum + (parseFloat(t.valorPagado) || 0), 0);

        // Nocturnos
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO');
        const midnightCount = active.filter(t => t.cruzoMedianoche).length;

        document.getElementById('kpiTotalRevenue').textContent = `$${revenue.toLocaleString('es-CO')}`;
        document.getElementById('kpiOccupancyPct').textContent = `${pct}%`;
        document.getElementById('kpiOccupiedSpotsText').textContent = `${occupied} ocupados`;
        document.getElementById('kpiFreeSpotsText').textContent = `${free} disponibles`;
        document.getElementById('kpiOccupancyBar').style.width = `${pct}%`;
        document.getElementById('kpiActiveVehicles').textContent = active.length;
        document.getElementById('kpiMidnightCount').textContent = `${midnightCount} nocturnos`;
        document.getElementById('sidebarActiveStaysBadge').textContent = active.length;
    }

    // Renderizar tabla en Overview
    function renderOverviewTable() {
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO').slice(0, 5);
        const tbody = document.getElementById('overviewActiveTableBody');

        if (active.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">No hay estancias activas actualmente.</td></tr>';
            return;
        }

        tbody.innerHTML = active.map(t => `
            <tr>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--primary);">${t.ticketCodigo}</span></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.tipoVehiculo}</td>
                <td><span style="font-weight:700; color:var(--emerald);">${t.spotCodigo}</span></td>
                <td>${new Date(t.fechaIngreso).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
                <td><span class="status-badge badge-active-live">Activo</span></td>
                <td>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openCheckOutModal('${t.id}')">Cobrar</button>
                </td>
            </tr>
        `).join('');
    }

    // Renderizar tabla completa de Operaciones
    function renderOperationsTable() {
        filterOperationsTable(document.getElementById('operationsFilterInput')?.value || '');
    }

    function filterOperationsTable(query) {
        const term = query.trim().toUpperCase();
        const active = saasState.tickets.filter(t => t.estado === 'ACTIVO');
        const filtered = term ? active.filter(t => t.placa.includes(term) || t.spotCodigo.includes(term) || t.ticketCodigo.includes(term)) : active;

        const tbody = document.getElementById('operationsFullTableBody');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No se encontraron vehículos activos con ese criterio.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(t => `
            <tr>
                <td><strong style="color:var(--primary); font-family:'JetBrains Mono';">${t.ticketCodigo}</strong></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.tipoVehiculo}</td>
                <td><strong style="color:var(--emerald);">${t.spotCodigo}</strong></td>
                <td>${new Date(t.fechaIngreso).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}</td>
                <td>${t.cruzoMedianoche ? '<span style="color:var(--amber); font-weight:700;">🌙 Cruce Nocturno</span>' : '<span style="color:var(--text-muted);">Diurno</span>'}</td>
                <td><span class="status-badge badge-active-live">Activo</span></td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" title="Simular cruce de medianoche (-16h)" onclick="simulateMidnightCrossing('${t.id}')">🌙 -16h</button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openCheckOutModal('${t.id}')">Liquidación</button>
                </td>
            </tr>
        `).join('');
    }

    // Filtrar bahías en modal de CheckIn
    function filterAvailableBaysForCheckIn() {
        const type = document.getElementById('checkInType').value;
        const select = document.getElementById('checkInBay');
        select.innerHTML = '';

        const freeBays = saasState.spots.filter(s => s.estado === 'DISPONIBLE' && s.tipoPermitido === type);
        if (freeBays.length === 0) {
            select.innerHTML = `<option value="">No hay bahías disponibles para ${type}</option>`;
            return;
        }

        freeBays.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.codigo;
            opt.textContent = `${b.codigo} (${b.zona} · ${b.nivel})`;
            select.appendChild(opt);
        });
    }

    // Registrar Entrada (Check-In)
    async function handleSaasEntrySubmit(e) {
        e.preventDefault();
        const plate = document.getElementById('checkInPlate').value.trim().toUpperCase();
        const type = document.getElementById('checkInType').value;
        const bay = document.getElementById('checkInBay').value;
        const owner = document.getElementById('checkInOwner').value.trim() || 'Cliente Visitante';

        if (!bay) {
            alert('Seleccione una bahía disponible.');
            return;
        }

        const btn = document.getElementById('btnSubmitCheckIn');
        btn.disabled = true;
        btn.textContent = 'Guardando en MySQL...';

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placa: plate,
                    tipoVehiculo: type,
                    spotCodigo: bay,
                    propietarioNombre: owner,
                    operadorEntrada: saasState.currentRole
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error registrando entrada.');
                return;
            }

            closeSaasModal('modalCheckIn');
            document.getElementById('checkInPlate').value = '';
            document.getElementById('checkInOwner').value = '';

            // Mostrar ticket generado
            showCheckInReceipt(data.data);

            await syncAllFromDatabase();
        } catch (err) {
            alert('Error de conexión: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Registrar en MySQL';
        }
    }

    function showCheckInReceipt(ticket) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Ticket de Ingreso Oficial';
        const html = `
            <div class="saas-receipt">
                <div class="receipt-brand">PARKFLOW CLOUD</div>
                <div class="receipt-sub">TICKET DIGITAL · CONTROL DE ACCESO</div>
                <div class="receipt-line"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.1rem;">${ticket.placa}</strong></div>
                <div class="receipt-line"><span>TIPO:</span><span>${ticket.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA:</span><strong style="color:#10b981;">${ticket.spotCodigo}</strong></div>
                <div class="receipt-line"><span>FECHA ENTRADA:</span><span>${new Date(ticket.fechaIngreso).toLocaleString('es-CO')}</span></div>
                <div class="receipt-line"><span>OPERADOR:</span><span>${ticket.operadorEntrada}</span></div>
                <div style="text-align:center; margin-top:1.25rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem;">
                    <span style="font-size:0.68rem; color:#64748b;">Conserve este ticket para la salida y facturación.</span>
                    <div style="font-family:'JetBrains Mono'; letter-spacing:0.3em; margin-top:0.35rem; font-size:0.85rem;">||| | |||| | ||||| |||| |</div>
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceiptSaas');
    }

    // Modal de Cobro / Salida
    function openCheckOutModal(ticketId) {
        const ticket = saasState.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        saasState.pendingCheckOutTicket = ticket;

        const rate = saasState.rates.find(r => r.tipoVehiculo === ticket.tipoVehiculo) || {
            tarifaPorMinuto: 110,
            tarifaPorHora: 5800,
            tarifaPlenaDia: 42000,
            fraccionGraciaMin: 5
        };

        const entryTime = new Date(ticket.fechaIngreso).getTime();
        const mins = Math.max(1, Math.round((Date.now() - entryTime) / 60000));

        let amount = 0;
        if (ticket.cruzoMedianoche || mins >= 720) {
            amount = rate.tarifaPlenaDia;
        } else if (mins <= rate.fraccionGraciaMin) {
            amount = 0;
        } else {
            const h = Math.floor(mins / 60);
            const rem = mins % 60;
            amount = (h * rate.tarifaPorHora) + (rem * rate.tarifaPorMinuto);
            if (amount > rate.tarifaPlenaDia) amount = rate.tarifaPlenaDia;
        }

        saasState.pendingCheckOutTicket.calculatedMinutes = mins;
        saasState.pendingCheckOutTicket.calculatedAmount = amount;

        document.getElementById('coPlateDisplay').textContent = ticket.placa;
        document.getElementById('coBayDisplay').textContent = ticket.spotCodigo;
        document.getElementById('coDurationDisplay').textContent = `${mins} minutos (${(mins/60).toFixed(1)} hrs)`;
        document.getElementById('coTotalAmountDisplay').textContent = `$${amount.toLocaleString('es-CO')} COP`;

        openSaasModal('modalCheckOut');
    }

    async function confirmCheckOutPayment() {
        const t = saasState.pendingCheckOutTicket;
        if (!t) return;

        const method = document.getElementById('coPaymentMethod').value;

        try {
            const res = await fetch(`${API_BASE}/tickets.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logId: t.id,
                    valorPagado: t.calculatedAmount,
                    minutosTranscurridos: t.calculatedMinutes,
                    metodoPago: method,
                    operadorSalida: saasState.currentRole
                })
            });

            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error al liquidar salida.');
                return;
            }

            closeSaasModal('modalCheckOut');
            showCheckOutReceipt(data.data);
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error al liquidar cobro en MySQL: ' + e.message);
        }
    }

    function showCheckOutReceipt(ticket) {
        document.getElementById('saasReceiptHeaderTitle').textContent = 'Factura Electrónica Equivalente';
        const html = `
            <div class="saas-receipt">
                <div class="receipt-brand">PARKFLOW CLOUD</div>
                <div class="receipt-sub">FACTURA Y RECIBO DE PAGO · MYSQL AUDITED</div>
                <div class="receipt-line"><span>TICKET N°:</span><strong>${ticket.ticketCodigo}</strong></div>
                <div class="receipt-line"><span>PLACA:</span><strong style="color:#0284c7; font-size:1.15rem;">${ticket.placa}</strong></div>
                <div class="receipt-line"><span>TIPO VEHÍCULO:</span><span>${ticket.tipoVehiculo}</span></div>
                <div class="receipt-line"><span>BAHÍA LIBERADA:</span><strong>${ticket.spotCodigo}</strong></div>
                <div class="receipt-line"><span>DURACIÓN TOTAL:</span><span>${ticket.minutosTranscurridos} minutos</span></div>
                <div class="receipt-line"><span>MÉTODO PAGO:</span><span>${ticket.metodoPago}</span></div>
                <div class="receipt-line"><span>FECHA SALIDA:</span><span>${new Date(ticket.fechaSalida).toLocaleString('es-CO')}</span></div>
                <div class="receipt-total-bar">
                    <span>TOTAL PAGADO:</span>
                    <span style="color:#10b981;">$${(ticket.valorPagado || 0).toLocaleString('es-CO')} COP</span>
                </div>
                <div style="text-align:center; margin-top:1rem; border-top:1px dashed #cbd5e1; padding-top:0.75rem; font-size:0.72rem; color:#64748b;">
                    ¡Gracias por usar ParkFlow! Bahía liberada en MySQL.
                </div>
            </div>
        `;
        document.getElementById('saasReceiptBody').innerHTML = html;
        openSaasModal('modalReceiptSaas');
    }

    // Simular cruce de medianoche
    async function simulateMidnightCrossing(logId) {
        try {
            await fetch(`${API_BASE}/tickets.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'shift_midnight', logId, hoursBack: 16 })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error al simular medianoche: ' + e.message);
        }
    }

    // Renderizar Matriz 2D de Bahías
    function renderBayMatrix() {
        const zones = {
            'Zona A · Estándar': [],
            'Zona B · EV & VIP': [],
            'Zona C · Motos': [],
            'Zona D · Camionetas': []
        };

        saasState.spots.forEach(s => {
            if (zones[s.zona]) zones[s.zona].push(s);
        });

        const container = document.getElementById('saasZonesContainer');
        container.innerHTML = '';

        for (const [zoneName, spots] of Object.entries(zones)) {
            const zDiv = document.createElement('div');
            zDiv.className = 'zone-box';

            const freeCount = spots.filter(s => s.estado === 'DISPONIBLE').length;

            const baysHtml = spots.map(s => {
                const stateClass = s.estado === 'DISPONIBLE' ? 'bay-disponible' : s.estado === 'OCUPADO' ? 'bay-ocupado' : 'bay-bloqueado';
                return `
                    <div class="bay-cell ${stateClass}" onclick="handleBayClick('${s.id}', '${s.codigo}', '${s.estado}')">
                        <div class="bay-code">${s.codigo}</div>
                        <div class="bay-plate-text">${s.placaActual || '—'}</div>
                        <span class="bay-state-tag">${s.estado}</span>
                    </div>
                `;
            }).join('');

            zDiv.innerHTML = `
                <div class="zone-header-row">
                    <span class="zone-title">${zoneName}</span>
                    <span class="status-badge badge-active-live">${freeCount}/${spots.length} Libres</span>
                </div>
                <div class="bays-matrix">${baysHtml}</div>
            `;
            container.appendChild(zDiv);
        }
    }

    async function handleBayClick(id, code, state) {
        if (state === 'OCUPADO') {
            const ticket = saasState.tickets.find(t => t.spotCodigo === code && t.estado === 'ACTIVO');
            if (ticket) openCheckOutModal(ticket.id);
            return;
        }

        if (!confirm(`¿Alternar estado de bahía ${code}? (Disponible <-> Mantenimiento/Bloqueado)`)) return;

        try {
            await fetch(`${API_BASE}/spots.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, toggleMantenimiento: true })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Renderizar Tarifas
    function renderRatesTable() {
        const tbody = document.getElementById('saasRatesTableBody');
        tbody.innerHTML = saasState.rates.map(r => `
            <tr>
                <td><strong style="color:var(--text-heading);">${r.tipoVehiculo}</strong></td>
                <td><span style="font-family:'JetBrains Mono';">$${r.tarifaPorMinuto}</span></td>
                <td><span style="font-family:'JetBrains Mono'; font-weight:700; color:var(--primary);">$${r.tarifaPorHora.toLocaleString('es-CO')}</span></td>
                <td><span style="font-family:'JetBrains Mono';">$${r.tarifaPlenaDia.toLocaleString('es-CO')}</span></td>
                <td>${r.fraccionGraciaMin} min</td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${r.actualizadoEn}</td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="editRateModal('${r.id}', '${r.tipoVehiculo}', ${r.tarifaPorHora}, ${r.tarifaPorMinuto})">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function editRateModal(id, tipo, curH, curM) {
        const newH = prompt(`Nueva tarifa por hora para ${tipo} (COP):`, curH);
        if (!newH || isNaN(newH)) return;
        const newM = prompt(`Nueva tarifa por minuto para ${tipo} (COP):`, curM);
        if (!newM || isNaN(newM)) return;

        try {
            await fetch(`${API_BASE}/rates.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, tarifaPorHora: parseFloat(newH), tarifaPorMinuto: parseFloat(newM) })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error actualizando tarifa: ' + e.message);
        }
    }

    // Renderizar Usuarios
    function renderUsersTable() {
        const tbody = document.getElementById('saasUsersTableBody');
        tbody.innerHTML = saasState.users.map(u => `
            <tr>
                <td><span style="font-family:'JetBrains Mono'; color:var(--text-muted);">${u.id}</span></td>
                <td><strong style="color:var(--text-heading);">${u.nombre}</strong></td>
                <td>${u.email}</td>
                <td>
                    <span class="status-badge ${u.rol==='Administrador'?'pill-emerald':u.rol==='Operador'?'pill-primary':'status-badge'}">
                        ${u.rol}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${u.activo ? 'badge-completed' : 'badge-blocked'}">
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${u.ultimoAcceso}</td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="toggleUserStatus('${u.id}')">
                        ${u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function toggleUserStatus(id) {
        try {
            await fetch(`${API_BASE}/users.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, toggleActivo: true })
            });
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    async function handleNewUserSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('nuName').value.trim();
        const email = document.getElementById('nuEmail').value.trim();
        const role = document.getElementById('nuRole').value;
        const plate = document.getElementById('nuPlate').value.trim();

        try {
            const res = await fetch(`${API_BASE}/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: name, email, rol: role, placaAsociada: plate })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Error al crear usuario.');
                return;
            }
            closeSaasModal('modalNewUser');
            await syncAllFromDatabase();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Renderizar Auditoría
    function renderAuditTable() {
        const tbody = document.getElementById('saasAuditTableBody');
        tbody.innerHTML = saasState.audit.slice(0, 30).map(a => `
            <tr>
                <td style="white-space:nowrap; font-family:'JetBrains Mono'; font-size:0.75rem; color:var(--text-muted);">${a.timestamp}</td>
                <td><strong>${a.usuarioEmail}</strong></td>
                <td>${a.rol}</td>
                <td><span style="color:var(--primary); font-weight:700;">${a.modulo}</span></td>
                <td>${a.accion}</td>
                <td style="font-size:0.78rem;">${a.detalle}</td>
                <td><span class="status-badge ${a.resultado==='OK'?'badge-completed':'badge-blocked'}">${a.resultado}</span></td>
            </tr>
        `).join('');
    }

    // Renderizar Historial de Estancias
    function renderCompletedTable() {
        const completed = saasState.tickets.filter(t => t.estado === 'FINALIZADO');
        const tbody = document.getElementById('saasCompletedTableBody');

        if (completed.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1rem;">Sin estancias finalizadas registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = completed.map(t => `
            <tr>
                <td><strong style="color:var(--primary); font-family:'JetBrains Mono';">${t.ticketCodigo}</strong></td>
                <td><span class="plate-pill">${t.placa}</span></td>
                <td>${t.spotCodigo}</td>
                <td>${t.minutosTranscurridos || 0} min</td>
                <td><strong style="color:var(--emerald);">$${(t.valorPagado || 0).toLocaleString('es-CO')}</strong></td>
                <td>${t.metodoPago || '—'}</td>
                <td style="color:var(--text-muted); font-size:0.75rem;">${new Date(t.fechaSalida || t.fechaIngreso).toLocaleString('es-CO')}</td>
            </tr>
        `).join('');
    }

    // Portal del Cliente - Búsqueda
    function handleSaasClientSearch() {
        const plate = document.getElementById('saasClientPlateSearch').value.trim().toUpperCase();
        const card = document.getElementById('saasClientResultCard');

        if (!plate) {
            alert('Ingresa una placa.');
            return;
        }

        const active = saasState.tickets.find(t => t.estado === 'ACTIVO' && t.placa === plate);
        if (!active) {
            card.style.display = 'block';
            card.innerHTML = `
                <div style="color:var(--rose); font-weight:700; margin-bottom:0.25rem;">Vehículo no encontrado</div>
                <p style="font-size:0.8rem; color:var(--text-muted);">La placa <strong>${plate}</strong> no tiene ingreso activo vigente.</p>
            `;
            return;
        }

        const mins = Math.max(1, Math.round((Date.now() - new Date(active.fechaIngreso).getTime()) / 60000));
        card.style.display = 'block';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
                <div>
                    <span class="plate-pill" style="font-size:1.25rem;">${active.placa}</span>
                    <span style="margin-left:0.5rem; color:var(--primary); font-size:0.85rem;">${active.tipoVehiculo}</span>
                </div>
                <span class="status-badge badge-active-live">Estancia en Curso</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem;">
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Bahía Asignada</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--emerald);">${active.spotCodigo}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Hora Ingreso</div>
                    <div style="font-size:1rem; font-weight:700; color:var(--text-heading);">${new Date(active.fechaIngreso).toLocaleTimeString('es-CO')}</div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Tiempo Actual</div>
                    <div style="font-size:1.2rem; font-weight:800; color:var(--primary);">${mins} mins</div>
                </div>
            </div>
        `;
    }

    // Buscador Global en Topbar
    function handleGlobalSearch(term) {
        if (!term.trim()) return;
        switchSaasView('view-operations');
        const input = document.getElementById('operationsFilterInput');
        if (input) {
            input.value = term;
            filterOperationsTable(term);
        }
    }

    // Restablecer DB desde SaaS
    async function resetDatabaseFromSaas() {
        if (!confirm('¿Restablecer la base de datos `parkflow_db` en MySQL con los datos de fábrica?')) return;
        try {
            const res = await fetch(`${API_BASE}/setup.php`);
            const data = await res.json();
            if (data.success) {
                alert('Base de datos restablecida con éxito en MySQL.');
                closeSaasModal('modalXamppDiagnostics');
                await syncAllFromDatabase();
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    }

    // Inicializar al cargar el DOM
    window.addEventListener('DOMContentLoaded', () => {
        syncAllFromDatabase();
        // Polling cada 12 segundos para actualizar métricas en vivo
        setInterval(syncAllFromDatabase, 12000);
    });
</script>
</body>
</html>
