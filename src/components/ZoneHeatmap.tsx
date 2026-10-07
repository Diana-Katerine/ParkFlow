import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { ZoneHeatmapCell } from '../types';

interface ZoneHeatmapProps {
  data: ZoneHeatmapCell[];
}

export const ZoneHeatmap: React.FC<ZoneHeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<ZoneHeatmapCell | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !data || data.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = 920;
    const height = 275;
    const margin = { top: 20, right: 24, bottom: 38, left: 165 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const franjas = Array.from(new Set(data.map((d) => d.franja)));
    const zonas = Array.from(new Set(data.map((d) => d.zonaCorta)));

    const xScale = d3
      .scaleBand<string>()
      .domain(franjas)
      .range([0, innerWidth])
      .padding(0.08);

    const yScale = d3
      .scaleBand<string>()
      .domain(zonas)
      .range([0, innerHeight])
      .padding(0.14);

    // Escala cromática secuencial alineada con la paleta del sistema (Slate claro -> Emerald -> Slate oscuro)
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 45, 75, 100])
      .range(['#F1F5F9', '#A7F3D0', '#10B981', '#0F172A']);

    // Eje X (Franjas horarias)
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight + 8})`)
      .call(xAxis)
      .call((axisGroup) => axisGroup.select('.domain').remove())
      .selectAll('text')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '11px')
      .style('fill', '#475569');

    // Eje Y (Zonas del parqueadero)
    const yAxis = d3.axisLeft(yScale).tickSize(0);
    g.append('g')
      .attr('transform', 'translate(-10,0)')
      .call(yAxis)
      .call((axisGroup) => axisGroup.select('.domain').remove())
      .selectAll('text')
      .style('font-family', 'Plus Jakarta Sans, sans-serif')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#0F172A');

    // Celdas del Mapa de Calor
    const cells = g
      .selectAll('.heatmap-cell')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr(
        'transform',
        (d) => `translate(${xScale(d.franja) || 0},${yScale(d.zonaCorta) || 0})`
      )
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this)
          .select('rect')
          .attr('stroke', '#0F172A')
          .attr('stroke-width', 2);
        setHoveredCell(d);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .select('rect')
          .attr('stroke', '#E2E8F0')
          .attr('stroke-width', 1);
      });

    cells
      .append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => colorScale(d.densidadPorcentaje))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-width', 1);

    // Etiqueta de densidad (%) dentro de cada celda
    cells
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 - 3)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', (d) => (d.densidadPorcentaje >= 78 ? '#FFFFFF' : '#0F172A'))
      .text((d) => `${d.densidadPorcentaje}%`);

    // Sub-etiqueta de rotación vehicular en la celda
    cells
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', yScale.bandwidth() / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '9px')
      .style('fill', (d) => (d.densidadPorcentaje >= 78 ? '#CBD5E1' : '#475569'))
      .text((d) => `${d.rotacionVehiculos} veh`);
  }, [data]);

  // Calcular zona de mayor rotación acumulada
  const rotationByZone = data.reduce<Record<string, { rotacion: number; pico: number }>>(
    (acc, item) => {
      if (!acc[item.zona]) {
        acc[item.zona] = { rotacion: 0, pico: 0 };
      }
      acc[item.zona].rotacion += item.rotacionVehiculos;
      acc[item.zona].pico = Math.max(acc[item.zona].pico, item.densidadPorcentaje);
      return acc;
    },
    {}
  );

  const topZoneEntry = Object.entries(rotationByZone).sort(
    (a, b) => b[1].rotacion - a[1].rotacion
  )[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Mapa de Calor D3.js: Densidad de Ocupación y Rotación Vehicular por Zonas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Matriz espacio-temporal de presión operativa y rotación de vehículos por zona del parqueadero (06:00 – 22:00)
          </p>
        </div>

        {/* Leyenda de escala de densidad D3 */}
        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
          <span>Baja (&lt;40%)</span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-3 rounded-xs bg-slate-100 border border-slate-300 inline-block" />
            <span className="w-4 h-3 rounded-xs bg-emerald-200 inline-block" />
            <span className="w-4 h-3 rounded-xs bg-emerald-500 inline-block" />
            <span className="w-4 h-3 rounded-xs bg-slate-900 inline-block" />
          </div>
          <span>Crítica (&gt;85%)</span>
        </div>
      </div>

      {/* Lienzo vectorial renderizado con D3.js */}
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full h-auto min-w-[680px]" role="img" aria-label="Mapa de calor D3 de densidad por zonas" />
      </div>

      {/* Barra inferior de inspección interactiva y resumen de zona líder en rotación */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        {hoveredCell ? (
          <div className="font-mono text-slate-800 tabular-nums">
            <span className="font-semibold text-slate-900">{hoveredCell.zona}</span>
            <span className="mx-2 text-slate-400">·</span>
            <span>Franja {hoveredCell.franja}</span>
            <span className="mx-2 text-slate-400">·</span>
            <span>Densidad: <strong>{hoveredCell.densidadPorcentaje}%</strong></span>
            <span className="mx-2 text-slate-400">·</span>
            <span>Rotación: <strong>{hoveredCell.rotacionVehiculos} vehículos</strong> (Capacidad: {hoveredCell.capacidadZona} cupos)</span>
          </div>
        ) : (
          <span className="text-slate-500">
            Pase el cursor sobre cualquier bloque del mapa de calor para inspeccionar su rotación exacta y capacidad.
          </span>
        )}

        {topZoneEntry && (
          <div className="font-mono text-slate-700 tabular-nums">
            Mayor rotación: <strong className="text-slate-900">{topZoneEntry[0]}</strong> ({topZoneEntry[1].rotacion} mov · Pico {topZoneEntry[1].pico}%)
          </div>
        )}
      </div>
    </div>
  );
};
