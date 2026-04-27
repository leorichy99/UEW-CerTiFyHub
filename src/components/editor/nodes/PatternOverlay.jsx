/* eslint-disable react/prop-types */
import React from "react";
import { Rect } from "react-konva";
import useImage from "use-image";

export default function PatternOverlay({ src, width, height, opacity, scale }) {
  const [image] = useImage(src || "");
  if (!src || !image) return null;

  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      opacity={opacity}
      fillPatternImage={image}
      fillPatternRepeat="repeat"
      fillPatternScale={{ x: scale, y: scale }}
      listening={false}
    />
  );
}
