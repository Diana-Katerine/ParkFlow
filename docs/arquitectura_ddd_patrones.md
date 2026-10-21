# ParkFlow · Arquitectura de Software: Dominios del Sistema (DDD) y Patrones de Diseño

Este documento describe la arquitectura formal implementada en **ParkFlow**, fundamentada en **Domain-Driven Design (DDD)** y en cuatro **Patrones de Diseño de Software** esenciales para sistemas de gestión vehicular y telemetría en tiempo real.

---

## 1. Dominios del Sistema (Domain-Driven Design - DDD)

El sistema está estructurado en tres **Bounded Contexts (Contextos Delimitados)** de alta cohesión y bajo acoplamiento:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PARKFLOW CLOUD CORE                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   DOMINIO DE ACCESO     │ │  DOMINIO DE FACTURACIÓN  │ │   DOMINIO DE IDENTIDAD  │
│   Y ESTACIONAMIENTO     │ │       Y TARIFAS         │ │       Y AUDITORÍA       │
├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
│ • Control de Ocupación  │ │ • Cálculo Algorítmico   │ │ • Perfiles RBAC         │
│ • Ingreso/Salida Placa  │ │ • Liquidación Minuto/Día│ │ • Autenticación JWT     │
│ • Capacidad Máxima:     │ │ • Tarifas Dinámicas     │ │ • Log de Auditoría      │
│   - Automóviles         │ │ • Consecutivos Únicos   │ │ • Acciones Críticas     │
│   - Motocicletas        │ │   (Tickets Digitales)   │ │   Auditadas en MySQL    │
│   - Bicicletas          │ │                         │ │                         │
│ • Sensores IoT de Bahía │ │                         │ │                         │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

### 1.1 Dominio de Acceso y Estacionamiento
- **Responsabilidad:** Gestiona la ocupación de la infraestructura física del parqueadero, controlando el ciclo completo de ingreso y salida vehicular mediante la lectura y validación del número de placa.
- **Capacidad Máxima Instalada:** Administra cupos delimitados por categoría vehicular:
  - **Automóviles (Zona A):** Capacidad de bahías estándar con sensores ultrasónicos de piso.
  - **Motocicletas (Zona C):** Capacidad optimizada para motos de alto y bajo cilindraje.
  - **Bicicletas (Zona E):** Capacidad en bicicletero ecológico con tarifas preferenciales y tiempos de cortesía extendidos.
  - **Camionetas / SUV (Zona D) & EV (Zona B):** Bahías con cargadores eléctricos y monitoreo de kW.
- **Entidades y Agregados:** `Espacio (Spot)`, `Vehículo (Vehicle)`, `SensorIoT (SensorHealth)`.

### 1.2 Dominio de Facturación y Tarifas
- **Responsabilidad:** Encargado del cálculo algorítmico preciso de los tiempos de permanencia y la liquidación automática monetaria en Pesos Colombianos (COP).
- **Esquemas Tarifarios Dinámicos:**
  - Cobro por minutos exactos y cobro mixto (horas + fracción).
  - Políticas de gracia de cortesía (5 a 15 minutos).
  - Esquema de cruce de medianoche y tope de día pleno.
  - Generación de consecutivos únicos e irrepetibles para tickets digitales auditados (`TCK-2026-XXXX`).
- **Entidades y Agregados:** `TicketDigital`, `MatrizTarifaria`, `AlgoritmoLiquidacion`.

### 1.3 Dominio de Identidad y Auditoría
- **Responsabilidad:** Administra los perfiles de usuario y el control de acceso basado en roles (**RBAC**), distinguiendo privilegios entre `Administrador`, `Operador` y `Cliente`.
- **Seguridad & JWT:** Controla la emisión y validación de tokens seguros firmados para transacciones API y sesiones web.
- **Bitácora de Auditoría:** Mantiene un registro cronológico inmutable en MySQL de todas las acciones críticas (ingresos, liquidaciones, anulaciones, aperturas de barrera y cambios de tarifas).

---

## 2. Patrones de Diseño Recomendados e Implementados

### 2.1 Strategy (Estrategia)
- **Propósito:** Aísla el cálculo algorítmico de permanencia y costos, permitiendo intercambiar las fórmulas de cobro en tiempo de ejecución sin modificar el código cliente.
- **Implementación:**
  - `BillingStrategyInterface`: Contrato para las estrategias de cobro.
  - `AutomovilBillingStrategy`: Tarifa base de $110/min y $5.800/hora.
  - `MotocicletaBillingStrategy`: Tarifa de $65/min y $3.400/hora.
  - `BicicletaBillingStrategy`: Tarifa ecológica de $25/min con 15 minutos de gracia gratuita.
  - `TarifaNocturnaBillingStrategy`: Aplicada automáticamente en cruces de medianoche o estancias nocturnas prolongadas.
  - `BillingStrategyContext`: Contexto que selecciona la estrategia adecuada según el tipo de vehículo y condiciones temporales.
- **Ubicación:** `backend/patterns/Strategy.php` y módulo de cálculo en `frontend/js/app.js`.

### 2.2 Observer (Observador)
- **Propósito:** Monitoreo dinámico de disponibilidad y telemetría en tiempo real.
- **Implementación:**
  - `IoTSensorSubject`: Sujeto que emite eventos cuando un sensor IoT detecta ocupación o desocupación.
  - `SpotMapObserver`: Notifica al mapa interactivo SVG/DOM para cambiar el color de la bahía (verde, rojo, gris).
  - `DashboardMetricsObserver`: Recalcula instantáneamente los KPIs de ocupación y contadores disponibles.
  - `AuditLoggerObserver`: Escribe la telemetría del sensor en la tabla de auditoría en MySQL.
- **Ubicación:** `backend/patterns/Observer.php` y módulo de simulación reactiva en `frontend/js/app.js`.

### 2.3 State (Estado)
- **Propósito:** Gestiona el ciclo de vida de los espacios de parqueo, encapsulando las transiciones válidas y prohibiendo estados inconsistentes.
- **Estados Implementados:**
  - **`LibreState` (Verde / `DISPONIBLE`):** Admite ingreso de vehículos (`occupy()`) o paso a mantenimiento (`setMaintenance()`).
  - **`OcupadoState` (Rojo / `OCUPADO`):** Solo admite salida de vehículos (`vacate()`). Rechaza ingresos duplicados o paso directo a mantenimiento sin liberar.
  - **`MantenimientoState` (Gris / `BLOQUEADO`):** Rechaza el estacionamiento de vehículos hasta que el operador libere el espacio (`releaseMaintenance()`).
- **Ubicación:** `backend/patterns/State.php` y máquina de estados en `frontend/js/app.js`.

### 2.4 Data Transfer Object (DTO)
- **Propósito:** Estandariza la comunicación en formato JSON entre la API RESTful de PHP y el frontend, protegiendo las columnas internas de MySQL y exponiendo únicamente los campos necesarios y sanitizados.
- **DTOs Implementados:**
  - `TicketDTO`: Datos del ticket, duración calculada, total y operador de salida.
  - `SpotDTO`: Telemetría del cupo, salud del sensor, zona y placa actual.
  - `RateDTO`: Matriz tarifaria con tiempos de gracia y tarifas por minuto.
- **Ubicación:** `backend/patterns/DTO.php`.
