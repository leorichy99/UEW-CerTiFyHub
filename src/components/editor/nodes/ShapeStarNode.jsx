/* eslint-disable react/prop-types */
import React from "react";
import { Star } from "react-konva";

export default function ShapeStarNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 220;
  const h = el.height ?? 220;
  const outerRadius = Math.max(10, Math.min(w, h) / 2);
  const innerRadius = Math.max(5, Math.min(outerRadius - 2, el.innerRadius ?? outerRadius * 0.5));

  return (
    <Star
      id={el.id}
      x={el.x + w / 2}
      y={el.y + h / 2}
      numPoints={el.points ?? 5}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
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
