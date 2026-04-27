/* eslint-disable react/prop-types */
import React from "react";
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Minus,
  Pipette,
  Hand,
  ZoomIn,
} from "lucide-react";
import { useEditor } from "./EditorContext";
import { THEME } from "./constants";

const TOOL_GROUPS = [
  [
    { id: "select", icon: MousePointer2, label: "Move (V)", shortcut: "V" },
  ],
  [
    { id: "text", icon: Type, label: "Text (T)", shortcut: "T" },
  ],
  [
    { id: "rect", icon: Square, label: "Rectangle (R)", shortcut: "R" },
    { id: "ellipse", icon: Circle, label: "Ellipse (E)", shortcut: "E" },
    { id: "line", icon: Minus, label: "Line (L)", shortcut: "L" },
  ],
  [
    { id: "eyedropper", icon: Pipette, label: "Eyedropper (I)", shortcut: "I" },
  ],
  [
    { id: "pan", icon: Hand, label: "Hand (Space)", shortcut: "Space" },
    { id: "zoom", icon: ZoomIn, label: "Zoom (Z)", shortcut: "Z" },
  ],
];

export default function LeftToolbar() {
  const { tool, setTool, foregroundColor } = useEditor();

  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 select-none"
      style={{
        width: 40,
        minWidth: 40,
        background: THEME.bgPanel,
        borderRight: `1px solid ${THEME.border}`,
      }}
    >
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <div
              className="w-6 my-1"
              style={{ height: 1, background: THEME.borderLight }}
            />
          )}
          {group.map((t) => {
            const Icon = t.icon;
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                title={t.label}
                onClick={() => setTool(t.id)}
                className="flex items-center justify-center rounded transition-colors"
                style={{
                  width: 30,
                  height: 30,
                  background: isActive ? THEME.bgActive : "transparent",
                  color: isActive ? THEME.textBright : THEME.text,
                }}
              >
                <Icon size={16} strokeWidth={1.5} />
              </button>
            );
          })}
        </React.Fragment>
      ))}

      {/* Foreground color swatch */}
      <div className="mt-auto mb-1 flex flex-col items-center gap-1">
        <div
          className="w-5 h-5 rounded border"
          style={{
            background: foregroundColor,
            borderColor: THEME.borderLight,
          }}
          title={`Foreground: ${foregroundColor}`}
        />
      </div>
    </div>
  );
}
