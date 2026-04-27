/* eslint-disable react/prop-types */
import React from "react";
import { Text } from "react-konva";

export default function TextNode({
  el,
  draggable,
  isEditing,
  onSelect,
  onChange,
  onDblClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  return (
    <Text
      id={el.id}
      text={el.text}
      x={el.x}
      y={el.y}
      width={el.width}
      draggable={draggable}
      fill={el.fill}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={`${el.bold ? "bold" : ""} ${el.italic ? "italic" : ""}`}
      align={el.align}
      opacity={isEditing ? 0 : (el.opacity ?? 1)}
      visible={el.visible !== false}
      listening={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
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
          fontSize: el.fontSize * Math.max(scaleX, scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}
