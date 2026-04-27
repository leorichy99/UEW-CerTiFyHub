/* eslint-disable react/prop-types */
import React from "react";
import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

export default function ImageNode({
  el,
  draggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const [image] = useImage(el.src || "");

  return (
    <KonvaImage
      id={el.id}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      draggable={draggable}
      opacity={el.opacity ?? 1}
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
          width: node.width() * scaleX,
          height: node.height() * scaleY,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
