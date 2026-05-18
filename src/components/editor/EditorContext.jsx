/* eslint-disable react/prop-types */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import opentype from "opentype.js";
import useImage from "use-image";
import { CANVAS_PRESETS, DEFAULT_BACKGROUND } from "./constants";

const EditorContext = createContext(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

export function EditorProvider({ initialData, onSave, onClose, toast, children }) {
  // ─── Refs ────────────────────────────────────────────────────────
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
  const pendingEditIdRef = useRef(null);

  // ─── State ───────────────────────────────────────────────────────
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
  const [mentionDropdown, setMentionDropdown] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [shapeQuery, setShapeQuery] = useState("");
  const [tool, setTool] = useState("select");
  const [isPanning, setIsPanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paperOffset, setPaperOffset] = useState({ x: 0, y: 0 });
  const [cursorDoc, setCursorDoc] = useState(null);
  const [foregroundColor, setForegroundColor] = useState("#1E293B");
  const [activeRightTab, setActiveRightTab] = useState("properties");

  // Guides – persisted with template
  const [guides, setGuides] = useState({ horizontal: [], vertical: [] });

  const [openToolGroups, setOpenToolGroups] = useState({
    background: true,
    pattern: false,
    shapes: true,
    fields: false,
    assets: false,
  });

  // ─── Background state ────────────────────────────────────────────
  const [backgroundByPreset, setBackgroundByPreset] = useState({
    a4_portrait: { ...DEFAULT_BACKGROUND },
    a4_landscape: { ...DEFAULT_BACKGROUND },
  });

  const canvasBackground = backgroundByPreset[canvasPresetId] || backgroundByPreset.a4_landscape;
  const [patternImage] = useImage(canvasBackground?.pattern?.src || null);

  // ─── Elements state ──────────────────────────────────────────────
  const [elementsByPreset, setElementsByPreset] = useState({
    a4_portrait: [],
    a4_landscape: [],
  });

  const elements = elementsByPreset[canvasPresetId] || [];

  // ─── Load initial data ───────────────────────────────────────────
  useEffect(() => {
    if (!initialData) return;

    const incomingPresetId = initialData?.metadata?.canvas?.presetId;
    const targetPresetId = incomingPresetId || "a4_landscape";

    if (incomingPresetId) {
      setCanvasPresetId(incomingPresetId);
    }

    const incomingByPreset = initialData?.metadata?.elements_by_preset;
    const incomingElements = initialData?.metadata?.elements;

    if (incomingByPreset || incomingElements) {
      ignoreHistoryRef.current = true;

      if (incomingByPreset && typeof incomingByPreset === "object") {
        setElementsByPreset((prev) => {
          const next = {};
          for (const key of Object.keys(prev)) {
            next[key] = incomingByPreset[key] ?? [];
          }
          for (const key of Object.keys(incomingByPreset)) {
            next[key] = incomingByPreset[key];
          }
          return next;
        });
      } else if (incomingElements) {
        setElementsByPreset((prev) => ({
          ...prev,
          [targetPresetId]: incomingElements,
        }));
      }

      const affectedPresets = incomingByPreset
        ? Object.keys(incomingByPreset)
        : [targetPresetId];
      const newHistory = { ...historyRef.current };
      for (const key of affectedPresets) {
        newHistory[key] = { past: [], future: [] };
      }
      historyRef.current = newHistory;
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
      setBackgroundByPreset((prev) => ({ ...prev, [targetPresetId]: { ...prev[targetPresetId], ...incomingBg } }));
    }

    // Load persisted guides
    const incomingGuides = initialData?.metadata?.guides;
    if (incomingGuides && typeof incomingGuides === "object") {
      setGuides({
        horizontal: Array.isArray(incomingGuides.horizontal) ? incomingGuides.horizontal : [],
        vertical: Array.isArray(incomingGuides.vertical) ? incomingGuides.vertical : [],
      });
    }
  }, [initialData]);

  // ─── Derived values ──────────────────────────────────────────────
  const activePreset = CANVAS_PRESETS.find((p) => p.id === canvasPresetId) || CANVAS_PRESETS[0];
  const canvasWidth = activePreset.width;
  const canvasHeight = activePreset.height;

  const selectedElement = elements.find((e) => e.id === selectedId);
  const isPreview = mode === "preview";
  const isEditingText = !!textEditor;
  const isPortrait = canvasHeight > canvasWidth;
  const canUndo = historyMeta.canUndo;
  const canRedo = historyMeta.canRedo;

  const outlineFontUrl =
    initialData?.metadata?.outline_font_url || "/fonts/Inter-Regular.ttf";

  // ─── Helpers ─────────────────────────────────────────────────────
  function isValidCssColor(value) {
    if (!value) return false;
    const s = new Option().style;
    s.color = "";
    s.color = String(value).trim();
    return !!s.color;
  }

  function cloneElements(els) {
    return els.map((el) => ({ ...el }));
  }

  function measurePaperOffset() {
    const shell = canvasShellRef.current;
    const paper = paperRef.current;
    if (!shell || !paper) return;
    const shellRect = shell.getBoundingClientRect();
    const paperRect = paper.getBoundingClientRect();
    setPaperOffset({ x: paperRect.left - shellRect.left, y: paperRect.top - shellRect.top });
  }

  // ─── History / Element mutation ──────────────────────────────────
  function applyElementsUpdate(updater) {
    setElementsByPreset((prev) => {
      const currentElements = prev[canvasPresetId] || [];
      const next = typeof updater === "function" ? updater(currentElements) : updater;
      if (ignoreHistoryRef.current) return { ...prev, [canvasPresetId]: next };

      const presetHistory = historyRef.current[canvasPresetId] || { past: [], future: [] };
      presetHistory.past.push(cloneElements(currentElements));
      if (presetHistory.past.length > 100) presetHistory.past.shift();
      presetHistory.future = [];
      historyRef.current = { ...historyRef.current, [canvasPresetId]: presetHistory };

      return { ...prev, [canvasPresetId]: next };
    });
    setHistoryMeta({ canUndo: true, canRedo: false });
  }

  function updateElement(id, patch) {
    applyElementsUpdate((els) =>
      els.map((el) => (el.id === id ? { ...el, ...patch } : el))
    );
  }

  function replaceElement(id, nextEl) {
    applyElementsUpdate((prev) => prev.map((el) => (el.id === id ? nextEl : el)));
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

  // ─── Element operations ──────────────────────────────────────────
  function deleteSelected() {
    if (!selectedId) return;
    applyElementsUpdate((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
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

  function alignSelected(where) {
    if (!selectedElement) return;
    const w = selectedElement.width ?? 0;
    if (!w) return;
    if (where === "left") updateElement(selectedId, { x: 0 });
    if (where === "center") updateElement(selectedId, { x: Math.round((canvasWidth - w) / 2) });
    if (where === "right") updateElement(selectedId, { x: Math.round(canvasWidth - w) });
  }

  // ─── Add operations ──────────────────────────────────────────────
  function addLogo(atPoint) {
    const id = "logo-" + Date.now();
    const w = 120, h = 120;
    const x = atPoint ? atPoint.x - w / 2 : Math.round(canvasWidth / 2 - w / 2);
    const y = atPoint ? atPoint.y - h / 2 : 40;
    applyElementsUpdate((prev) => [
      ...prev,
      { id, type: "logo", x, y, width: w, height: h },
    ]);
    setSelectedId(id);
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
        fill: foregroundColor,
        fontFamily: "Baskervville",
        bold: true,
        italic: false,
        align: "center",
        opacity: 1,
      },
    ]);
  }

  function addQrPlaceholder() {
    applyElementsUpdate((prev) => [
      ...prev,
      {
        id: "qr-" + Date.now(),
        type: "qr_placeholder",
        x: canvasWidth - 140,
        y: canvasHeight - 140,
        width: 100,
        height: 100,
        fill: "#1E293B",
        opacity: 1,
      },
    ]);
  }

  function addShape(kind, atPoint) {
    const id = "sh-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    const baseStroke = foregroundColor;

    const shapeDefaults = {
      rect: { type: "shape_rect", width: 220, height: 120, cornerRadius: 0, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      rounded: { type: "shape_roundrect", width: 240, height: 130, cornerRadius: 18, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      frame: { type: "shape_frame", width: 360, height: 210, cornerRadius: 10, fill: "transparent", stroke: baseStroke, strokeWidth: 4 },
      ellipse: { type: "shape_ellipse", width: 200, height: 120, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      polygon: { type: "shape_polygon", width: 220, height: 220, sides: 6, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      star: { type: "shape_star", width: 240, height: 240, points: 5, innerRadius: 60, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      arc: { type: "shape_arc", width: 260, height: 260, innerRadius: 60, outerRadius: 110, angle: 220, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      pie: { type: "shape_wedge", width: 260, height: 260, radius: 110, angle: 90, fill: "#FFFFFF", stroke: baseStroke, strokeWidth: 2 },
      spiral: { type: "shape_spiral", width: 260, height: 260, turns: 4, pointsPerTurn: 80, stroke: baseStroke, strokeWidth: 2 },
      path: { type: "shape_path", width: 260, height: 200, data: "M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80", fill: "transparent", stroke: baseStroke, strokeWidth: 2 },
      divider: { type: "shape_line", width: 320, stroke: baseStroke, strokeWidth: 2 },
    };

    const def = shapeDefaults[kind];
    if (!def) return;

    const width = def.width || 200;
    const height = def.height || 200;
    const x = atPoint?.x ?? Math.round((canvasWidth - width) / 2);
    const y = atPoint?.y ?? (kind === "divider" ? Math.round(canvasHeight / 2) : Math.round((canvasHeight - height) / 2));

    applyElementsUpdate((prev) => [
      ...prev,
      { id, ...def, x, y, opacity: 1, rotation: 0 },
    ]);
    setSelectedId(id);
  }

  // ─── Alt-drag duplicate ──────────────────────────────────────────
  function beginAltDuplicate(el) {
    if (!el) return null;
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
    if (isPreview || isEditingText || (tool !== "select" && tool !== "rect" && tool !== "ellipse" && tool !== "line")) return;
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

  // ─── Snap ────────────────────────────────────────────────────────
  function clearSnapLines() {
    setSnapLines({ vertical: [], horizontal: [] });
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

    // Canvas edge + center snap targets
    const candidatesX = [
      { pos: 0, line: 0 },
      { pos: Math.round((canvasWidth - w) / 2), line: Math.round(canvasWidth / 2) },
      { pos: Math.round(canvasWidth - w), line: canvasWidth },
    ];
    // Add guide snap targets
    for (const gx of guides.vertical) {
      candidatesX.push({ pos: Math.round(gx - w / 2), line: gx });
      candidatesX.push({ pos: Math.round(gx), line: gx });
      candidatesX.push({ pos: Math.round(gx - w), line: gx });
    }

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

    const candidatesY = [
      { pos: 0, line: 0 },
      { pos: Math.round((canvasHeight - h) / 2), line: Math.round(canvasHeight / 2) },
      { pos: Math.round(canvasHeight - h), line: canvasHeight },
    ];
    for (const gy of guides.horizontal) {
      candidatesY.push({ pos: Math.round(gy - h / 2), line: gy });
      candidatesY.push({ pos: Math.round(gy), line: gy });
      candidatesY.push({ pos: Math.round(gy - h), line: gy });
    }

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

  // ─── Background helpers ──────────────────────────────────────────
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

  // ─── File handling ───────────────────────────────────────────────
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

  // ─── Text editing ────────────────────────────────────────────────
  function startTextEditing(el) {
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne("#" + el.id);

    const nodeHeight = node ? node.height() * zoom : el.fontSize * zoom * 1.2;
    const measuredWidth = node ? node.width() : (el.width || 200);
    const initialWidth = Math.max(40, measuredWidth * zoom);
    const maxW = (canvasWidth - el.x) * zoom;

    setSelectedId(el.id);
    setTextEditor({
      id: el.id,
      value: el.text,
      left: el.x * zoom,
      top: el.y * zoom,
      minWidth: initialWidth,
      maxWidth: maxW,
      minHeight: Math.max(nodeHeight, el.fontSize * zoom * 1.2),
      fontSize: el.fontSize * zoom,
      lineHeight: 1.2,
      fontFamily: el.fontFamily,
      bold: !!el.bold,
      italic: !!el.italic,
      fill: el.fill,
      align: el.align,
    });
  }

  function commitTextEditing() {
    if (!textEditor) return;
    if (!textEditor.value.trim()) {
      applyElementsUpdate((prev) => prev.filter((el) => el.id !== textEditor.id));
      setSelectedId(null);
    } else {
      // Only persist text content; let Konva re-measure width naturally so
      // the bounding box and positions remain stable across edit sessions.
      // The width is only persisted when the user explicitly resizes via the
      // transformer (which sets userResized=true on the element).
      updateElement(textEditor.id, { text: textEditor.value });
    }
    setTextEditor(null);
  }

  function cancelTextEditing() {
    if (!textEditor) return;
    const el = elements.find((e) => e.id === textEditor.id);
    if (el && !el.text.trim()) {
      applyElementsUpdate((prev) => prev.filter((e) => e.id !== textEditor.id));
      setSelectedId(null);
    }
    setTextEditor(null);
  }

  // ─── Text outline ────────────────────────────────────────────────
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

  // ─── Spiral helper ───────────────────────────────────────────────
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

  // ─── Publish / Save ──────────────────────────────────────────────
  async function publishTemplate() {
    const finalElementsByPreset = {
      ...elementsByPreset,
      [canvasPresetId]: elements,
    };

    const payload = {
      title: templateTitle,
      canvas: {
        presetId: canvasPresetId,
        width: canvasWidth,
        height: canvasHeight,
        background: canvasBackground,
      },
      elements: finalElementsByPreset[canvasPresetId],
      elements_by_preset: finalElementsByPreset,
      background_by_preset: backgroundByPreset,
      guides,
    };

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(payload);
      } catch (err) {
        console.error("Save failed:", err);
        toast.error("Failed to save template");
      } finally {
        setIsSaving(false);
      }
    }
  }

  // ─── Layer operations (new for Layers panel) ─────────────────────
  function reorderElement(fromIndex, toIndex) {
    applyElementsUpdate((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  }

  function toggleElementVisibility(id) {
    updateElement(id, { visible: !(elements.find((e) => e.id === id)?.visible !== false) });
  }

  function toggleElementLock(id) {
    updateElement(id, { locked: !elements.find((e) => e.id === id)?.locked });
  }

  function renameElement(id, name) {
    updateElement(id, { name });
  }

  // ─── Eyedropper ──────────────────────────────────────────────────
  function pickColorFromElement(el) {
    if (!el) return;
    const color = el.fill && el.fill !== "transparent" ? el.fill : el.stroke || "#000000";
    setForegroundColor(color);
    setTool("select");
  }

  // ─── Preset switch ───────────────────────────────────────────────
  function switchPreset(newPresetId) {
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
  }

  // ─── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    measurePaperOffset();
  }, [zoom, canvasWidth, canvasHeight, showRulers]);

  useEffect(() => {
    function onResize() { measurePaperOffset(); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

    if (!trRef.current) return;
    trRef.current.nodes([node]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId]);

  // Pending text edit
  useEffect(() => {
    const pid = pendingEditIdRef.current;
    if (!pid) return;
    const el = elements.find((e) => e.id === pid);
    if (!el) return;
    pendingEditIdRef.current = null;
    const t = setTimeout(() => startTextEditing(el), 0);
    return () => clearTimeout(t);
  }, [elements]);

  // Focus textarea
  useEffect(() => {
    if (!textEditor) return;
    const t = setTimeout(() => {
      textAreaRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [textEditor]);

  // Keyboard shortcuts
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

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "t") {
        setTool("text");
        return;
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "r") {
        setTool("rect");
        return;
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "e") {
        if (!selectedId) { setTool("ellipse"); return; }
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "l") {
        if (!selectedId) { setTool("line"); return; }
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "i") {
        setTool("eyedropper");
        return;
      }

      if (!isCmdOrCtrl && String(e.key || "").toLowerCase() === "z") {
        setTool("zoom");
        return;
      }

      if (!isCmdOrCtrl && e.key === " ") {
        e.preventDefault();
        if (tool === "pan") {
          setTool(toolBeforeSpaceRef.current ?? "select");
          toolBeforeSpaceRef.current = null;
        } else {
          toolBeforeSpaceRef.current = tool;
          setTool("pan");
        }
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

      if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const el = elements.find((x) => x.id === selectedId);
        if (!el) return;
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        updateElement(selectedId, { x: (el.x ?? 0) + dx, y: (el.y ?? 0) + dy });
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

    function onKeyUp() {
      if (isPreview) return;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isPreview, isEditingText, editingTitle, selectedId, elements, tool]);

  // Wheel zoom
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

  // ─── Context value ───────────────────────────────────────────────
  const value = useMemo(() => ({
    // Refs
    stageRef, trRef, stageWrapRef, canvasShellRef, canvasViewportRef, paperRef,
    panRef, pinchRef, fileInputRef, patternInputRef, textAreaRef,
    toolBeforeSpaceRef, altDupRef, pendingEditIdRef,

    // State
    zoom, setZoom,
    canvasPresetId, setCanvasPresetId,
    showRulers, setShowRulers,
    mode, setMode,
    templateTitle, setTemplateTitle,
    editingTitle, setEditingTitle,
    selectedId, setSelectedId,
    historyMeta, canUndo, canRedo,
    snapLines, setSnapLines,
    textEditor, setTextEditor,
    mentionDropdown, setMentionDropdown,
    showPreviewModal, setShowPreviewModal,
    previewImage, setPreviewImage,
    shapeQuery, setShapeQuery,
    tool, setTool,
    isPanning, setIsPanning,
    isSaving,
    paperOffset, setPaperOffset,
    cursorDoc, setCursorDoc,
    foregroundColor, setForegroundColor,
    activeRightTab, setActiveRightTab,
    guides, setGuides,
    openToolGroups, setOpenToolGroups,

    // Background
    backgroundByPreset, setBackgroundByPreset,
    canvasBackground, patternImage,

    // Elements
    elementsByPreset, setElementsByPreset,
    elements,

    // Derived
    activePreset, canvasWidth, canvasHeight,
    selectedElement, isPreview, isEditingText, isPortrait,

    // Actions
    applyElementsUpdate, updateElement, replaceElement,
    undo, redo, deleteSelected, duplicateSelected,
    bringToFront, sendToBack, alignSelected,
    addLogo, addPlaceholder, addQrPlaceholder, addShape,
    handleElementDragStart, clearSnapLines, snapDragMove,
    setBackgroundPatch, setGradientPatch, setPatternPatch,
    handleFiles, computeDropPoint,
    startTextEditing, commitTextEditing, cancelTextEditing,
    outlineSelectedText, generateSpiralPoints,
    publishTemplate, switchPreset, measurePaperOffset,
    isValidCssColor, onClose,

    // Layer operations
    reorderElement, toggleElementVisibility, toggleElementLock, renameElement,

    // Eyedropper
    pickColorFromElement,

    // Toast
    toast,
  }), [
    zoom, canvasPresetId, showRulers, mode, templateTitle, editingTitle,
    selectedId, historyMeta, snapLines, textEditor, mentionDropdown,
    showPreviewModal, previewImage, shapeQuery, tool, isPanning, isSaving,
    paperOffset, cursorDoc, foregroundColor, activeRightTab, guides,
    openToolGroups, backgroundByPreset, canvasBackground, patternImage,
    elementsByPreset, elements, activePreset, selectedElement, isPreview,
    isEditingText, isPortrait, canUndo, canRedo, onClose, toast,
  ]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
