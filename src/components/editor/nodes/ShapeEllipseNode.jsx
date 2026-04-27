/* eslint-disable react/prop-types */
import React from "react";
import { Ellipse } from "react-konva";

export default function ShapeEllipseNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 100;
  const h = el.height ?? 80;

  return (
    <Ellipse
      id={el.id}
      x={(el.x ?? 0) + w / 2}
      y={(el.y ?? 0) + h / 2}
      radiusX={w / 2}
      radiusY={h / 2}
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
        onChange({ x: e.target.x() - w / 2, y: e.target.y() - h / 2 });
        onDragEnd?.(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const nextW = (w || 0) * scaleX;
        const nextH = (h || 0) * scaleY;

        onChange({
          x: node.x() - nextW / 2,
          y: node.y() - nextH / 2,
          width: nextW,
          height: nextH,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
