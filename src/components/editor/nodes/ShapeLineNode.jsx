/* eslint-disable react/prop-types */
import React from "react";
import { Line } from "react-konva";

export default function ShapeLineNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 200;

  return (
    <Line
      id={el.id}
      x={el.x}
      y={el.y}
      points={[0, 0, w, 0]}
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

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: node.x(),
          y: node.y(),
          width: w * scaleX,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
