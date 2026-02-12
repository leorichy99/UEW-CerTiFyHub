/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "./ToastContainer";
import {
  Stage,
  Layer,
  Text,
  Image as KonvaImage,
  Transformer,
  Rect,
  Line,
  Circle,
  Ellipse,
  RegularPolygon,
  Star,
  Arc,
  Wedge,
  Path,
} from "react-konva";
import useImage from "use-image";
import opentype from "opentype.js";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowUpRight,
  ChevronDown,
  Circle as CircleIcon,
  Hand,
  MousePointer2,
  Pencil,
  Redo2,
  Ruler,
  Square,
  Trash2,
  Undo2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// Load logo
function LogoNode({
  el,
  draggable,
  onSelect,
  onChange,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const [image] = useImage("/uew-logo.png");

  return (
    <KonvaImage
      id={el.id}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      draggable={draggable}
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
          width: Math.max(20, node.width() * scaleX),
          height: Math.max(20, node.height() * scaleY),
        });
      }}
    />
  );
}

function ShapeSpiralNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd, buildPoints }) {
  const w = el.width ?? 260;
  const h = el.height ?? 260;
  const turns = Math.max(1, Number(el.turns ?? 4));
  const pointsPerTurn = Math.max(20, Number(el.pointsPerTurn ?? 80));

  const points = buildPoints(w, h, turns, pointsPerTurn);

  return (
    <Line
      id={el.id}
      x={el.x}
      y={el.y}
      points={points}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      rotation={el.rotation || 0}
      draggable={draggable}
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
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(40, w * scaleX),
          height: Math.max(40, h * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapePolygonNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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
          width: Math.max(20, w * scaleX),
          height: Math.max(20, h * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeStarNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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
          width: Math.max(20, w * scaleX),
          height: Math.max(20, h * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeArcNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 240;
  const h = el.height ?? 240;
  const innerRadius = Math.max(5, el.innerRadius ?? 60);
  const outerRadius = Math.max(innerRadius + 5, el.outerRadius ?? 100);

  return (
    <Arc
      id={el.id}
      x={el.x + w / 2}
      y={el.y + h / 2}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      angle={el.angle ?? 220}
      rotation={el.rotation || 0}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      draggable={draggable}
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
        const scale = Math.max(node.scaleX(), node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() - w / 2,
          y: node.y() - h / 2,
          innerRadius: Math.max(5, innerRadius * scale),
          outerRadius: Math.max(10, outerRadius * scale),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeWedgeNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  const w = el.width ?? 240;
  const h = el.height ?? 240;
  const radius = Math.max(10, el.radius ?? 110);

  return (
    <Wedge
      id={el.id}
      x={el.x + w / 2}
      y={el.y + h / 2}
      radius={radius}
      angle={el.angle ?? 90}
      rotation={el.rotation || 0}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      draggable={draggable}
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
        const scale = Math.max(node.scaleX(), node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() - w / 2,
          y: node.y() - h / 2,
          radius: Math.max(10, radius * scale),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapePathNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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
          width: Math.max(20, w * scaleX),
          height: Math.max(20, h * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function PatternOverlay({ src, width, height, opacity, scale }) {
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

function ShapeRectNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
  return (
    <Rect
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      cornerRadius={el.cornerRadius || 0}
      fill={el.fill}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth}
      opacity={el.opacity ?? 1}
      rotation={el.rotation || 0}
      draggable={draggable}
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
          width: Math.max(10, node.width() * scaleX),
          height: Math.max(10, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeEllipseNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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

        const nextW = Math.max(10, (w || 0) * scaleX);
        const nextH = Math.max(10, (h || 0) * scaleY);

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

function ShapeLineNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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
          width: Math.max(20, w * scaleX),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeCircleNode({ el, draggable, onSelect, onChange, onDragStart, onDragMove, onDragEnd }) {
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
        const nextRadius = Math.max(5, el.radius * Math.max(scaleX, scaleY));

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

function ImageNode({
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
          width: Math.max(20, node.width() * scaleX),
          height: Math.max(20, node.height() * scaleY),
        });
      }}
    />
  );
}

function TextNode({
  el,
  draggable,
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
      opacity={el.opacity}
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
          width: Math.max(50, node.width() * scaleX),
          fontSize: Math.max(10, el.fontSize * Math.max(scaleX, scaleY)),
        });
      }}
    />
  );
}

const CANVAS_PRESETS = [
  { id: "a4_portrait", label: "Canvas: A4 Portrait", width: 595, height: 842 },
  { id: "a4_landscape", label: "Canvas: A4 Landscape", width: 842, height: 595 },
];

export default function TemplateEditor({ initialData, onSave, onClose }) {
  const toast = useToast();
  const stageRef = useRef();
  const trRef = useRef();
  const historyRef = useRef({});
  const ignoreHistoryRef = useRef(false);
  const stageWrapRef = useRef(null);
  const canvasShellRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const paperRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0, sl: 0, st: 0 });
  const pinchRef = useRef({ dist: null, zoom: null });
  const fileInputRef = useRef(null);
  const patternInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const toolBeforeSpaceRef = useRef(null);
  const altDupRef = useRef({ active: false, fromId: null, toId: null });

  const [zoom, setZoom] = useState(0.75);
  const [canvasPresetId, setCanvasPresetId] = useState("a4_landscape");
  const [showRulers, setShowRulers] = useState(true);
  const [mode, setMode] = useState("edit");
  const [templateTitle, setTemplateTitle] = useState("Bachelor of Science Honors");
  const [editingTitle, setEditingTitle] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [historyMeta, setHistoryMeta] = useState({ canUndo: false, canRedo: false });
  const [snapLines, setSnapLines] = useState({ vertical: [], horizontal: [] });
  const [textEditor, setTextEditor] = useState(null);
  const [shapeQuery, setShapeQuery] = useState("");
  const [tool, setTool] = useState("select");
  const [isPanning, setIsPanning] = useState(false);
  const [paperOffset, setPaperOffset] = useState({ x: 0, y: 0 });
  const [cursorDoc, setCursorDoc] = useState(null);

  const [openToolGroups, setOpenToolGroups] = useState({
    background: true,
    pattern: false,
    shapes: true,
    fields: false,
    assets: false,
  });

  const [backgroundByPreset, setBackgroundByPreset] = useState({
    a4_portrait: {
      kind: "solid",
      color: "#ffffff",
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { color: "#ffffff", pos: 0 },
          { color: "#ffffff", pos: 1 },
        ],
      },
      pattern: { enabled: false, src: "", opacity: 0.18, scale: 1 },
    },
    a4_landscape: {
      kind: "solid",
      color: "#ffffff",
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { color: "#ffffff", pos: 0 },
          { color: "#ffffff", pos: 1 },
        ],
      },
      pattern: { enabled: false, src: "", opacity: 0.18, scale: 1 },
    },
  });

  const canvasBackground = backgroundByPreset[canvasPresetId] || backgroundByPreset.a4_landscape;
  const [patternImage] = useImage(canvasBackground?.pattern?.src || null);

  const [elementsByPreset, setElementsByPreset] = useState({
    a4_portrait: [
      { id: "logo", type: "logo", x: 240, y: 40, width: 120, height: 120 },

      {
        id: "title1",
        type: "text",
        text: "UNIVERSITY OF EDUCATION, WINNEBA",
        x: 80,
        y: 180,
        width: 430,
        fontSize: 16,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: false,
        italic: false,
        align: "center",
        opacity: 1,
      },
      {
        id: "title2",
        type: "text",
        text: "Certificate of Graduation",
        x: 80,
        y: 220,
        width: 430,
        fontSize: 40,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: false,
        italic: true,
        align: "center",
        opacity: 1,
      },
      {
        id: "student",
        type: "text",
        text: "{student_name}",
        x: 80,
        y: 310,
        width: 430,
        fontSize: 28,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: true,
        italic: false,
        align: "center",
        opacity: 1,
      },
    ],
    a4_landscape: [
      { id: "logo", type: "logo", x: 240, y: 40, width: 120, height: 120 },

      {
        id: "title1",
        type: "text",
        text: "UNIVERSITY OF EDUCATION, WINNEBA",
        x: 80,
        y: 180,
        width: 430,
        fontSize: 16,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: false,
        italic: false,
        align: "center",
        opacity: 1,
      },
      {
        id: "title2",
        type: "text",
        text: "Certificate of Graduation",
        x: 80,
        y: 220,
        width: 430,
        fontSize: 40,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: false,
        italic: true,
        align: "center",
        opacity: 1,
      },
      {
        id: "student",
        type: "text",
        text: "{student_name}",
        x: 80,
        y: 310,
        width: 430,
        fontSize: 28,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: true,
        italic: false,
        align: "center",
        opacity: 1,
      },
    ],
  });

  const elements = elementsByPreset[canvasPresetId] || [];

  useEffect(() => {
    if (!initialData) return;

    const incomingPresetId = initialData?.metadata?.canvas?.presetId;
    if (incomingPresetId && incomingPresetId !== canvasPresetId) {
      setCanvasPresetId(incomingPresetId);
    }

    const incomingByPreset = initialData?.metadata?.elements_by_preset;
    const incomingElements = initialData?.metadata?.elements;
    const targetPresetId = incomingPresetId || canvasPresetId;

    if (incomingByPreset || incomingElements) {
      ignoreHistoryRef.current = true;

      if (incomingByPreset && typeof incomingByPreset === "object") {
        setElementsByPreset((prev) => ({
          ...prev,
          ...incomingByPreset,
        }));
      } else if (incomingElements) {
        setElementsByPreset((prev) => ({
          ...prev,
          [targetPresetId]: incomingElements,
        }));
      }

      historyRef.current = {
        ...historyRef.current,
        [targetPresetId]: { past: [], future: [] },
      };
      setHistoryMeta({ canUndo: false, canRedo: false });
      ignoreHistoryRef.current = false;
    }

    if (initialData?.name) {
      setTemplateTitle(initialData.name);
    }

    const incomingBgByPreset = initialData?.metadata?.background_by_preset;
    const incomingBg = initialData?.metadata?.canvas?.background;
    if (incomingBgByPreset && typeof incomingBgByPreset === "object") {
      setBackgroundByPreset((prev) => ({ ...prev, ...incomingBgByPreset }));
    } else if (incomingBg && typeof incomingBg === "object") {
      const target = incomingPresetId || canvasPresetId;
      setBackgroundByPreset((prev) => ({ ...prev, [target]: { ...prev[target], ...incomingBg } }));
    }
  }, [initialData]);

  const activePreset = CANVAS_PRESETS.find((p) => p.id === canvasPresetId) || CANVAS_PRESETS[0];
  const canvasWidth = activePreset.width;
  const canvasHeight = activePreset.height;

  const selectedElement = elements.find((e) => e.id === selectedId);
  const isPreview = mode === "preview";
  const isEditingText = !!textEditor;
  const canUndo = historyMeta.canUndo;
  const canRedo = historyMeta.canRedo;

  const outlineFontUrl =
    initialData?.metadata?.outline_font_url || "/fonts/Inter-Regular.ttf";

  const replaceElement = (id, nextEl) => {
    applyElementsUpdate((prev) => prev.map((el) => (el.id === id ? nextEl : el)));
  };

  const generateSpiralPoints = (w, h, turns, pointsPerTurn) => {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.max(10, Math.min(w, h) / 2);
    const totalPoints = Math.max(50, Math.floor(turns * pointsPerTurn));
    const pts = [];

    for (let i = 0; i < totalPoints; i++) {
      const t = i / (totalPoints - 1);
      const angle = t * turns * Math.PI * 2;
      const r = t * maxR;
      pts.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }

    return pts;
  };

  const outlineSelectedText = async () => {
    if (!selectedElement || selectedElement.type !== "text") return;

    try {
      const font = await opentype.load(outlineFontUrl);
      const size = selectedElement.fontSize || 24;
      const text = String(selectedElement.text || "");
      const x = selectedElement.x ?? 0;
      const y = (selectedElement.y ?? 0) + size;

      const path = font.getPath(text, x, y, size);
      const bbox = path.getBoundingBox();
      const data = path.toPathData(2);
      const width = Math.max(20, Math.round(bbox.x2 - bbox.x1));
      const height = Math.max(20, Math.round(bbox.y2 - bbox.y1));

      replaceElement(selectedElement.id, {
        id: selectedElement.id,
        type: "shape_path",
        x: Math.round(bbox.x1),
        y: Math.round(bbox.y1),
        width,
        height,
        data,
        fill: selectedElement.fill || "#1E293B",
        stroke: "transparent",
        strokeWidth: 0,
        opacity: selectedElement.opacity ?? 1,
        rotation: selectedElement.rotation || 0,
      });

      toast.success("Text outlined");
    } catch (e) {
      console.error("Outline text failed:", e);
      toast.error("Failed to outline text (font missing/unreachable)");
    }
  };

  function measurePaperOffset() {
    const shell = canvasShellRef.current;
    const paper = paperRef.current;
    if (!shell || !paper) return;
    const shellRect = shell.getBoundingClientRect();
    const paperRect = paper.getBoundingClientRect();
    setPaperOffset({ x: paperRect.left - shellRect.left, y: paperRect.top - shellRect.top });
  }

  useEffect(() => {
    measurePaperOffset();
  }, [zoom, canvasWidth, canvasHeight, showRulers]);

  useEffect(() => {
    function onResize() {
      measurePaperOffset();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function cloneElements(els) {
    return els.map((el) => ({ ...el }));
  }

  function applyElementsUpdate(updater) {
    setElementsByPreset((prev) => {
      const currentElements = prev[canvasPresetId] || [];
      const next = typeof updater === "function" ? updater(currentElements) : updater;
      if (ignoreHistoryRef.current) return { ...prev, [canvasPresetId]: next };
      
      // Update history for current preset only
      const presetHistory = historyRef.current[canvasPresetId] || { past: [], future: [] };
      presetHistory.past.push(cloneElements(currentElements));
      if (presetHistory.past.length > 100) presetHistory.past.shift();
      presetHistory.future = [];
      historyRef.current = { ...historyRef.current, [canvasPresetId]: presetHistory };
      
      return { ...prev, [canvasPresetId]: next };
    });
    setHistoryMeta({ canUndo: true, canRedo: false });
  }

  function undo() {
    const presetHistory = historyRef.current[canvasPresetId] || { past: [], future: [] };
    if (!presetHistory.past.length) return;
    ignoreHistoryRef.current = true;
    setElementsByPreset((prev) => {
      const currentElements = prev[canvasPresetId] || [];
      presetHistory.future.push(cloneElements(currentElements));
      const previousElements = presetHistory.past.pop();
      historyRef.current = { ...historyRef.current, [canvasPresetId]: presetHistory };
      return { ...prev, [canvasPresetId]: previousElements || currentElements };
    });
    setSelectedId(null);
    setHistoryMeta({
      canUndo: presetHistory.past.length > 0,
      canRedo: presetHistory.future.length > 0,
    });
    setTimeout(() => {
      ignoreHistoryRef.current = false;
    }, 0);
  }

  function redo() {
    const presetHistory = historyRef.current[canvasPresetId] || { past: [], future: [] };
    if (!presetHistory.future.length) return;
    ignoreHistoryRef.current = true;
    setElementsByPreset((prev) => {
      const currentElements = prev[canvasPresetId] || [];
      presetHistory.past.push(cloneElements(currentElements));
      const nextElements = presetHistory.future.pop();
      historyRef.current = { ...historyRef.current, [canvasPresetId]: presetHistory };
      return { ...prev, [canvasPresetId]: nextElements || currentElements };
    });
    setSelectedId(null);
    setHistoryMeta({
      canUndo: presetHistory.past.length > 0,
      canRedo: presetHistory.future.length > 0,
    });
    setTimeout(() => {
      ignoreHistoryRef.current = false;
    }, 0);
  }

  // Transformer attach
  useEffect(() => {
    if (!selectedId) {
      if (trRef.current) {
        trRef.current.nodes([]);
        trRef.current.getLayer()?.batchDraw();
      }
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne("#" + selectedId);
    if (!node) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();
  }, [selectedId]);

  function updateElement(id, patch) {
    applyElementsUpdate((els) =>
      els.map((el) => (el.id === id ? { ...el, ...patch } : el))
    );
  }

  function addPlaceholder(name) {
    applyElementsUpdate((prev) => [
      ...prev,
      {
        id: "el-" + Date.now(),
        type: "text",
        text: `{${name}}`,
        x: 100,
        y: 100,
        width: 300,
        fontSize: 24,
        fill: "#1E293B",
        fontFamily: "Cormorant Garamond",
        bold: true,
        italic: false,
        align: "center",
        opacity: 1,
      },
    ]);
  }

  function addShape(kind, atPoint) {
    const id = "sh-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    const baseStroke = "#1E293B";

    if (kind === "rect") {
      const width = 220;
      const height = 120;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_rect",
          x,
          y,
          width,
          height,
          cornerRadius: 0,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "rounded") {
      const width = 240;
      const height = 130;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_roundrect",
          x,
          y,
          width,
          height,
          cornerRadius: 18,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "frame") {
      const width = 360;
      const height = 210;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_frame",
          x,
          y,
          width,
          height,
          cornerRadius: 10,
          fill: "transparent",
          stroke: baseStroke,
          strokeWidth: 4,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "ellipse") {
      const width = 200;
      const height = 120;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_ellipse",
          x,
          y,
          width,
          height,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "divider") {
      const width = 320;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round(canvasHeight / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_line",
          x,
          y,
          width,
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "polygon") {
      const width = 220;
      const height = 220;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_polygon",
          x,
          y,
          width,
          height,
          sides: 6,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "star") {
      const width = 240;
      const height = 240;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_star",
          x,
          y,
          width,
          height,
          points: 5,
          innerRadius: 60,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "arc") {
      const width = 260;
      const height = 260;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_arc",
          x,
          y,
          width,
          height,
          innerRadius: 60,
          outerRadius: 110,
          angle: 220,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "pie") {
      const width = 260;
      const height = 260;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_wedge",
          x,
          y,
          width,
          height,
          radius: 110,
          angle: 90,
          fill: "#FFFFFF",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "spiral") {
      const width = 260;
      const height = 260;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_spiral",
          x,
          y,
          width,
          height,
          turns: 4,
          pointsPerTurn: 80,
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (kind === "path") {
      const width = 260;
      const height = 200;
      const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
      const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);
      const data = "M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80";

      applyElementsUpdate((prev) => [
        ...prev,
        {
          id,
          type: "shape_path",
          x,
          y,
          width,
          height,
          data,
          fill: "transparent",
          stroke: baseStroke,
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      return;
    }
  }

  function bringToFront() {
    applyElementsUpdate((prev) => {
      const idx = prev.findIndex((e) => e.id === selectedId);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
  }

  function handleFiles(files, atPoint) {
    const list = Array.from(files || []);
    const images = list.filter((f) => f.type && f.type.startsWith("image/"));
    if (!images.length) return;

    images.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        const img = new window.Image();
        img.onload = () => {
          const maxW = 260;
          const maxH = 260;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const width = Math.max(20, Math.round(img.width * scale));
          const height = Math.max(20, Math.round(img.height * scale));
          const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
          const y = atPoint?.y ?? Math.round((canvasHeight - height) / 2);

          applyElementsUpdate((prev) => [
            ...prev,
            {
              id: "img-" + Date.now() + "-" + Math.random().toString(16).slice(2),
              type: "image",
              src,
              x,
              y,
              width,
              height,
              opacity: 1,
            },
          ]);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  function computeDropPoint(evt) {
    const wrap = stageWrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / zoom;
    const y = (evt.clientY - rect.top) / zoom;
    return {
      x: Math.max(0, Math.min(canvasWidth - 1, Math.round(x))),
      y: Math.max(0, Math.min(canvasHeight - 1, Math.round(y))),
    };
  }

  function clearSnapLines() {
    setSnapLines({ vertical: [], horizontal: [] });
  }

  function isValidCssColor(value) {
    if (!value) return false;
    const s = new Option().style;
    s.color = "";
    s.color = String(value).trim();
    return !!s.color;
  }

  function setBackgroundPatch(patch) {
    setBackgroundByPreset((prev) => {
      const current = prev[canvasPresetId] || prev.a4_landscape;
      return { ...prev, [canvasPresetId]: { ...current, ...patch } };
    });
  }

  function setGradientPatch(patch) {
    setBackgroundByPreset((prev) => {
      const current = prev[canvasPresetId] || prev.a4_landscape;
      const nextGradient = { ...(current.gradient || {}), ...patch };
      return { ...prev, [canvasPresetId]: { ...current, gradient: nextGradient } };
    });
  }

  function setPatternPatch(patch) {
    setBackgroundByPreset((prev) => {
      const current = prev[canvasPresetId] || prev.a4_landscape;
      const nextPattern = { ...(current.pattern || {}), ...patch };
      return { ...prev, [canvasPresetId]: { ...current, pattern: nextPattern } };
    });
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const el = elements.find((x) => x.id === selectedId);
    if (!el || el.id === "logo") return;
    const newId = `${el.id}-copy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const copy = {
      ...el,
      id: newId,
      x: Math.min(canvasWidth - 1, Math.round((el.x ?? 0) + 12)),
      y: Math.min(canvasHeight - 1, Math.round((el.y ?? 0) + 12)),
    };
    applyElementsUpdate((prev) => [...prev, copy]);
    setSelectedId(newId);
  }

  function beginAltDuplicate(el) {
    if (!el || el.id === "logo") return null;
    const newId = `${el.id}-altcopy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const copy = {
      ...el,
      id: newId,
      x: Math.min(canvasWidth - 1, Math.round((el.x ?? 0) + 12)),
      y: Math.min(canvasHeight - 1, Math.round((el.y ?? 0) + 12)),
    };
    altDupRef.current = { active: true, fromId: el.id, toId: newId };
    applyElementsUpdate((prev) => [...prev, copy]);
    setSelectedId(newId);
    return newId;
  }

  function handleElementDragStart(el, e) {
    clearSnapLines();
    if (isPreview || isEditingText || tool !== "select") return;
    const evt = e?.evt;
    if (!evt?.altKey) return;
    if (altDupRef.current.active) return;

    const newId = beginAltDuplicate(el);
    if (!newId) return;

    try {
      e?.target?.stopDrag();
    } catch {
      // ignore
    }

    setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const node = stage.findOne(`#${newId}`);
      if (!node) return;
      try {
        node.startDrag();
      } catch {
        // ignore
      }
    }, 0);
  }

  function snapDragMove(el, e) {
    const node = e.target;
    const w = el.width ?? (el.radius ? el.radius * 2 : node.width());
    const h = el.height ?? (el.radius ? el.radius * 2 : node.height());
    const isCenterAnchored =
      el.type === "shape_ellipse" ||
      el.type === "shape_circle" ||
      el.type === "shape_polygon" ||
      el.type === "shape_star" ||
      el.type === "shape_arc" ||
      el.type === "shape_wedge";
    let x = isCenterAnchored ? node.x() - w / 2 : node.x();
    let y = isCenterAnchored ? node.y() - h / 2 : node.y();

    const snap = 5;
    const snapV = [];
    const snapH = [];

    // Vertical snap targets (for X position)
    const candidatesX = [
      { pos: 0, line: 0 },
      { pos: Math.round((canvasWidth - w) / 2), line: Math.round(canvasWidth / 2) },
      { pos: Math.round(canvasWidth - w), line: canvasWidth },
    ];
    let bestX = null;
    for (const c of candidatesX) {
      const d = Math.abs(x - c.pos);
      if (d <= snap && (bestX === null || d < bestX.d)) {
        bestX = { pos: c.pos, line: c.line, d };
      }
    }
    if (bestX) {
      x = bestX.pos;
      snapV.push(bestX.line);
    }

    // Horizontal snap targets (for Y position)
    const candidatesY = [
      { pos: 0, line: 0 },
      { pos: Math.round((canvasHeight - h) / 2), line: Math.round(canvasHeight / 2) },
      { pos: Math.round(canvasHeight - h), line: canvasHeight },
    ];
    let bestY = null;
    for (const c of candidatesY) {
      const d = Math.abs(y - c.pos);
      if (d <= snap && (bestY === null || d < bestY.d)) {
        bestY = { pos: c.pos, line: c.line, d };
      }
    }
    if (bestY) {
      y = bestY.pos;
      snapH.push(bestY.line);
    }

    node.position({ x: isCenterAnchored ? x + w / 2 : x, y: isCenterAnchored ? y + h / 2 : y });
    setSnapLines({ vertical: snapV, horizontal: snapH });
    node.getLayer()?.batchDraw();
  }

  function alignSelected(where) {
    if (!selectedElement) return;
    const w = selectedElement.width ?? 0;
    if (!w) return;
    if (where === "left") updateElement(selectedId, { x: 0 });
    if (where === "center") updateElement(selectedId, { x: Math.round((canvasWidth - w) / 2) });
    if (where === "right") updateElement(selectedId, { x: Math.round(canvasWidth - w) });
  }

  function deleteSelected() {
    if (!selectedId) return;
    applyElementsUpdate((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (isPreview) return;
      if (isEditingText || editingTitle) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedId(null);
        return;
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "v") {
        setTool("select");
        return;
      }

      if (!isCmdOrCtrl && e.key === " ") {
        if (toolBeforeSpaceRef.current == null) {
          toolBeforeSpaceRef.current = tool;
        }
        setTool("pan");
        e.preventDefault();
        return;
      }

      if (isCmdOrCtrl && String(e.key || "").toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }

      if (isCmdOrCtrl && String(e.key || "").toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (isCmdOrCtrl && String(e.key || "").toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (isCmdOrCtrl && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setZoom((z) => Math.min(2, Math.round(z * 1.1 * 100) / 100));
        return;
      }

      if (isCmdOrCtrl && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        setZoom((z) => Math.max(0.2, Math.round((z / 1.1) * 100) / 100));
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (!isCmdOrCtrl) return;
      if (!selectedId) return;
      const el = elements.find((x) => x.id === selectedId);
      if (!el || el.type !== "text") return;

      const key = String(e.key || "").toLowerCase();
      if (key === "l") {
        e.preventDefault();
        updateElement(selectedId, { align: "left" });
      }
      if (key === "e") {
        e.preventDefault();
        updateElement(selectedId, { align: "center" });
      }
      if (key === "r") {
        e.preventDefault();
        updateElement(selectedId, { align: "right" });
      }
      if (key === "j") {
        e.preventDefault();
        updateElement(selectedId, { align: "justify" });
      }
    }

    function onKeyUp(e) {
      if (isPreview) return;
      if (e.key !== " ") return;
      if (toolBeforeSpaceRef.current != null) {
        setTool(toolBeforeSpaceRef.current);
        toolBeforeSpaceRef.current = null;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    isPreview,
    isEditingText,
    editingTitle,
    selectedId,
    elements,
    updateElement,
    tool,
  ]);

  useEffect(() => {
    const el = canvasViewportRef.current;
    if (!el) return;

    function onWheel(e) {
      if (isPreview) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      setZoom((z) => {
        const next = direction > 0 ? z * 1.08 : z / 1.08;
        return Math.min(2, Math.max(0.2, Math.round(next * 100) / 100));
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isPreview]);

  function startTextEditing(el) {
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne("#" + el.id);
    if (!node) return;

    setSelectedId(el.id);
    setTextEditor({
      id: el.id,
      value: el.text,
      left: el.x * zoom,
      top: el.y * zoom,
      width: el.width * zoom,
      height: Math.max(node.height() * zoom, el.fontSize * zoom),
      fontSize: el.fontSize * zoom,
      fontFamily: el.fontFamily,
      bold: !!el.bold,
      italic: !!el.italic,
      fill: el.fill,
      align: el.align,
      opacity: el.opacity,
    });
  }

  useEffect(() => {
    if (!textEditor) return;
    const t = setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [textEditor]);

  function commitTextEditing() {
    if (!textEditor) return;
    updateElement(textEditor.id, { text: textEditor.value });
    setTextEditor(null);
  }

  function cancelTextEditing() {
    setTextEditor(null);
  }

  function sendToBack() {
    applyElementsUpdate((prev) => {
      const idx = prev.findIndex((e) => e.id === selectedId);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  }

  function publishTemplate() {
    const payload = {
      title: templateTitle,
      canvas: {
        presetId: canvasPresetId,
        width: canvasWidth,
        height: canvasHeight,
        background: canvasBackground,
      },
      elements,
      elements_by_preset: elementsByPreset,
      background_by_preset: backgroundByPreset,
    };

    if (onSave) {
      onSave(payload);
      return;
    }

    console.log("TEMPLATE:", payload);
    toast.success("Template exported to console");
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-900">UEW CertifyHub</div>
          <div className="hidden h-6 w-px bg-slate-200 md:block" />
          <div className="relative">
            <select
              value={canvasPresetId}
              onChange={(e) => {
                const newPresetId = e.target.value;
                // Save current preset elements and ensure target preset has its own elements
                setElementsByPreset((prev) => {
                  const next = {
                    ...prev,
                    [canvasPresetId]: elements,
                  };

                  if (!next[newPresetId]) {
                    next[newPresetId] = cloneElements(elements);
                  }

                  return next;
                });

                setSelectedId(null);
                setCanvasPresetId(newPresetId);

                const nextHistory = historyRef.current?.[newPresetId] || { past: [], future: [] };
                setHistoryMeta({
                  canUndo: nextHistory.past.length > 0,
                  canRedo: nextHistory.future.length > 0,
                });
              }}
              className="h-9 rounded-md bg-slate-50 px-3 pr-8 text-sm text-slate-700"
              disabled={isPreview}
            >
              {CANVAS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {/* <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /> */}
          </div>

          {/* Edit Title */}
          <div className="hidden h-6 w-px bg-slate-200 md:block" />
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                className="h-9 w-55 rounded-md border border-slate-200 bg-white px-3 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-800 hover:bg-slate-100"
              >
                <span className="max-w-55 truncate">{templateTitle}</span>
                <Pencil className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Set editor mode  */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`h-8 rounded px-3 text-sm ${mode === "edit" ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("preview");
                setSelectedId(null);
              }}
              className={`h-8 rounded px-3 text-sm ${mode === "preview" ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              Preview
            </button>
          </div>

          <button
            type="button"
            onClick={publishTemplate}
            disabled={isPreview}
            className="flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <UploadCloud className="h-4 w-4" />
            Publish Template
          </button>

          {typeof onClose === "function" && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        <div
          className="w-72 shrink-0 overflow-y-auto border-r bg-white p-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="mb-6">
            <button
              type="button"
              onClick={() =>
                setOpenToolGroups((g) => ({
                  ...g,
                  background: !g.background,
                }))
              }
              className="flex w-full items-center justify-between"
              title="Toggle background tools"
            >
              <div className="text-[11px] font-semibold tracking-widest text-slate-500">BACKGROUND</div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openToolGroups.background ? "rotate-180" : ""}`} />
            </button>

            {openToolGroups.background && (
              <>
                <div className="mt-2 text-[11px] font-semibold text-slate-700">SOLID COLOR & GRADIENT</div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBackgroundPatch({ kind: "solid" })}
                    disabled={isPreview}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold ${canvasBackground?.kind === "solid" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Solid color"
                  >
                    Solid
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundPatch({ kind: "gradient" })}
                    disabled={isPreview}
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold ${canvasBackground?.kind === "gradient" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Gradient"
                  >
                    Gradient
                  </button>
                </div>

                {canvasBackground?.kind === "solid" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <input
                      type="color"
                      value={isValidCssColor(canvasBackground?.color) ? canvasBackground.color : "#ffffff"}
                      onChange={(e) => setBackgroundPatch({ color: e.target.value })}
                      disabled={isPreview}
                      className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                      title="Pick a color"
                    />
                    <input
                      value={canvasBackground?.color || ""}
                      onChange={(e) => setBackgroundPatch({ color: e.target.value })}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (!isValidCssColor(v)) {
                          toast.error("Invalid color. Use hex/rgb/hsl formats.");
                          setBackgroundPatch({ color: "#ffffff" });
                        }
                      }}
                      disabled={isPreview}
                      placeholder="#ffffff / rgb(...) / hsl(...)"
                      className="col-span-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    />
                  </div>
                )}

                {canvasBackground?.kind === "gradient" && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={canvasBackground?.gradient?.type || "linear"}
                        onChange={(e) => setGradientPatch({ type: e.target.value })}
                        disabled={isPreview}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      >
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                      </select>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                        <div className="text-[11px] text-slate-500">Angle</div>
                        <input
                          type="number"
                          value={Number(canvasBackground?.gradient?.angle ?? 90)}
                          onChange={(e) => setGradientPatch({ angle: Number(e.target.value) })}
                          disabled={isPreview || canvasBackground?.gradient?.type !== "linear"}
                          className="h-7 w-16 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold tracking-widest text-slate-500">COLOR 1</div>
                        <input
                          type="color"
                          value={
                            isValidCssColor(canvasBackground?.gradient?.stops?.[0]?.color)
                              ? canvasBackground.gradient.stops[0].color
                              : "#ffffff"
                          }
                          onChange={(e) => {
                            const next = [...(canvasBackground?.gradient?.stops || [])];
                            if (!next[0]) next[0] = { color: "#ffffff", pos: 0 };
                            next[0] = { ...next[0], color: e.target.value, pos: 0 };
                            setGradientPatch({ stops: next });
                          }}
                          disabled={isPreview}
                          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                        />
                        <input
                          value={canvasBackground?.gradient?.stops?.[0]?.color || ""}
                          onChange={(e) => {
                            const next = [...(canvasBackground?.gradient?.stops || [])];
                            if (!next[0]) next[0] = { color: "#ffffff", pos: 0 };
                            next[0] = { ...next[0], color: e.target.value, pos: 0 };
                            setGradientPatch({ stops: next });
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            if (!isValidCssColor(v)) {
                              toast.error("Invalid color. Use hex/rgb/hsl formats.");
                            }
                          }}
                          disabled={isPreview}
                          placeholder="#ffffff / rgb(...) / hsl(...)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-semibold tracking-widest text-slate-500">COLOR 2</div>
                        <input
                          type="color"
                          value={
                            isValidCssColor(canvasBackground?.gradient?.stops?.[1]?.color)
                              ? canvasBackground.gradient.stops[1].color
                              : "#000000"
                          }
                          onChange={(e) => {
                            const next = [...(canvasBackground?.gradient?.stops || [])];
                            if (!next[1]) next[1] = { color: "#000000", pos: 1 };
                            next[1] = { ...next[1], color: e.target.value, pos: 1 };
                            if (!next[0]) next[0] = { color: "#ffffff", pos: 0 };
                            setGradientPatch({ stops: next });
                          }}
                          disabled={isPreview}
                          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                        />
                        <input
                          value={canvasBackground?.gradient?.stops?.[1]?.color || ""}
                          onChange={(e) => {
                            const next = [...(canvasBackground?.gradient?.stops || [])];
                            if (!next[1]) next[1] = { color: "#000000", pos: 1 };
                            next[1] = { ...next[1], color: e.target.value, pos: 1 };
                            if (!next[0]) next[0] = { color: "#ffffff", pos: 0 };
                            setGradientPatch({ stops: next });
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            if (!isValidCssColor(v)) {
                              toast.error("Invalid color. Use hex/rgb/hsl formats.");
                            }
                          }}
                          disabled={isPreview}
                          placeholder="#000000 / rgb(...) / hsl(...)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={() =>
                setOpenToolGroups((g) => ({
                  ...g,
                  pattern: !g.pattern,
                }))
              }
              className="flex w-full items-center justify-between"
              title="Toggle pattern tools"
            >
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">PATTERN OVERLAYS</div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openToolGroups.pattern ? "rotate-180" : ""}`} />
            </button>

            {openToolGroups.pattern && (
              <>
                <input
                  ref={patternInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const src = String(reader.result || "");
                      setPatternPatch({ enabled: true, src });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                  disabled={isPreview}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => patternInputRef.current?.click()}
                    disabled={isPreview}
                    className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatternPatch({ enabled: false, src: "" })}
                    disabled={isPreview}
                    className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    None
                  </button>
                </div>

                {canvasBackground?.pattern?.enabled && (
                  <div className="mt-3 space-y-3">
                <div className="text-[11px] font-semibold tracking-widest text-slate-500">OPACITY</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={Number(canvasBackground?.pattern?.opacity ?? 0.18)}
                  onChange={(e) => setPatternPatch({ opacity: Number(e.target.value) })}
                  disabled={isPreview}
                  className="w-full"
                />
                <div className="text-[11px] font-semibold tracking-widest text-slate-500">SCALE</div>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={Number(canvasBackground?.pattern?.scale ?? 1)}
                  onChange={(e) => setPatternPatch({ scale: Number(e.target.value) })}
                  disabled={isPreview}
                  className="w-full"
                />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={() =>
                setOpenToolGroups((g) => ({
                  ...g,
                  shapes: !g.shapes,
                }))
              }
              className="flex w-full items-center justify-between"
              title="Toggle shapes"
            >
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">SHAPES</div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openToolGroups.shapes ? "rotate-180" : ""}`} />
            </button>

            {openToolGroups.shapes && (
              <>
                <input
                  value={shapeQuery}
                  onChange={(e) => setShapeQuery(e.target.value)}
                  placeholder="Search shapes"
                  className="mb-3 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  disabled={isPreview}
                />

                <div className="grid grid-cols-2 gap-2">
              {[
                { kind: "rect", label: "Rectangle", icon: <Square className="h-4 w-4" />, terms: ["rect", "rectangle", "box"] },
                { kind: "rounded", label: "Rounded", icon: <Square className="h-4 w-4" />, terms: ["rounded", "round", "rect", "rectangle"] },
                { kind: "frame", label: "Frame", icon: <Square className="h-4 w-4" />, terms: ["frame", "border", "outline", "box"] },
                { kind: "ellipse", label: "Ellipse", icon: <CircleIcon className="h-4 w-4" />, terms: ["circle", "ellipse", "oval"] },
                { kind: "polygon", label: "Polygon", icon: <Square className="h-4 w-4" />, terms: ["polygon", "hex", "pentagon", "triangle"] },
                { kind: "star", label: "Star", icon: <Square className="h-4 w-4" />, terms: ["star"] },
                { kind: "arc", label: "Arc", icon: <Square className="h-4 w-4" />, terms: ["arc"] },
                { kind: "pie", label: "Pie", icon: <Square className="h-4 w-4" />, terms: ["pie", "wedge", "slice"] },
                { kind: "spiral", label: "Spiral", icon: <Square className="h-4 w-4" />, terms: ["spiral", "swirl"] },
                { kind: "path", label: "Path", icon: <Square className="h-4 w-4" />, terms: ["path", "bezier", "curve"] },
                { kind: "divider", label: "Divider", icon: <div className="h-0.5 w-5 rounded bg-slate-600" />, terms: ["line", "divider", "separator"] },
              ]
                .filter((s) => {
                  const q = String(shapeQuery || "").trim().toLowerCase();
                  if (!q) return true;
                  return (
                    s.label.toLowerCase().includes(q) ||
                    s.terms.some((t) => t.includes(q))
                  );
                })
                .map((s) => (
                  <div
                    key={s.kind}
                    draggable={!isPreview}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "copy";
                      e.dataTransfer.setData(
                        "application/x-template-shape",
                        JSON.stringify({ kind: s.kind })
                      );
                    }}
                    onClick={() => !isPreview && addShape(s.kind)}
                    className="flex h-12 cursor-grab items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                    title="Drag onto canvas or click to add"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                        {s.icon}
                      </div>
                      <div className="text-xs font-medium">{s.label}</div>
                    </div>
                    <UploadCloud className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
                </div>
              </>
            )}
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={() =>
                setOpenToolGroups((g) => ({
                  ...g,
                  fields: !g.fields,
                }))
              }
              className="flex w-full items-center justify-between"
              title="Toggle fields"
            >
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">DYNAMIC FIELDS</div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openToolGroups.fields ? "rotate-180" : ""}`} />
            </button>
            {openToolGroups.fields && (
              <>
                <button
                  type="button"
                  onClick={() => addPlaceholder("student_name")}
                  disabled={isPreview}
                  className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <span>{"{student_name}"}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => addPlaceholder("major_title")}
                  disabled={isPreview}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <span>{"{major_title}"}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </button>
              </>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() =>
                setOpenToolGroups((g) => ({
                  ...g,
                  assets: !g.assets,
                }))
              }
              className="flex w-full items-center justify-between"
              title="Toggle assets"
            >
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">STATIC ASSETS</div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openToolGroups.assets ? "rotate-180" : ""}`} />
            </button>

            {openToolGroups.assets && (
              <>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md border border-slate-200 bg-slate-50" />
                    <div className="text-sm text-slate-800">University Logo</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId("logo")}
                    className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Select
                  </button>
                </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return;
                handleFiles(e.target.files);
                e.target.value = "";
              }}
              disabled={isPreview}
            />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPreview}
                  className="mt-3 flex h-9 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Upload Image
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden">
          <div ref={canvasShellRef} className="relative flex flex-1 w-full overflow-hidden bg-slate-100">
            {showRulers && (
              <>
                {/* Corner square */}
                <div className="absolute left-0 top-0 z-20 h-8 w-8 border-b border-r border-slate-300 bg-slate-100" />

                {/* Horizontal ruler - snapped to editor chrome (below header) */}
                <div className="absolute left-8 right-0 top-0 z-10 h-8 border-b border-slate-300 bg-slate-100 overflow-hidden">
                  <svg className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    {Array.from({ length: Math.ceil(canvasWidth / 50) + 1 }, (_, i) => i * 50).map((pos) => {
                      const screenX = paperOffset.x - 32 + pos * zoom;
                      const isMajor = pos % 100 === 0;
                      return (
                        <g key={pos}>
                          <line x1={screenX} y1={32} x2={screenX} y2={isMajor ? 14 : 22} stroke="#64748b" strokeWidth={1} />
                          {isMajor && (
                            <text x={screenX + 3} y={12} fontSize={10} fill="#64748b">
                              {pos}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Vertical ruler - snapped to tools pane edge */}
                <div className="absolute bottom-0 left-0 top-8 z-10 w-8 border-r border-slate-300 bg-slate-100 overflow-hidden">
                  <svg className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
                    {Array.from({ length: Math.ceil(canvasHeight / 50) + 1 }, (_, i) => i * 50).map((pos) => {
                      const screenY = paperOffset.y - 32 + pos * zoom;
                      const isMajor = pos % 100 === 0;
                      return (
                        <g key={pos}>
                          <line x1={32} y1={screenY} x2={isMajor ? 14 : 22} y2={screenY} stroke="#64748b" strokeWidth={1} />
                          {isMajor && (
                            <text
                              x={4}
                              y={screenY + 4}
                              fontSize={10}
                              fill="#64748b"
                              transform={`rotate(-90, 4, ${screenY + 4})`}
                            >
                              {pos}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </>
            )}

            <div
              ref={canvasViewportRef}
              className={`absolute inset-0 relative flex flex-1 w-full items-center justify-center overflow-auto ${showRulers ? "pt-8 pl-8" : ""} ${tool === "pan" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
              style={{ touchAction: tool === "pan" ? "none" : "auto" }}
              onScroll={() => measurePaperOffset()}
              onMouseMove={(e) => {
                if (!isPreview) {
                  const shell = canvasShellRef.current;
                  const paper = paperRef.current;
                  if (shell && paper) {
                    const shellRect = shell.getBoundingClientRect();
                    const paperRect = paper.getBoundingClientRect();
                    const xDoc = (e.clientX - paperRect.left) / zoom;
                    const yDoc = (e.clientY - paperRect.top) / zoom;
                    if (xDoc >= 0 && yDoc >= 0 && xDoc <= canvasWidth && yDoc <= canvasHeight) {
                      setCursorDoc({ x: Math.round(xDoc), y: Math.round(yDoc) });
                    } else {
                      setCursorDoc(null);
                    }
                    setPaperOffset({ x: paperRect.left - shellRect.left, y: paperRect.top - shellRect.top });
                  }
                }

              }}
              onMouseLeave={() => {
                setCursorDoc(null);
              }}
              onTouchStart={(e) => {
                if (isPreview) return;
                if (e.touches.length !== 2) return;
                const [a, b] = e.touches;
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
              }}
              onTouchMove={(e) => {
                if (isPreview) return;
                if (e.touches.length !== 2) return;
                if (!pinchRef.current.dist) return;
                e.preventDefault();
                const [a, b] = e.touches;
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                const dist = Math.hypot(dx, dy);
                const factor = dist / pinchRef.current.dist;
                const base = pinchRef.current.zoom || zoom;
                const next = Math.min(2, Math.max(0.2, Math.round(base * factor * 100) / 100));
                setZoom(next);
              }}
              onTouchEnd={() => {
                pinchRef.current = { dist: null, zoom: null };
              }}
            >
              {tool === "pan" && !isPreview && (
                <div
                  className="absolute inset-0 z-10"
                  onMouseDown={(e) => {
                    const el = canvasViewportRef.current;
                    if (!el) return;
                    panRef.current = { active: true, x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
                    setIsPanning(true);
                    e.preventDefault();
                  }}
                  onMouseMove={(e) => {
                    const el = canvasViewportRef.current;
                    if (!el) return;
                    if (!panRef.current.active) return;
                    const dx = e.clientX - panRef.current.x;
                    const dy = e.clientY - panRef.current.y;
                    el.scrollLeft = panRef.current.sl - dx;
                    el.scrollTop = panRef.current.st - dy;
                  }}
                  onMouseUp={() => {
                    panRef.current.active = false;
                    setIsPanning(false);
                  }}
                  onMouseLeave={() => {
                    panRef.current.active = false;
                    setIsPanning(false);
                  }}
                />
              )}
              <div
                ref={paperRef}
                className="relative my-12 rounded-md bg-white shadow-lg"
                style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
              >
              <div
                ref={stageWrapRef}
                className="relative h-full w-full"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isPreview) return;
                  const point = computeDropPoint(e);
                  const shapeData = e.dataTransfer?.getData("application/x-template-shape");
                  if (shapeData) {
                    try {
                      const payload = JSON.parse(shapeData);
                      if (payload?.kind) {
                        addShape(payload.kind, point);
                      }
                    } catch {
                      // ignore
                    }
                  }
                  handleFiles(e.dataTransfer?.files, point);
                }}
              >
                <Stage
                  width={canvasWidth * zoom}
                  height={canvasHeight * zoom}
                  scaleX={zoom}
                  scaleY={zoom}
                  ref={stageRef}
                  onMouseDown={(e) => {
                    if (tool !== "select") return;
                    const stage = e.target.getStage();
                    const target = e.target;
                    const targetId = typeof target?.id === "function" ? target.id() : "";
                    const clickedOnEmpty = target === stage || targetId === "_background";
                    if (clickedOnEmpty) {
                      setSelectedId(null);
                    }
                  }}
                >
                  <Layer>
                    <Rect
                      id="_background"
                      x={0}
                      y={0}
                      width={canvasWidth}
                      height={canvasHeight}
                      stroke="#e5e7eb"
                      fill={canvasBackground?.kind === "solid" ? (canvasBackground?.color || "#ffffff") : undefined}
                      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                      fillLinearGradientEndPoint={(() => {
                        if (canvasBackground?.kind !== "gradient") return { x: canvasWidth, y: 0 };
                        if (canvasBackground?.gradient?.type !== "linear") return { x: canvasWidth, y: 0 };
                        const a = ((Number(canvasBackground?.gradient?.angle ?? 90) - 90) * Math.PI) / 180;
                        const cx = canvasWidth / 2;
                        const cy = canvasHeight / 2;
                        const len = Math.hypot(canvasWidth, canvasHeight) / 2;
                        return { x: cx + Math.cos(a) * len, y: cy + Math.sin(a) * len };
                      })()}
                      fillLinearGradientColorStops={(() => {
                        if (canvasBackground?.kind !== "gradient") return undefined;
                        if (canvasBackground?.gradient?.type !== "linear") return undefined;
                        const stops = canvasBackground?.gradient?.stops || [];
                        const pairs = stops
                          .map((s) => [Number(s.pos ?? 0), String(s.color || "#ffffff")])
                          .filter((p) => Number.isFinite(p[0]) && isValidCssColor(p[1]));
                        if (pairs.length < 2) return [0, "#ffffff", 1, "#ffffff"];
                        const flat = [];
                        for (const [pos, col] of pairs) {
                          flat.push(Math.min(1, Math.max(0, pos)), col);
                        }
                        return flat;
                      })()}
                      fillRadialGradientStartPoint={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
                      fillRadialGradientEndPoint={{ x: canvasWidth / 2, y: canvasHeight / 2 }}
                      fillRadialGradientStartRadius={0}
                      fillRadialGradientEndRadius={Math.max(canvasWidth, canvasHeight) / 1.2}
                      fillRadialGradientColorStops={(() => {
                        if (canvasBackground?.kind !== "gradient") return undefined;
                        if (canvasBackground?.gradient?.type !== "radial") return undefined;
                        const stops = canvasBackground?.gradient?.stops || [];
                        const pairs = stops
                          .map((s) => [Number(s.pos ?? 0), String(s.color || "#ffffff")])
                          .filter((p) => Number.isFinite(p[0]) && isValidCssColor(p[1]));
                        if (pairs.length < 2) return [0, "#ffffff", 1, "#ffffff"];
                        const flat = [];
                        for (const [pos, col] of pairs) {
                          flat.push(Math.min(1, Math.max(0, pos)), col);
                        }
                        return flat;
                      })()}
                    />

                    {!!canvasBackground?.pattern?.enabled && !!patternImage && (
                      <Rect
                        x={0}
                        y={0}
                        width={canvasWidth}
                        height={canvasHeight}
                        listening={false}
                        opacity={Number(canvasBackground?.pattern?.opacity ?? 0.18)}
                        fillPatternImage={patternImage}
                        fillPatternRepeat="repeat"
                        fillPatternScale={{
                          x: Number(canvasBackground?.pattern?.scale ?? 1),
                          y: Number(canvasBackground?.pattern?.scale ?? 1),
                        }}
                      />
                    )}

                    {/* Snap lines (temporary, shown while dragging) */}
                    {snapLines.vertical.map((x, i) => (
                      <Line key={`snap-v-${i}`} points={[x, 0, x, canvasHeight]} stroke="#FF6B6B" strokeWidth={1} dash={[4, 4]} listening={false} />
                    ))}
                    {snapLines.horizontal.map((y, i) => (
                      <Line key={`snap-h-${i}`} points={[0, y, canvasWidth, y]} stroke="#FF6B6B" strokeWidth={1} dash={[4, 4]} listening={false} />
                    ))}

                    {/* Live cursor crosshair */}
                    {cursorDoc && !isPreview && (
                      <>
                        <Line
                          points={[cursorDoc.x, 0, cursorDoc.x, canvasHeight]}
                          stroke="rgba(0, 150, 255, 0.3)"
                          strokeWidth={1}
                          listening={false}
                        />
                        <Line
                          points={[0, cursorDoc.y, canvasWidth, cursorDoc.y]}
                          stroke="rgba(0, 150, 255, 0.3)"
                          strokeWidth={1}
                          listening={false}
                        />
                      </>
                    )}

                    {elements.map((el) => {
                      if (el.type === "logo") {
                        return (
                          <LogoNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "text") {
                        return (
                          <TextNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDblClick={() => !isPreview && startTextEditing(el)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "image") {
                        return (
                          <ImageNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_rect" || el.type === "shape_roundrect" || el.type === "shape_frame") {
                        return (
                          <ShapeRectNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_ellipse") {
                        return (
                          <ShapeEllipseNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_line") {
                        return (
                          <ShapeLineNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_polygon") {
                        return (
                          <ShapePolygonNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_star") {
                        return (
                          <ShapeStarNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_arc") {
                        return (
                          <ShapeArcNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_wedge") {
                        return (
                          <ShapeWedgeNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_path") {
                        return (
                          <ShapePathNode
                            key={el.id}
                            el={el}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }

                      if (el.type === "shape_spiral") {
                        return (
                          <ShapeSpiralNode
                            key={el.id}
                            el={el}
                            buildPoints={generateSpiralPoints}
                            draggable={!isPreview && !isEditingText && tool === "select"}
                            onSelect={() => tool === "select" && !isPreview && !isEditingText && setSelectedId(el.id)}
                            onChange={(patch) => updateElement(el.id, patch)}
                            onDragStart={(e) => handleElementDragStart(el, e)}
                            onDragMove={(e) => snapDragMove(el, e)}
                            onDragEnd={() => clearSnapLines()}
                          />
                        );
                      }
                    })}

                    {!isPreview && !isEditingText && tool === "select" && (
                      <Transformer
                        ref={trRef}
                        rotateEnabled
                        enabledAnchors={
                          selectedElement?.type === "text"
                            ? ["middle-left", "middle-right"]
                            : [
                                "top-left",
                                "top-center",
                                "top-right",
                                "middle-left",
                                "middle-right",
                                "bottom-left",
                                "bottom-center",
                                "bottom-right",
                              ]
                        }
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 20 || newBox.height < 20) return oldBox;
                          return newBox;
                        }}
                      />
                    )}
                  </Layer>
                </Stage>

                {!isPreview && textEditor && (
                  <textarea
                    ref={textAreaRef}
                    value={textEditor.value}
                    onChange={(e) => setTextEditor((t) => (t ? { ...t, value: e.target.value } : t))}
                    onBlur={() => commitTextEditing()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelTextEditing();
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitTextEditing();
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: textEditor.top,
                      left: textEditor.left,
                      width: textEditor.width,
                      height: textEditor.height,
                      fontSize: textEditor.fontSize,
                      fontFamily: textEditor.fontFamily,
                      fontWeight: textEditor.bold ? 700 : 400,
                      fontStyle: textEditor.italic ? "italic" : "normal",
                      color: textEditor.fill,
                      textAlign: textEditor.align,
                      opacity: textEditor.opacity,
                      background: "transparent",
                      border: "1px solid #2563EB",
                      outline: "none",
                      padding: 0,
                      margin: 0,
                      resize: "none",
                      overflow: "hidden",
                      lineHeight: 1.2,
                    }}
                  />
                )}
              </div>
            </div>
            </div>
          </div>

          {!isPreview && (
            <div className="flex w-full max-w-245 items-center justify-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTool("select")}
                  className={`rounded-md p-2 ${tool === "select" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  disabled={isPreview}
                  title="Select (V)"
                >
                  <MousePointer2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTool("pan")}
                  className={`rounded-md p-2 ${tool === "pan" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  disabled={isPreview}
                  title="Pan (Space)"
                >
                  <Hand className="h-4 w-4" />
                </button>

                <div className="mx-1 h-6 w-px bg-slate-200" />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.2, Math.round((z / 1.08) * 100) / 100))}
                  className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
                  title="Zoom out (Ctrl+-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <div className="min-w-13 text-center text-sm text-slate-700" title="Zoom">
                  {Math.round(zoom * 100)}%
                </div>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2, Math.round((z * 1.08) * 100) / 100))}
                  className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
                  title="Zoom in (Ctrl++)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <div className="mx-1 h-6 w-px bg-slate-200" />

                <button
                  type="button"
                  onClick={() => setShowRulers((v) => !v)}
                  className={`rounded-md p-2 ${showRulers ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  title="Toggle rulers"
                >
                  <Ruler className="h-4 w-4" />
                </button>

                <div className="mx-1 h-6 w-px bg-slate-200" />

                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="rounded-md p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="rounded-md p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4">
          <div className="mb-4 text-sm font-semibold text-slate-900">Element Properties</div>

          {!selectedElement && <div className="text-sm text-slate-400">Select an element</div>}

          {!!selectedElement && !isPreview && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">ALIGNMENT</div>
              {selectedElement.type === "text" ? (
                <div className="flex overflow-hidden rounded-md border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { align: "left" })}
                    className={`flex h-9 w-1/4 items-center justify-center ${selectedElement.align === "left" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Align left (Ctrl/Cmd+L)"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { align: "center" })}
                    className={`flex h-9 w-1/4 items-center justify-center ${selectedElement.align === "center" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Align center (Ctrl/Cmd+E)"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { align: "right" })}
                    className={`flex h-9 w-1/4 items-center justify-center ${selectedElement.align === "right" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Align right (Ctrl/Cmd+R)"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { align: "justify" })}
                    className={`flex h-9 w-1/4 items-center justify-center ${selectedElement.align === "justify" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    title="Justify (Ctrl/Cmd+J)"
                  >
                    <AlignJustify className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => alignSelected("left")}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("center")}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("right")}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
                  >
                    Right
                  </button>
                </div>
              )}

              {selectedElement.type === "shape_polygon" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">SIDES</div>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={selectedElement.sides ?? 6}
                    onChange={(e) => updateElement(selectedElement.id, { sides: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="mt-1 text-xs text-slate-600">{selectedElement.sides ?? 6}</div>
                </div>
              )}

              {selectedElement.type === "shape_star" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">STAR</div>
                  <label className="mb-2 block text-sm text-slate-700">
                    Points: {selectedElement.points ?? 5}
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={selectedElement.points ?? 5}
                    onChange={(e) => updateElement(selectedElement.id, { points: Number(e.target.value) })}
                    className="mb-3 w-full"
                  />
                  <label className="mb-2 block text-sm text-slate-700">
                    Inner Radius: {selectedElement.innerRadius ?? 60}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={selectedElement.innerRadius ?? 60}
                    onChange={(e) => updateElement(selectedElement.id, { innerRadius: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {(selectedElement.type === "shape_arc" || selectedElement.type === "shape_wedge") && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">ANGLE</div>
                  <input
                    type="range"
                    min={5}
                    max={360}
                    value={selectedElement.angle ?? 90}
                    onChange={(e) => updateElement(selectedElement.id, { angle: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="mt-1 text-xs text-slate-600">{selectedElement.angle ?? 90}°</div>
                </div>
              )}

              {selectedElement.type === "shape_arc" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">RADII</div>
                  <label className="mb-2 block text-sm text-slate-700">Inner: {selectedElement.innerRadius ?? 60}</label>
                  <input
                    type="range"
                    min={5}
                    max={300}
                    value={selectedElement.innerRadius ?? 60}
                    onChange={(e) => updateElement(selectedElement.id, { innerRadius: Number(e.target.value) })}
                    className="mb-3 w-full"
                  />
                  <label className="mb-2 block text-sm text-slate-700">Outer: {selectedElement.outerRadius ?? 110}</label>
                  <input
                    type="range"
                    min={10}
                    max={350}
                    value={selectedElement.outerRadius ?? 110}
                    onChange={(e) => updateElement(selectedElement.id, { outerRadius: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {selectedElement.type === "shape_wedge" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">RADIUS</div>
                  <input
                    type="range"
                    min={10}
                    max={400}
                    value={selectedElement.radius ?? 110}
                    onChange={(e) => updateElement(selectedElement.id, { radius: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="mt-1 text-xs text-slate-600">{selectedElement.radius ?? 110}</div>
                </div>
              )}

              {selectedElement.type === "shape_spiral" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">SPIRAL</div>
                  <label className="mb-2 block text-sm text-slate-700">Turns: {selectedElement.turns ?? 4}</label>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={selectedElement.turns ?? 4}
                    onChange={(e) => updateElement(selectedElement.id, { turns: Number(e.target.value) })}
                    className="mb-3 w-full"
                  />
                  <label className="mb-2 block text-sm text-slate-700">Smoothness: {selectedElement.pointsPerTurn ?? 80}</label>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={selectedElement.pointsPerTurn ?? 80}
                    onChange={(e) => updateElement(selectedElement.id, { pointsPerTurn: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {selectedElement.type === "shape_path" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">SVG PATH</div>
                  <textarea
                    value={selectedElement.data ?? ""}
                    onChange={(e) => updateElement(selectedElement.id, { data: e.target.value })}
                    className="h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <div className="mt-2 text-xs text-slate-500">Paste an SVG path `d` string.</div>
                </div>
              )}
            </div>
          )}

          {!!selectedElement && !isPreview && (
            <button
              type="button"
              onClick={deleteSelected}
              className="mb-4 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Element
            </button>
          )}

          {(selectedElement?.type?.startsWith("shape_") || selectedElement?.type === "shape_line") && (
            <>
              {(selectedElement.type === "shape_rect" ||
                selectedElement.type === "shape_roundrect" ||
                selectedElement.type === "shape_frame" ||
                selectedElement.type === "shape_ellipse" ||
                selectedElement.type === "shape_polygon" ||
                selectedElement.type === "shape_star" ||
                selectedElement.type === "shape_arc" ||
                selectedElement.type === "shape_wedge" ||
                selectedElement.type === "shape_path") && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">FILL</div>
                  <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={(selectedElement.fill || "") === "transparent"}
                      onChange={(e) =>
                        updateElement(selectedId, {
                          fill: e.target.checked ? "transparent" : "#FFFFFF",
                        })
                      }
                      disabled={isPreview}
                    />
                    No fill
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.fill === "transparent" ? "#000000" : selectedElement.fill || "#ffffff"}
                      onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
                      className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1"
                      disabled={isPreview || selectedElement.fill === "transparent"}
                    />
                    <input
                      type="text"
                      value={selectedElement.fill || ""}
                      onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      disabled={isPreview || selectedElement.fill === "transparent"}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">STROKE</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.stroke || "#1E293B"}
                    onChange={(e) => updateElement(selectedId, { stroke: e.target.value })}
                    className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1"
                    disabled={isPreview}
                  />
                  <input
                    type="text"
                    value={selectedElement.stroke || ""}
                    onChange={(e) => updateElement(selectedId, { stroke: e.target.value })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    disabled={isPreview}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedElement.strokeWidth ?? 2}
                    onChange={(e) => updateElement(selectedId, { strokeWidth: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    disabled={isPreview}
                  />
                </div>
              </div>

              {(selectedElement.type === "shape_rect" ||
                selectedElement.type === "shape_roundrect" ||
                selectedElement.type === "shape_frame") && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">CORNER RADIUS</div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={selectedElement.cornerRadius ?? 0}
                    onChange={(e) => updateElement(selectedId, { cornerRadius: Number(e.target.value) })}
                    className="w-full"
                    disabled={isPreview}
                  />
                </div>
              )}

              {selectedElement.type === "shape_line" && (
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">LENGTH</div>
                  <input
                    type="number"
                    value={selectedElement.width ?? 200}
                    onChange={(e) => updateElement(selectedId, { width: Math.max(20, Number(e.target.value) || 20) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    disabled={isPreview}
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">OPACITY</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedElement.opacity ?? 1}
                    onChange={(e) => updateElement(selectedId, { opacity: Number(e.target.value) })}
                    className="w-full"
                    disabled={isPreview}
                  />
                  <div className="w-12 text-right text-sm text-slate-600">{Math.round((selectedElement.opacity ?? 1) * 100)}%</div>
                </div>
              </div>
            </>
          )}

          {selectedElement?.type === "text" && (
            <button
              type="button"
              onClick={outlineSelectedText}
              className="mb-4 flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Outline Text
            </button>
          )}

          {selectedElement?.type === "text" && (
            <>
              <div className="mb-4">
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">TYPOGRAPHY</div>
                <select
                  value={selectedElement.fontFamily}
                  onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  disabled={isPreview}
                >
                  <option value="Cormorant Garamond">Cormorant Garamond (Serif)</option>
                  <option value="Inter">Inter (Sans)</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="Times New Roman">Times New Roman (Serif)</option>
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={selectedElement.fontSize}
                    onChange={(e) => updateElement(selectedId, { fontSize: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    disabled={isPreview}
                  />
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { bold: !selectedElement.bold })}
                    className={`h-9 w-10 rounded-md border border-slate-200 text-sm font-semibold ${selectedElement.bold ? "bg-slate-900 text-white" : "bg-white"}`}
                    disabled={isPreview}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(selectedId, { italic: !selectedElement.italic })}
                    className={`h-9 w-10 rounded-md border border-slate-200 text-sm italic ${selectedElement.italic ? "bg-slate-900 text-white" : "bg-white"}`}
                    disabled={isPreview}
                  >
                    I
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">COLOR & GRADIENT</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.fill}
                    onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
                    className="h-9 w-12 rounded-md border border-slate-200 bg-white p-1"
                    disabled={isPreview}
                  />
                  <input
                    type="text"
                    value={selectedElement.fill}
                    onChange={(e) => updateElement(selectedId, { fill: e.target.value })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    disabled={isPreview}
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">OPACITY</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedElement.opacity}
                    onChange={(e) => updateElement(selectedId, { opacity: Number(e.target.value) })}
                    className="w-full"
                    disabled={isPreview}
                  />
                  <div className="w-12 text-right text-sm text-slate-600">{Math.round(selectedElement.opacity * 100)}%</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">LAYER MANAGEMENT</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={bringToFront}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
                    disabled={isPreview}
                  >
                    Bring Front
                  </button>
                  <button
                    type="button"
                    onClick={sendToBack}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm hover:bg-slate-50"
                    disabled={isPreview}
                  >
                    Send Back
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
