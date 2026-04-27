/* eslint-disable react/prop-types */
import React from "react";
import { Line } from "react-konva";

export default function ShapeSpiralNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd, buildPoints }) {
  const w = el.width ?? 260;
  const h = el.height ?? 260;
  const turns = Math.max(1, Number(el.turns ?? 4));
  const pointsPerTurn = Math.max(20, Number(el.pointsPerTurn ?? 80));

  const points = buildPoints(w, h, turns, pointsPerTurn);

  return (
    <Line
      id={el.id}
      x={el.x}
      y={el.y}
      points={points}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      rotation={el.rotation || 0}
      draggable={draggable}
      visible={el.visible !== false}
      listening={!el.locked}
      hitStrokeWidth={Math.max(10, (el.strokeWidth ?? 2) * 4)}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
        onDragEnd?.(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: w * scaleX,
          height: h * scaleY,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
