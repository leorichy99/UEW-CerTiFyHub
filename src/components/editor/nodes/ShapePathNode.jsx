/* eslint-disable react/prop-types */
import React from "react";
import { Path } from "react-konva";

export default function ShapePathNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 240;
  const h = el.height ?? 240;

  return (
    <Path
      id={el.id}
      x={el.x}
      y={el.y}
      data={el.data || ""}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      rotation={el.rotation || 0}
      scaleX={(el.scaleX ?? 1) * (w / 240)}
      scaleY={(el.scaleY ?? 1) * (h / 240)}
      draggable={draggable}
      visible={el.visible !== false}
      listening={!el.locked}
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
