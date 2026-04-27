/* eslint-disable react/prop-types */
import React from "react";
import { ZoomIn, ZoomOut, Ruler } from "lucide-react";
import { useEditor } from "./EditorContext";
import { THEME, TOOLS } from "./constants";

export default function StatusBar() {
  const {
    tool,
    cursorDoc,
    canvasWidth,
    canvasHeight,
    zoom,
    setZoom,
    showRulers,
    setShowRulers,
  } = useEditor();

  const toolMeta = TOOLS.find((t) => t.id === tool);

  return (
    <div
      className="flex items-center justify-between px-3 select-none text-xs"
      style={{
        height: 24,
        minHeight: 24,
        background: THEME.bgPanel,
        borderTop: `1px solid ${THEME.border}`,
        color: THEME.textMuted,
      }}
    >
      {/* Left: tool name */}
      <div className="flex items-center gap-3" style={{ minWidth: 120 }}>
        <span>{toolMeta?.label || tool}</span>
      </div>

      {/* Center: cursor position */}
      <div className="flex items-center gap-3">
        {cursorDoc ? (
          <span>
            X: {Math.round(cursorDoc.x)} &nbsp; Y: {Math.round(cursorDoc.y)}
          </span>
        ) : (
          <span>X: — &nbsp; Y: —</span>
        )}
      </div>

      {/* Right: dimensions, zoom, rulers */}
      <div className="flex items-center gap-2" style={{ minWidth: 200, justifyContent: "flex-end" }}>
        <span>{canvasWidth} × {canvasHeight}</span>

        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.2, Math.round((z / 1.1) * 100) / 100))}
            className="p-0.5 rounded transition-colors"
            style={{ color: THEME.textMuted }}
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <span className="w-10 text-center" style={{ color: THEME.text }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, Math.round(z * 1.1 * 100) / 100))}
            className="p-0.5 rounded transition-colors"
            style={{ color: THEME.textMuted }}
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
        </div>

        <button
          onClick={() => setShowRulers((v) => !v)}
          className="p-0.5 rounded transition-colors ml-1"
          style={{
            color: showRulers ? THEME.accent : THEME.textMuted,
          }}
          title={showRulers ? "Hide Rulers" : "Show Rulers"}
        >
          <Ruler size={12} />
        </button>
      </div>
    </div>
  );
}
