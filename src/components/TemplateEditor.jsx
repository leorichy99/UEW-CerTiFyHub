/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Rect, Line, Circle, Ellipse } from "react-konva";
import useImage from "use-image";
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
  const stageRef = useRef();
  const trRef = useRef();
  const historyRef = useRef({ past: [], future: [] });
  const ignoreHistoryRef = useRef(false);
  const stageWrapRef = useRef(null);
  const canvasShellRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const paperRef = useRef(null);
  const panRef = useRef({ active: false, x: 0, y: 0, sl: 0, st: 0 });
  const pinchRef = useRef({ dist: null, zoom: null });
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

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

  const [elements, setElements] = useState([
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
  ]);

  useEffect(() => {
    if (initialData?.metadata?.elements) {
      ignoreHistoryRef.current = true;
      setElements(initialData.metadata.elements);
      historyRef.current = { past: [], future: [] };
      setHistoryMeta({ canUndo: false, canRedo: false });
      ignoreHistoryRef.current = false;
    }
    if (initialData?.name) {
      setTemplateTitle(initialData.name);
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
    setElements((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (ignoreHistoryRef.current) return next;
      historyRef.current.past.push(cloneElements(prev));
      if (historyRef.current.past.length > 100) historyRef.current.past.shift();
      historyRef.current.future = [];
      return next;
    });
    setHistoryMeta({ canUndo: true, canRedo: false });
  }

  function undo() {
    if (!historyRef.current.past.length) return;
    ignoreHistoryRef.current = true;
    setElements((current) => {
      historyRef.current.future.push(cloneElements(current));
      const prev = historyRef.current.past.pop();
      return prev || current;
    });
    setSelectedId(null);
    setHistoryMeta({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
    setTimeout(() => {
      ignoreHistoryRef.current = false;
    }, 0);
  }

  function redo() {
    if (!historyRef.current.future.length) return;
    ignoreHistoryRef.current = true;
    setElements((current) => {
      historyRef.current.past.push(cloneElements(current));
      const next = historyRef.current.future.pop();
      return next || current;
    });
    setSelectedId(null);
    setHistoryMeta({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
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

  function snapDragMove(el, e) {
    const node = e.target;
    const w = el.width ?? (el.radius ? el.radius * 2 : node.width());
    const h = el.height ?? (el.radius ? el.radius * 2 : node.height());
    const isCenterAnchored = el.type === "shape_ellipse" || el.type === "shape_circle";
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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isPreview,
    isEditingText,
    editingTitle,
    selectedId,
    elements,
    updateElement,
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
      },
      elements,
    };

    if (onSave) {
      onSave(payload);
      return;
    }

    console.log("TEMPLATE:", payload);
    alert("Exported to console");
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
              onChange={(e) => setCanvasPresetId(e.target.value)}
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
                className="h-9 w-[220px] rounded-md border border-slate-200 bg-white px-3 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-800 hover:bg-slate-100"
              >
                <span className="max-w-[220px] truncate">{templateTitle}</span>
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
        <div className="w-72 shrink-0 overflow-y-auto border-r bg-white p-4">
          <div className="mb-6">
            <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">BACKGROUND</div>
            <div className="text-[11px] font-semibold text-slate-700">SOLID COLOR & GRADIENT</div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="h-9 w-9 rounded-lg border border-slate-200 bg-white" />
              <button type="button" className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-900" />
              <button type="button" className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-500" />
              <button type="button" className="h-9 w-9 rounded-lg border border-dashed border-slate-300 bg-white text-slate-500">+</button>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">PATTERN OVERLAYS</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-10 rounded-lg border border-slate-200 bg-slate-50" />
              <button type="button" className="h-10 rounded-lg border border-slate-200 bg-white text-xs text-slate-500">None</button>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">SHAPES</div>
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
                { kind: "divider", label: "Divider", icon: <div className="h-[2px] w-5 rounded bg-slate-600" />, terms: ["line", "divider", "separator"] },
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
          </div>

          <div className="mb-6">
            <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">DYNAMIC FIELDS</div>
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
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold tracking-widest text-slate-500">STATIC ASSETS</div>
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
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-4">
          <div className="flex w-full max-w-[980px] items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setTool("select")}
                className={`rounded-md p-2 ${tool === "select" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                disabled={isPreview}
                title="Select"
              >
                <MousePointer2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTool("pan")}
                className={`rounded-md p-2 ${tool === "pan" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                disabled={isPreview}
                title="Pan"
              >
                <Hand className="h-4 w-4" />
              </button>
              <div className="mx-1 h-6 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.05) * 100) / 100))}
                className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="min-w-[52px] text-center text-sm text-slate-700">{Math.round(zoom * 100)}%</div>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.05) * 100) / 100))}
                className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <div className="mx-1 h-6 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => setShowRulers((v) => !v)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm ${showRulers ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Ruler className="h-4 w-4" />
                Rulers
              </button>
            </div>
          </div>

          <div ref={canvasShellRef} className="relative flex flex-1 w-full overflow-hidden rounded-md bg-slate-100">
            {showRulers && (
              <>
                {/* Corner square */}
                <div className="absolute left-0 top-0 z-20 h-6 w-6 border-b border-r border-slate-300 bg-slate-100" />
                
                {/* Horizontal ruler - simple display only */}
                <div className="absolute left-6 right-0 top-0 z-10 h-6 border-b border-slate-300 bg-slate-100 overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
                    {Array.from({ length: Math.ceil(canvasWidth / 50) + 1 }, (_, i) => i * 50).map((pos) => {
                      const screenX = paperOffset.x - 24 + pos * zoom;
                      const isMajor = pos % 100 === 0;
                      return (
                        <g key={pos}>
                          <line x1={screenX} y1={24} x2={screenX} y2={isMajor ? 12 : 18} stroke="#64748b" strokeWidth={1} />
                          {isMajor && <text x={screenX + 3} y={10} fontSize={9} fill="#64748b">{pos}</text>}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                
                {/* Vertical ruler - simple display only */}
                <div className="absolute bottom-0 left-0 top-6 z-10 w-6 border-r border-slate-300 bg-slate-100 overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
                    {Array.from({ length: Math.ceil(canvasHeight / 50) + 1 }, (_, i) => i * 50).map((pos) => {
                      const screenY = paperOffset.y - 24 + pos * zoom;
                      const isMajor = pos % 100 === 0;
                      return (
                        <g key={pos}>
                          <line x1={24} y1={screenY} x2={isMajor ? 12 : 18} y2={screenY} stroke="#64748b" strokeWidth={1} />
                          {isMajor && <text x={3} y={screenY + 3} fontSize={9} fill="#64748b" transform={`rotate(-90, 3, ${screenY + 3})`}>{pos}</text>}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </>
            )}

            <div
              ref={canvasViewportRef}
              className={`absolute inset-0 flex flex-1 w-full items-center justify-center overflow-auto ${showRulers ? "pt-6 pl-6" : ""} ${tool === "pan" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
              style={{ touchAction: tool === "pan" ? "none" : "auto" }}
              onScroll={() => measurePaperOffset()}
              onMouseDown={(e) => {
                if (tool !== "pan" || isPreview) return;
                const el = canvasViewportRef.current;
                if (!el) return;
                panRef.current = { active: true, x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
                setIsPanning(true);
              }}
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

                if (tool !== "pan" || isPreview) return;
                const el = canvasViewportRef.current;
                if (!el) return;
                if (!panRef.current.active) return;
                const dx = e.clientX - panRef.current.x;
                const dy = e.clientY - panRef.current.y;
                el.scrollLeft = panRef.current.sl - dx;
                el.scrollTop = panRef.current.st - dy;
              }}
              onMouseUp={() => {
                if (tool !== "pan" || isPreview) return;
                panRef.current.active = false;
                setIsPanning(false);
              }}
              onMouseLeave={() => {
                setCursorDoc(null);
                if (tool !== "pan" || isPreview) return;
                panRef.current.active = false;
                setIsPanning(false);
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
              <div
                ref={paperRef}
                className="relative my-8 rounded-md bg-white shadow-lg"
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
                    <Rect id="_background" x={0} y={0} width={canvasWidth} height={canvasHeight} stroke="#e5e7eb" fill="#ffffff" />

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
                            onDragStart={() => clearSnapLines()}
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
                            onDragStart={() => clearSnapLines()}
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
                            onDragStart={() => clearSnapLines()}
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
                            onDragStart={() => clearSnapLines()}
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
                            onDragStart={() => clearSnapLines()}
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
                            onDragStart={() => clearSnapLines()}
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

            {!isPreview && (
              <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  UNDO
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Redo2 className="h-4 w-4" />
                  REDO
                </button>
              </div>
            )}
            </div>
          </div>
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
                selectedElement.type === "shape_ellipse") && (
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

      <div className="flex h-9 items-center justify-between border-t border-slate-200 bg-white px-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>AUTO-SAVED</span>
          </div>
          <div className="text-slate-300">|</div>
          <div className="uppercase text-slate-400">{activePreset.id.replaceAll("_", " ")}</div>
        </div>
        <div className="flex items-center gap-4">
          <div>PRESS [ESC] TO DESELECT</div>
          <div>SHORTCUTS</div>
        </div>
      </div>
    </div>
  );
}
