/* eslint-disable react/prop-types */
import React from "react";
import { Circle } from "react-konva";

export default function ShapeCircleNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  return (
    <Circle
      id={el.id}
      x={el.x}
      y={el.y}
      radius={el.radius}
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
        onChange({ x: e.target.x(), y: e.target.y() });
        onDragEnd?.(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const nextRadius = el.radius * Math.max(scaleX, scaleY);

        node.scaleX(1);
        node.scaleY(1);

        onChange({
          x: node.x(),
          y: node.y(),
          radius: nextRadius,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
