/* eslint-disable react/prop-types */
import React from "react";
import { useEditor } from "./EditorContext";
import { DYNAMIC_FIELDS, THEME } from "./constants";

export default function TextEditOverlay() {
  const {
    textEditor,
    setTextEditor,
    textAreaRef,
    mentionDropdown,
    setMentionDropdown,
    commitTextEditing,
    cancelTextEditing,
  } = useEditor();

  if (!textEditor) return null;

  return (
    <>
      {/* Pill highlight overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          zIndex: 9,
          top: textEditor.top,
          left: textEditor.left,
          minWidth: textEditor.minWidth,
          maxWidth: textEditor.maxWidth,
          minHeight: textEditor.minHeight,
          fontSize: textEditor.fontSize,
          fontFamily: textEditor.fontFamily,
          fontWeight: textEditor.bold ? 700 : 400,
          fontStyle: textEditor.italic ? "italic" : "normal",
          lineHeight: textEditor.lineHeight || 1.2,
          padding: 0,
          margin: 0,
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          border: "2px solid transparent",
          pointerEvents: "none",
          color: "transparent",
          overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{
          __html: (textEditor.value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(
              /\{(\w+)\}/g,
              '<span style="background:#DBEAFE;color:#1D4ED8;border-radius:3px;padding:0 2px;font-size:inherit">&#123;$1&#125;</span>'
            ),
        }}
      />

      {/* Textarea */}
      <textarea
        ref={textAreaRef}
        value={textEditor.value}
        rows={1}
        onChange={(e) => {
          const val = e.target.value;
          setTextEditor((t) => (t ? { ...t, value: val } : t));
          const ta = e.target;
          ta.style.height = "auto";
          ta.style.width = "auto";
          ta.style.height = ta.scrollHeight + "px";
          ta.style.width =
            Math.min(ta.scrollWidth + 2, textEditor.maxWidth || 9999) + "px";
          const cursor = ta.selectionStart;
          const before = val.slice(0, cursor);
          const atMatch = before.match(/@(\w*)$/);
          if (atMatch) {
            setMentionDropdown({
              query: atMatch[1],
              startIndex: cursor - atMatch[0].length,
            });
          } else {
            setMentionDropdown(null);
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            setMentionDropdown(null);
            commitTextEditing();
          }, 150);
        }}
        onKeyDown={(e) => {
          if (mentionDropdown) {
            const filtered = DYNAMIC_FIELDS.filter((f) =>
              f.name
                .toLowerCase()
                .includes((mentionDropdown.query || "").toLowerCase())
            );
            if (e.key === "Enter" || e.key === "Tab") {
              if (filtered.length > 0) {
                e.preventDefault();
                const field = filtered[0];
                const before = textEditor.value.slice(
                  0,
                  mentionDropdown.startIndex
                );
                const after = textEditor.value.slice(
                  textAreaRef.current?.selectionStart ||
                    mentionDropdown.startIndex
                );
                const newVal = before + `{${field.name}}` + after;
                setTextEditor((t) => (t ? { ...t, value: newVal } : t));
                setMentionDropdown(null);
                setTimeout(() => {
                  const pos = before.length + field.name.length + 2;
                  textAreaRef.current?.setSelectionRange(pos, pos);
                }, 0);
                return;
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setMentionDropdown(null);
              return;
            }
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelTextEditing();
          }
          if (e.key === "Enter" && !e.shiftKey && !mentionDropdown) {
            e.preventDefault();
            commitTextEditing();
          }
        }}
        style={{
          position: "absolute",
          zIndex: 10,
          top: textEditor.top,
          left: textEditor.left,
          minWidth: textEditor.minWidth,
          maxWidth: textEditor.maxWidth,
          minHeight: textEditor.minHeight,
          fontSize: textEditor.fontSize,
          fontFamily: textEditor.fontFamily,
          fontWeight: textEditor.bold ? 700 : 400,
          fontStyle: textEditor.italic ? "italic" : "normal",
          color: textEditor.fill,
          textAlign: textEditor.align,
          lineHeight: textEditor.lineHeight || 1.2,
          background: "transparent",
          border: `2px solid ${THEME.accent}`,
          borderRadius: 2,
          outline: "none",
          padding: 0,
          margin: 0,
          resize: "none",
          overflow: "hidden",
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          caretColor: THEME.accent,
        }}
      />

      {/* @mention dropdown */}
      {mentionDropdown &&
        (() => {
          const filtered = DYNAMIC_FIELDS.filter((f) =>
            f.name
              .toLowerCase()
              .includes((mentionDropdown.query || "").toLowerCase())
          );
          if (!filtered.length) return null;
          return (
            <div
              style={{
                position: "absolute",
                zIndex: 20,
                top:
                  (textEditor.top || 0) +
                  (textEditor.minHeight || 28) +
                  4,
                left: textEditor.left || 0,
                minWidth: 180,
                background: THEME.bgPanel,
                border: `1px solid ${THEME.borderLight}`,
                borderRadius: 6,
              }}
              className="py-1 shadow-lg"
            >
              {filtered.map((field) => (
                <button
                  key={field.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const before = textEditor.value.slice(
                      0,
                      mentionDropdown.startIndex
                    );
                    const after = textEditor.value.slice(
                      textAreaRef.current?.selectionStart ||
                        mentionDropdown.startIndex
                    );
                    const newVal =
                      before + `{${field.name}}` + after;
                    setTextEditor((t) =>
                      t ? { ...t, value: newVal } : t
                    );
                    setMentionDropdown(null);
                    setTimeout(() => {
                      const pos =
                        before.length + field.name.length + 2;
                      textAreaRef.current?.focus();
                      textAreaRef.current?.setSelectionRange(
                        pos,
                        pos
                      );
                    }, 0);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                  style={{ color: THEME.text }}
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: "#1e3a5f",
                      color: THEME.accent,
                    }}
                  >
                    {`{${field.name}}`}
                  </span>
                  <span style={{ color: THEME.textMuted, fontSize: 11 }}>
                    {field.label}
                  </span>
                </button>
              ))}
            </div>
          );
        })()}
    </>
  );
}
