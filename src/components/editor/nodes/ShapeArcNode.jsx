/* eslint-disable react/prop-types */
import React from "react";
import { Arc } from "react-konva";

export default function ShapeArcNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 240;
  const h = el.height ?? 240;
  const innerRadius = Math.max(5, el.innerRadius ?? 60);
  const outerRadius = Math.max(innerRadius + 5, el.outerRadius ?? 100);

  return (
    <Arc
      id={el.id}
      x={el.x + w / 2}
      y={el.y + h / 2}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      angle={el.angle ?? 220}
      rotation={el.rotation || 0}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      draggable={draggable}
      visible={el.visible !== false}
      listening={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        const node = e.target;
        onChange({ x: node.x() - w / 2, y: node.y() - h / 2 });
        onDragEnd?.(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scale = Math.max(node.scaleX(), node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() - w / 2,
          y: node.y() - h / 2,
          innerRadius: innerRadius * scale,
          outerRadius: outerRadius * scale,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
