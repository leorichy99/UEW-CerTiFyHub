/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  Stage,
  Layer,
  Text,
  Rect,
  Line,
  Group,
  Transformer,
} from "react-konva";
import { useEditor } from "./EditorContext";
import { THEME } from "./constants";
import TextEditOverlay from "./TextEditOverlay";

import LogoNode from "./nodes/LogoNode";
import TextNode from "./nodes/TextNode";
import ImageNode from "./nodes/ImageNode";
import ShapeRectNode from "./nodes/ShapeRectNode";
import ShapeEllipseNode from "./nodes/ShapeEllipseNode";
import ShapeLineNode from "./nodes/ShapeLineNode";
import ShapeCircleNode from "./nodes/ShapeCircleNode";
import ShapePolygonNode from "./nodes/ShapePolygonNode";
import ShapeStarNode from "./nodes/ShapeStarNode";
import ShapeArcNode from "./nodes/ShapeArcNode";
import ShapeWedgeNode from "./nodes/ShapeWedgeNode";
import ShapePathNode from "./nodes/ShapePathNode";
import ShapeSpiralNode from "./nodes/ShapeSpiralNode";

export default function Canvas() {
  const ctx = useEditor();
  const {
    stageRef,
    trRef,
    stageWrapRef,
    canvasShellRef,
    canvasViewportRef,
    paperRef,
    panRef,
    pinchRef,
    zoom,
    setZoom,
    canvasWidth,
    canvasHeight,
    elements,
    selectedId,
    setSelectedId,
    tool,
    setTool,
    isPreview,
    isEditingText,
    isPanning,
    setIsPanning,
    textEditor,
    snapLines,
    cursorDoc,
    setCursorDoc,
    paperOffset,
    setPaperOffset,
    showRulers,
    canvasBackground,
    patternImage,
    guides,
    setGuides,
    foregroundColor,
    isValidCssColor,
    updateElement,
    applyElementsUpdate,
    pendingEditIdRef,
    handleElementDragStart,
    snapDragMove,
    clearSnapLines,
    startTextEditing,
    commitTextEditing,
    handleFiles,
    computeDropPoint,
    addLogo,
    addShape,
    generateSpiralPoints,
    measurePaperOffset,
    pickColorFromElement,
  } = ctx;

  const [draggingGuide, setDraggingGuide] = useState(null);

  // Helper: is the tool one that allows drag-select
  const isDraggableTool = tool === "select" || tool === "rect" || tool === "ellipse" || tool === "line";

  function handleRulerMouseDown(axis, e) {
    if (isPreview) return;
    e.preventDefault();
    setDraggingGuide({ axis, pos: 0 });

    const shell = canvasShellRef.current;
    const paper = paperRef.current;
    if (!shell || !paper) return;

    function onMouseMove(ev) {
      const paperRect = paper.getBoundingClientRect();
      let pos;
      if (axis === "horizontal") {
        pos = (ev.clientY - paperRect.top) / zoom;
      } else {
        pos = (ev.clientX - paperRect.left) / zoom;
      }
      setDraggingGuide({ axis, pos: Math.round(pos) });
    }

    function onMouseUp(ev) {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      const paperRect = paper.getBoundingClientRect();
      let pos;
      if (axis === "horizontal") {
        pos = (ev.clientY - paperRect.top) / zoom;
      } else {
        pos = (ev.clientX - paperRect.left) / zoom;
      }
      pos = Math.round(pos);
      if (pos >= 0 && pos <= (axis === "horizontal" ? canvasHeight : canvasWidth)) {
        setGuides((prev) => ({
          ...prev,
          [axis]: [...prev[axis], pos],
        }));
      }
      setDraggingGuide(null);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function removeGuide(axis, index) {
    setGuides((prev) => ({
      ...prev,
      [axis]: prev[axis].filter((_, i) => i !== index),
    }));
  }

  return (
    <div
      ref={canvasShellRef}
      className="relative flex flex-1 w-full overflow-hidden"
      style={{ background: THEME.bgCanvas }}
    >
      {/* Rulers */}
      {showRulers && (
        <>
          {/* Corner square */}
          <div
            className="absolute left-0 top-0 z-20 h-6 w-6"
            style={{
              background: THEME.bgPanel,
              borderRight: `1px solid ${THEME.border}`,
              borderBottom: `1px solid ${THEME.border}`,
            }}
          />

          {/* Horizontal ruler */}
          <div
            className="absolute left-6 right-0 top-0 z-10 h-6 overflow-hidden"
            style={{
              background: THEME.bgPanel,
              borderBottom: `1px solid ${THEME.border}`,
              cursor: "s-resize",
            }}
            onMouseDown={(e) => handleRulerMouseDown("horizontal", e)}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              style={{ overflow: "visible" }}
            >
              {Array.from(
                { length: Math.ceil(canvasWidth / 50) + 1 },
                (_, i) => i * 50
              ).map((pos) => {
                const screenX = paperOffset.x - 24 + pos * zoom;
                const isMajor = pos % 100 === 0;
                return (
                  <g key={pos}>
                    <line
                      x1={screenX}
                      y1={24}
                      x2={screenX}
                      y2={isMajor ? 10 : 16}
                      stroke={THEME.textMuted}
                      strokeWidth={0.5}
                    />
                    {isMajor && (
                      <text
                        x={screenX + 3}
                        y={9}
                        fontSize={9}
                        fill={THEME.textMuted}
                      >
                        {pos}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Vertical ruler */}
          <div
            className="absolute bottom-0 left-0 top-6 z-10 w-6 overflow-hidden"
            style={{
              background: THEME.bgPanel,
              borderRight: `1px solid ${THEME.border}`,
              cursor: "e-resize",
            }}
            onMouseDown={(e) => handleRulerMouseDown("vertical", e)}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              style={{ overflow: "visible" }}
            >
              {Array.from(
                { length: Math.ceil(canvasHeight / 50) + 1 },
                (_, i) => i * 50
              ).map((pos) => {
                const screenY = paperOffset.y - 24 + pos * zoom;
                const isMajor = pos % 100 === 0;
                return (
                  <g key={pos}>
                    <line
                      x1={24}
                      y1={screenY}
                      x2={isMajor ? 10 : 16}
                      y2={screenY}
                      stroke={THEME.textMuted}
                      strokeWidth={0.5}
                    />
                    {isMajor && (
                      <text
                        x={2}
                        y={screenY + 3}
                        fontSize={9}
                        fill={THEME.textMuted}
                        transform={`rotate(-90, 2, ${screenY + 3})`}
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

      {/* Canvas viewport */}
      <div
        ref={canvasViewportRef}
        className={`absolute inset-0 flex flex-1 w-full items-center justify-center overflow-auto ${showRulers ? "pt-6 pl-6" : ""} ${tool === "pan" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : tool === "eyedropper" ? "cursor-crosshair" : "cursor-default"}`}
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
              if (
                xDoc >= 0 &&
                yDoc >= 0 &&
                xDoc <= canvasWidth &&
                yDoc <= canvasHeight
              ) {
                setCursorDoc({
                  x: Math.round(xDoc),
                  y: Math.round(yDoc),
                });
              } else {
                setCursorDoc(null);
              }
              setPaperOffset({
                x: paperRect.left - shellRect.left,
                y: paperRect.top - shellRect.top,
              });
            }
          }
        }}
        onMouseLeave={() => setCursorDoc(null)}
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
          const next = Math.min(
            2,
            Math.max(0.2, Math.round(base * factor * 100) / 100)
          );
          setZoom(next);
        }}
        onTouchEnd={() => {
          pinchRef.current = { dist: null, zoom: null };
        }}
      >
        {/* Pan overlay */}
        {tool === "pan" && !isPreview && (
          <div
            className="absolute inset-0 z-10"
            onMouseDown={(e) => {
              const el = canvasViewportRef.current;
              if (!el) return;
              panRef.current = {
                active: true,
                x: e.clientX,
                y: e.clientY,
                sl: el.scrollLeft,
                st: el.scrollTop,
              };
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

        {/* Paper */}
        <div
          ref={paperRef}
          className="relative my-12 rounded-sm shadow-lg"
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            background: "#ffffff",
          }}
        >
          <div
            ref={stageWrapRef}
            className="relative h-full w-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (isPreview) return;
              const point = computeDropPoint(e);
              const assetData = e.dataTransfer?.getData(
                "application/x-template-asset"
              );
              if (assetData) {
                try {
                  const payload = JSON.parse(assetData);
                  if (payload?.type === "logo") addLogo(point);
                } catch {
                  /* ignore */
                }
                return;
              }
              const shapeData = e.dataTransfer?.getData(
                "application/x-template-shape"
              );
              if (shapeData) {
                try {
                  const payload = JSON.parse(shapeData);
                  if (payload?.kind) addShape(payload.kind, point);
                } catch {
                  /* ignore */
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
                const stage = e.target.getStage();
                const target = e.target;
                const targetId =
                  typeof target?.id === "function" ? target.id() : "";
                const clickedOnEmpty =
                  target === stage || targetId === "_background";

                // Eyedropper: pick color from clicked element
                if (tool === "eyedropper" && !isPreview) {
                  if (!clickedOnEmpty) {
                    const el = elements.find((x) => x.id === targetId);
                    if (el) pickColorFromElement(el);
                  }
                  return;
                }

                // Canvas-click shape tools
                if ((tool === "rect" || tool === "ellipse" || tool === "line") && clickedOnEmpty && !isPreview) {
                  const pointer = stage.getPointerPosition();
                  if (pointer) {
                    const x = pointer.x / zoom;
                    const y = pointer.y / zoom;
                    const kindMap = { rect: "rect", ellipse: "ellipse", line: "divider" };
                    addShape(kindMap[tool], { x: Math.round(x), y: Math.round(y) });
                    setTool("select");
                  }
                  return;
                }

                // Text tool
                if (
                  tool === "text" &&
                  clickedOnEmpty &&
                  !isPreview
                ) {
                  const pointer = stage.getPointerPosition();
                  if (pointer) {
                    const x = pointer.x / zoom;
                    const y = pointer.y / zoom;
                    const newId = "el-" + Date.now();
                    pendingEditIdRef.current = newId;
                    applyElementsUpdate((prev) => [
                      ...prev,
                      {
                        id: newId,
                        type: "text",
                        text: "",
                        x: Math.round(x),
                        y: Math.round(y),
                        width: 200,
                        fontSize: 20,
                        fill: foregroundColor,
                        fontFamily: "Baskervville",
                        bold: false,
                        italic: false,
                        align: "left",
                        opacity: 1,
                      },
                    ]);
                    setSelectedId(newId);
                    setTool("select");
                  }
                  return;
                }

                if (tool !== "select") return;
                if (clickedOnEmpty) {
                  if (isEditingText) commitTextEditing();
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {/* Background rect */}
                <Rect
                  id="_background"
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  stroke="#e5e7eb"
                  fill={
                    canvasBackground?.kind === "solid"
                      ? canvasBackground?.color || "#ffffff"
                      : undefined
                  }
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={(() => {
                    if (canvasBackground?.kind !== "gradient")
                      return { x: canvasWidth, y: 0 };
                    if (canvasBackground?.gradient?.type !== "linear")
                      return { x: canvasWidth, y: 0 };
                    const a =
                      ((Number(
                        canvasBackground?.gradient?.angle ?? 90
                      ) -
                        90) *
                        Math.PI) /
                      180;
                    const cx = canvasWidth / 2;
                    const cy = canvasHeight / 2;
                    const len =
                      Math.hypot(canvasWidth, canvasHeight) / 2;
                    return {
                      x: cx + Math.cos(a) * len,
                      y: cy + Math.sin(a) * len,
                    };
                  })()}
                  fillLinearGradientColorStops={(() => {
                    if (canvasBackground?.kind !== "gradient")
                      return undefined;
                    if (canvasBackground?.gradient?.type !== "linear")
                      return undefined;
                    const stops =
                      canvasBackground?.gradient?.stops || [];
                    const pairs = stops
                      .map((s) => [
                        Number(s.pos ?? 0),
                        String(s.color || "#ffffff"),
                      ])
                      .filter(
                        (p) =>
                          Number.isFinite(p[0]) &&
                          isValidCssColor(p[1])
                      );
                    if (pairs.length < 2)
                      return [0, "#ffffff", 1, "#ffffff"];
                    const flat = [];
                    for (const [pos, col] of pairs) {
                      flat.push(
                        Math.min(1, Math.max(0, pos)),
                        col
                      );
                    }
                    return flat;
                  })()}
                  fillRadialGradientStartPoint={{
                    x: canvasWidth / 2,
                    y: canvasHeight / 2,
                  }}
                  fillRadialGradientEndPoint={{
                    x: canvasWidth / 2,
                    y: canvasHeight / 2,
                  }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndRadius={
                    Math.max(canvasWidth, canvasHeight) / 1.2
                  }
                  fillRadialGradientColorStops={(() => {
                    if (canvasBackground?.kind !== "gradient")
                      return undefined;
                    if (canvasBackground?.gradient?.type !== "radial")
                      return undefined;
                    const stops =
                      canvasBackground?.gradient?.stops || [];
                    const pairs = stops
                      .map((s) => [
                        Number(s.pos ?? 0),
                        String(s.color || "#ffffff"),
                      ])
                      .filter(
                        (p) =>
                          Number.isFinite(p[0]) &&
                          isValidCssColor(p[1])
                      );
                    if (pairs.length < 2)
                      return [0, "#ffffff", 1, "#ffffff"];
                    const flat = [];
                    for (const [pos, col] of pairs) {
                      flat.push(
                        Math.min(1, Math.max(0, pos)),
                        col
                      );
                    }
                    return flat;
                  })()}
                />

                {/* Pattern overlay */}
                {!!canvasBackground?.pattern?.enabled &&
                  !!patternImage && (
                    <Rect
                      x={0}
                      y={0}
                      width={canvasWidth}
                      height={canvasHeight}
                      listening={false}
                      opacity={Number(
                        canvasBackground?.pattern?.opacity ?? 0.18
                      )}
                      fillPatternImage={patternImage}
                      fillPatternRepeat="repeat"
                      fillPatternScale={{
                        x: Number(
                          canvasBackground?.pattern?.scale ?? 1
                        ),
                        y: Number(
                          canvasBackground?.pattern?.scale ?? 1
                        ),
                      }}
                    />
                  )}

                {/* Snap lines */}
                {snapLines.vertical.map((x, i) => (
                  <Line
                    key={`snap-v-${i}`}
                    points={[x, 0, x, canvasHeight]}
                    stroke="#FF6B6B"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ))}
                {snapLines.horizontal.map((y, i) => (
                  <Line
                    key={`snap-h-${i}`}
                    points={[0, y, canvasWidth, y]}
                    stroke="#FF6B6B"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ))}

                {/* Persistent guides (cyan) */}
                {guides.vertical.map((x, i) => (
                  <Line
                    key={`guide-v-${i}`}
                    points={[x, 0, x, canvasHeight]}
                    stroke="#00CED1"
                    strokeWidth={1}
                    dash={[6, 3]}
                    listening={false}
                  />
                ))}
                {guides.horizontal.map((y, i) => (
                  <Line
                    key={`guide-h-${i}`}
                    points={[0, y, canvasWidth, y]}
                    stroke="#00CED1"
                    strokeWidth={1}
                    dash={[6, 3]}
                    listening={false}
                  />
                ))}

                {/* Dragging guide preview */}
                {draggingGuide && (
                  <Line
                    points={
                      draggingGuide.axis === "horizontal"
                        ? [0, draggingGuide.pos, canvasWidth, draggingGuide.pos]
                        : [draggingGuide.pos, 0, draggingGuide.pos, canvasHeight]
                    }
                    stroke="#00CED1"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                )}

                {/* Cursor crosshair */}
                {cursorDoc && !isPreview && (
                  <>
                    <Line
                      points={[
                        cursorDoc.x,
                        0,
                        cursorDoc.x,
                        canvasHeight,
                      ]}
                      stroke="rgba(0, 150, 255, 0.3)"
                      strokeWidth={1}
                      listening={false}
                    />
                    <Line
                      points={[
                        0,
                        cursorDoc.y,
                        canvasWidth,
                        cursorDoc.y,
                      ]}
                      stroke="rgba(0, 150, 255, 0.3)"
                      strokeWidth={1}
                      listening={false}
                    />
                  </>
                )}

                {/* Elements */}
                {elements.map((el) => {
                  if (el.visible === false) return null;

                  const canDrag = !isPreview && !isEditingText && isDraggableTool && !el.locked;
                  const canSelect = isDraggableTool && !isPreview && !isEditingText && !el.locked;

                  if (el.type === "logo") {
                    return (
                      <LogoNode
                        key={el.id}
                        el={el}
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        isEditing={textEditor?.id === el.id}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDblClick={() =>
                          !isPreview && startTextEditing(el)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
                        onDragMove={(e) => snapDragMove(el, e)}
                        onDragEnd={() => clearSnapLines()}
                      />
                    );
                  }

                  if (el.type === "qr_placeholder") {
                    return (
                      <Group key={el.id}>
                        <Rect
                          id={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width || 100}
                          height={el.height || 100}
                          fill="#FFFFFF"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          dash={[6, 4]}
                          cornerRadius={4}
                          opacity={el.opacity ?? 1}
                          draggable={canDrag}
                          visible={el.visible !== false}
                          listening={!el.locked}
                          onClick={() =>
                            canSelect && setSelectedId(el.id)
                          }
                          onTap={() =>
                            canSelect && setSelectedId(el.id)
                          }
                          onDragStart={(e) =>
                            handleElementDragStart(el, e)
                          }
                          onDragMove={(e) =>
                            snapDragMove(el, e)
                          }
                          onDragEnd={(e) => {
                            updateElement(el.id, {
                              x: e.target.x(),
                              y: e.target.y(),
                            });
                            clearSnapLines();
                          }}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(el.id, {
                              x: node.x(),
                              y: node.y(),
                              width: node.width() * scaleX,
                              height: node.height() * scaleY,
                            });
                          }}
                        />
                        <Text
                          x={el.x}
                          y={
                            el.y + (el.height || 100) / 2 - 8
                          }
                          width={el.width || 100}
                          text="QR"
                          fontSize={16}
                          fontStyle="bold"
                          fill="#94A3B8"
                          align="center"
                          listening={false}
                        />
                      </Group>
                    );
                  }

                  if (
                    el.type === "shape_rect" ||
                    el.type === "shape_roundrect" ||
                    el.type === "shape_frame"
                  ) {
                    return (
                      <ShapeRectNode
                        key={el.id}
                        el={el}
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
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
                        draggable={canDrag}
                        onSelect={() =>
                          canSelect && setSelectedId(el.id)
                        }
                        onChange={(patch) =>
                          updateElement(el.id, patch)
                        }
                        onDragStart={(e) =>
                          handleElementDragStart(el, e)
                        }
                        onDragMove={(e) => snapDragMove(el, e)}
                        onDragEnd={() => clearSnapLines()}
                      />
                    );
                  }

                  return null;
                })}

                {/* Transformer */}
                {!isPreview && !isEditingText && tool === "select" && (
                  <Transformer
                    ref={trRef}
                    rotateEnabled
                    padding={0}
                    ignoreStroke
                    enabledAnchors={[
                      "top-left",
                      "top-center",
                      "top-right",
                      "middle-left",
                      "middle-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ]}
                    boundBoxFunc={(_oldBox, newBox) => ({
                      ...newBox,
                      width: Math.max(5, newBox.width),
                      height: Math.max(5, newBox.height),
                    })}
                  />
                )}
              </Layer>
            </Stage>

            {/* Text edit overlay */}
            {!isPreview && textEditor && <TextEditOverlay />}
          </div>
        </div>
      </div>
    </div>
  );
}
