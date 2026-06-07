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
      width={el.userResized ? el.width : undefined}
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
        const node = e.target;
        const patch = { x: node.x(), y: node.y() };
        // Keep stored width in sync with the rendered glyph extent for
        // auto-sized text so the center/right anchor stays accurate in the
        // backend and snap logic. Explicit (userResized) boxes keep their width.
        if (!el.userResized) patch.width = Math.round(node.width());
        onChange(patch);
        onDragEnd?.(e);
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const MIN_FONT_SIZE = 8;
        const MAX_FONT_SIZE = 200;
        const rawFontSize = el.fontSize * Math.max(scaleX, scaleY);
        const clampedFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, rawFontSize));

        onChange({
          x: node.x(),
          y: node.y(),
          width: node.width() * scaleX,
          userResized: true,
          fontSize: clampedFontSize,
          rotation: node.rotation(),
        });
      }}
    />
  );
}
