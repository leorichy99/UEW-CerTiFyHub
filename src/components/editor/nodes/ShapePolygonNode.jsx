/* eslint-disable react/prop-types */
import React from "react";
import { RegularPolygon } from "react-konva";

export default function ShapePolygonNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 200;
  const h = el.height ?? 200;
  const radius = Math.max(10, Math.min(w, h) / 2);

  return (
    <RegularPolygon
      id={el.id}
      x={el.x + w / 2}
      y={el.y + h / 2}
      sides={el.sides ?? 6}
      radius={radius}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      rotation={el.rotation || 0}
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
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() - (w * scaleX) / 2,
          y: node.y() - (h * scaleY) / 2,
          width: w * scaleX,
          height: h * scaleY,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
