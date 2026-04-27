/* eslint-disable react/prop-types */
import React from "react";
import {
  Pencil,
  Eye,
  SaveAll,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
} from "lucide-react";
import { useEditor } from "./EditorContext";
import { CANVAS_PRESETS, BUNDLED_FONTS, THEME } from "./constants";

export default function TopControlBar() {
  const {
    canvasPresetId,
    switchPreset,
    templateTitle,
    setTemplateTitle,
    editingTitle,
    setEditingTitle,
    isPreview,
    selectedElement,
    selectedId,
    updateElement,
    canUndo,
    canRedo,
    undo,
    redo,
    isSaving,
    publishTemplate,
    stageRef,
    setSelectedId,
    setPreviewImage,
    setShowPreviewModal,
    onClose,
  } = useEditor();

  return (
    <div
      className="flex items-center justify-between px-3 select-none"
      style={{
        height: 40,
        minHeight: 40,
        background: THEME.bg,
        borderBottom: `1px solid ${THEME.border}`,
      }}
    >
      {/* Left: branding + preset + title */}
      <div className="flex items-center gap-2.5">
        <span
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: THEME.textBright }}
        >
          CerTiFyHub
        </span>

        <div className="h-4 w-px" style={{ background: THEME.borderLight }} />

        <select
          value={canvasPresetId}
          onChange={(e) => switchPreset(e.target.value)}
          disabled={isPreview}
          className="h-7 rounded px-2 pr-6 text-xs font-medium outline-none"
          style={{
            background: THEME.bgInput,
            color: THEME.text,
            border: `1px solid ${THEME.borderLight}`,
          }}
        >
          {CANVAS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="h-4 w-px" style={{ background: THEME.borderLight }} />

        {editingTitle ? (
          <input
            autoFocus
            value={templateTitle}
            onChange={(e) => setTemplateTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingTitle(false);
            }}
            className="h-7 w-48 rounded px-2 text-xs font-medium outline-none"
            style={{
              background: THEME.bgInput,
              color: THEME.textBright,
              border: `1px solid ${THEME.accent}`,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="group flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors"
            style={{ color: THEME.text }}
          >
            <span className="max-w-48 truncate">{templateTitle}</span>
            <Pencil
              className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-80"
              style={{ color: THEME.textMuted }}
            />
          </button>
        )}
      </div>

      {/* Center: contextual controls */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo always visible */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded p-1.5 transition-colors disabled:opacity-30"
          style={{ color: THEME.textMuted }}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded p-1.5 transition-colors disabled:opacity-30"
          style={{ color: THEME.textMuted }}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={14} />
        </button>

        {/* Text-specific controls */}
        {selectedElement?.type === "text" && !isPreview && (
          <>
            <div
              className="mx-1 h-4 w-px"
              style={{ background: THEME.borderLight }}
            />

            <select
              value={selectedElement.fontFamily}
              onChange={(e) =>
                updateElement(selectedId, { fontFamily: e.target.value })
              }
              className="h-7 rounded px-1.5 text-xs outline-none"
              style={{
                background: THEME.bgInput,
                color: THEME.text,
                border: `1px solid ${THEME.borderLight}`,
                fontFamily: selectedElement.fontFamily,
                maxWidth: 120,
              }}
            >
              {Object.entries(
                BUNDLED_FONTS.reduce((acc, f) => {
                  (acc[f.category] = acc[f.category] || []).push(f);
                  return acc;
                }, {})
              ).map(([cat, fonts]) => (
                <optgroup key={cat} label={cat}>
                  {fonts.map((f) => (
                    <option
                      key={f.family}
                      value={f.family}
                      style={{ fontFamily: f.family }}
                    >
                      {f.family}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <input
              type="number"
              step={
                Number.isInteger(selectedElement.fontSize) ? 1 : 0.1
              }
              value={
                Math.round(selectedElement.fontSize * 10) / 10
              }
              onChange={(e) =>
                updateElement(selectedId, {
                  fontSize:
                    Math.round(Number(e.target.value) * 10) / 10,
                })
              }
              className="h-7 w-14 rounded px-1.5 text-xs outline-none"
              style={{
                background: THEME.bgInput,
                color: THEME.text,
                border: `1px solid ${THEME.borderLight}`,
              }}
            />

            <button
              onClick={() =>
                updateElement(selectedId, {
                  bold: !selectedElement.bold,
                })
              }
              className="rounded p-1.5 transition-colors"
              style={{
                background: selectedElement.bold
                  ? THEME.bgActive
                  : "transparent",
                color: selectedElement.bold
                  ? THEME.textBright
                  : THEME.textMuted,
              }}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() =>
                updateElement(selectedId, {
                  italic: !selectedElement.italic,
                })
              }
              className="rounded p-1.5 transition-colors"
              style={{
                background: selectedElement.italic
                  ? THEME.bgActive
                  : "transparent",
                color: selectedElement.italic
                  ? THEME.textBright
                  : THEME.textMuted,
              }}
              title="Italic"
            >
              <Italic size={13} />
            </button>

            <div
              className="mx-0.5 h-4 w-px"
              style={{ background: THEME.borderLight }}
            />

            {[
              { align: "left", Icon: AlignLeft },
              { align: "center", Icon: AlignCenter },
              { align: "right", Icon: AlignRight },
              { align: "justify", Icon: AlignJustify },
            ].map(({ align, Icon }) => (
              <button
                key={align}
                onClick={() =>
                  updateElement(selectedId, { align })
                }
                className="rounded p-1 transition-colors"
                style={{
                  background:
                    selectedElement.align === align
                      ? THEME.bgActive
                      : "transparent",
                  color:
                    selectedElement.align === align
                      ? THEME.textBright
                      : THEME.textMuted,
                }}
                title={`Align ${align}`}
              >
                <Icon size={13} />
              </button>
            ))}
          </>
        )}
      </div>

      {/* Right: preview, save, exit */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const stage = stageRef.current;
            if (stage) {
              setSelectedId(null);
              setTimeout(() => {
                const dataUrl = stage.toDataURL({ pixelRatio: 2 });
                setPreviewImage(dataUrl);
                setShowPreviewModal(true);
              }, 50);
            }
          }}
          className="flex h-7 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors"
          style={{
            background: THEME.bgInput,
            color: THEME.text,
            border: `1px solid ${THEME.borderLight}`,
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>

        <button
          type="button"
          onClick={publishTemplate}
          disabled={isSaving}
          className="flex h-7 items-center gap-1.5 rounded px-3.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          style={{
            background: THEME.accent,
            color: THEME.textBright,
          }}
        >
          {isSaving ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <SaveAll className="h-3.5 w-3.5" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </button>

        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 items-center rounded px-3 text-xs font-medium transition-colors"
            style={{
              background: THEME.bgInput,
              color: THEME.text,
              border: `1px solid ${THEME.borderLight}`,
            }}
          >
            Exit
          </button>
        )}
      </div>
    </div>
  );
}
