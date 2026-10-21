<?php
/**
 * ParkFlow - Patrón Data Transfer Object (DTO)
 * Estándar para comunicación en formato JSON entre la API RESTful y el panel web,
 * protegiendo el modelo de base de datos interno al enviar solo los datos necesarios al cliente.
 */

class TicketDTO {
    public string $id;
    public string $ticketCodigo;
    public string $placa;
    public string $tipoVehiculo;
    public string $spotCodigo;
    public string $fechaIngreso;
    public ?string $fechaSalida;
    public ?int $minutosTranscurridos;
    public ?float $valorPagado;
    public ?string $metodoPago;
    public string $estado;
    public string $operadorEntrada;
    public ?string $operadorSalida;
    public bool $cruzoMedianoche;
    public ?string $propietarioNombre;

    public static function fromDatabaseRow(array $row): self {
        $dto = new self();
        $dto->id = (string)($row['id'] ?? '');
        $dto->ticketCodigo = (string)($row['ticket_codigo'] ?? '');
        $dto->placa = (string)($row['placa'] ?? '');
        $dto->tipoVehiculo = (string)($row['tipo_vehiculo'] ?? '');
        $dto->spotCodigo = (string)($row['spot_codigo'] ?? '');
        $dto->fechaIngreso = (string)($row['fecha_ingreso'] ?? '');
        $dto->fechaSalida = isset($row['fecha_salida']) ? (string)$row['fecha_salida'] : null;
        $dto->minutosTranscurridos = isset($row['minutos_transcurridos']) ? (int)$row['minutos_transcurridos'] : null;
        $dto->valorPagado = isset($row['valor_pagado']) ? (float)$row['valor_pagado'] : null;
        $dto->metodoPago = isset($row['metodo_pago']) ? (string)$row['metodo_pago'] : null;
        $dto->estado = (string)($row['estado'] ?? 'ACTIVO');
        $dto->operadorEntrada = (string)($row['operador_entrada'] ?? '');
        $dto->operadorSalida = isset($row['operador_salida']) ? (string)$row['operador_salida'] : null;
        $dto->cruzoMedianoche = !empty($row['cruzo_medianoche']);
        $dto->propietarioNombre = isset($row['propietario_nombre']) ? (string)$row['propietario_nombre'] : null;
        return $dto;
    }

    public function toArray(): array {
        return get_object_vars($this);
    }
}

class SpotDTO {
    public string $id;
    public string $codigo;
    public string $nivel;
    public string $zona;
    public string $tipoPermitido;
    public string $estado;
    public bool $esVip;
    public ?float $potenciaEvKw;
    public float $saludSensor;
    public ?string $placaActual;
    public ?string $ticketActualId;

    public static function fromDatabaseRow(array $row): self {
        $dto = new self();
        $dto->id = (string)($row['id'] ?? '');
        $dto->codigo = (string)($row['codigo'] ?? '');
        $dto->nivel = (string)($row['nivel'] ?? '');
        $dto->zona = (string)($row['zona'] ?? '');
        $dto->tipoPermitido = (string)($row['tipo_permitido'] ?? '');
        $dto->estado = (string)($row['estado'] ?? 'DISPONIBLE');
        $dto->esVip = !empty($row['es_vip']);
        $dto->potenciaEvKw = isset($row['potencia_ev_kw']) ? (float)$row['potencia_ev_kw'] : null;
        $dto->saludSensor = (float)($row['salud_sensor'] ?? 99.9);
        $dto->placaActual = isset($row['placa_actual']) ? (string)$row['placa_actual'] : null;
        $dto->ticketActualId = isset($row['ticket_actual_id']) ? (string)$row['ticket_actual_id'] : null;
        return $dto;
    }

    public function toArray(): array {
        return get_object_vars($this);
    }
}

class RateDTO {
    public string $id;
    public string $tipoVehiculo;
    public float $tarifaPorMinuto;
    public float $tarifaPorHora;
    public float $tarifaPlenaDia;
    public int $fraccionGraciaMin;
    public string $actualizadoEn;

    public static function fromDatabaseRow(array $row): self {
        $dto = new self();
        $dto->id = (string)($row['id'] ?? '');
        $dto->tipoVehiculo = (string)($row['tipo_vehiculo'] ?? '');
        $dto->tarifaPorMinuto = (float)($row['tarifa_por_minuto'] ?? 0);
        $dto->tarifaPorHora = (float)($row['tarifa_por_hora'] ?? 0);
        $dto->tarifaPlenaDia = (float)($row['tarifa_plena_dia'] ?? 0);
        $dto->fraccionGraciaMin = (int)($row['fraccion_gracia_min'] ?? 5);
        $dto->actualizadoEn = (string)($row['actualizado_en'] ?? '');
        return $dto;
    }

    public function toArray(): array {
        return get_object_vars($this);
    }
}
