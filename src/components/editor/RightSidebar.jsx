import React, { useState } from "react";
import {
  ChevronDown,
  Trash2,
  MousePointer2,
  ArrowUpRight,
  UploadCloud,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Sliders,
  Image,
  Square,
  Circle as CircleIcon,
} from "lucide-react";
import { useEditor } from "./EditorContext";
import { CANVAS_PRESETS, DYNAMIC_FIELDS, BUNDLED_FONTS, THEME } from "./constants";

const TABS = [
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "properties", label: "Props", Icon: Sliders },
  { id: "assets", label: "Assets", Icon: Image },
];

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState("properties");

  return (
    <div
      className="flex flex-col select-none"
      style={{
        width: 240,
        minWidth: 240,
        background: THEME.bgPanel,
        borderLeft: `1px solid ${THEME.border}`,
      }}
    >
      {/* Tab bar */}
      <div
        className="flex"
        style={{ borderBottom: `1px solid ${THEME.border}` }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: isActive ? THEME.textBright : THEME.textMuted,
                borderBottom: isActive
                  ? `2px solid ${THEME.accent}`
                  : "2px solid transparent",
              }}
            >
              <tab.Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {activeTab === "layers" && <LayersPanel />}
        {activeTab === "properties" && <PropertiesPanel />}
        {activeTab === "assets" && <AssetsPanel />}
      </div>
    </div>
  );
}

/* ── Layers Panel ── */
function LayersPanel() {
  const {
    elements,
    selectedId,
    setSelectedId,
    updateElement,
    bringToFront,
    sendToBack,
    isPreview,
  } = useEditor();

  const reversed = [...elements].reverse();

  return (
    <div>
      <div
        className="mb-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: THEME.textMuted }}
      >
        Layer Stack
      </div>
      {reversed.length === 0 && (
        <div className="text-xs py-4 text-center" style={{ color: THEME.textMuted }}>
          No elements yet
        </div>
      )}
      {reversed.map((el) => {
        const isActive = el.id === selectedId;
        const label =
          el.type === "text"
            ? (el.text || "Text").slice(0, 20)
            : el.type === "logo"
            ? "Logo"
            : el.type === "qr_placeholder"
            ? "QR Code"
            : el.type === "image"
            ? "Image"
            : el.type.replace("shape_", "").replace(/^\w/, (c) => c.toUpperCase());
        return (
          <div
            key={el.id}
            onClick={() => !isPreview && setSelectedId(el.id)}
            className="flex items-center gap-1 rounded px-1.5 py-1 mb-0.5 cursor-pointer transition-colors"
            style={{
              background: isActive ? THEME.bgActive : "transparent",
              color: isActive ? THEME.textBright : THEME.text,
            }}
          >
            <span className="flex-1 truncate text-xs">{label}</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, { visible: el.visible === false ? true : false });
              }}
              className="p-0.5 rounded transition-colors"
              style={{ color: el.visible === false ? THEME.textMuted : THEME.text }}
              title={el.visible === false ? "Show" : "Hide"}
            >
              {el.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, { locked: !el.locked });
              }}
              className="p-0.5 rounded transition-colors"
              style={{ color: el.locked ? THEME.accent : THEME.textMuted }}
              title={el.locked ? "Unlock" : "Lock"}
            >
              {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Properties Panel ── */
function PropertiesPanel() {
  const {
    selectedElement,
    selectedId,
    updateElement,
    isPreview,
    deleteSelected,
    bringToFront,
    sendToBack,
    alignSelected,
    outlineSelectedText,
    isValidCssColor,
  } = useEditor();

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center" style={{ borderColor: THEME.borderLight }}>
        <MousePointer2 className="mb-2 h-5 w-5" style={{ color: THEME.textMuted }} />
        <div className="text-xs" style={{ color: THEME.textMuted }}>
          Select an element on the canvas
        </div>
      </div>
    );
  }

  const el = selectedElement;
  const isShape = el.type?.startsWith("shape_");
  const isText = el.type === "text";

  return (
    <div>
      {/* Alignment */}
      {!isPreview && (
        <Section label="Alignment">
          {isText ? (
            <div className="flex overflow-hidden rounded" style={{ border: `1px solid ${THEME.borderLight}` }}>
              {["left", "center", "right", "justify"].map((a) => (
                <button
                  key={a}
                  onClick={() => updateElement(selectedId, { align: a })}
                  className="flex h-7 w-1/4 items-center justify-center text-[10px] uppercase transition-colors"
                  style={{
                    background: el.align === a ? THEME.bgActive : "transparent",
                    color: el.align === a ? THEME.textBright : THEME.textMuted,
                  }}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  onClick={() => alignSelected(a)}
                  className="h-7 flex-1 rounded text-[10px] font-medium transition-colors"
                  style={{
                    background: THEME.bgInput,
                    color: THEME.text,
                    border: `1px solid ${THEME.borderLight}`,
                  }}
                >
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Shape-specific controls */}
      {el.type === "shape_polygon" && (
        <Section label="Sides">
          <RangeRow value={el.sides ?? 6} min={3} max={12} onChange={(v) => updateElement(el.id, { sides: v })} />
        </Section>
      )}

      {el.type === "shape_star" && (
        <Section label="Star">
          <div className="text-xs mb-1" style={{ color: THEME.text }}>Points: {el.points ?? 5}</div>
          <RangeRow value={el.points ?? 5} min={3} max={12} onChange={(v) => updateElement(el.id, { points: v })} />
          <div className="text-xs mb-1 mt-2" style={{ color: THEME.text }}>Inner Radius: {el.innerRadius ?? 60}</div>
          <RangeRow value={el.innerRadius ?? 60} min={5} max={200} onChange={(v) => updateElement(el.id, { innerRadius: v })} />
        </Section>
      )}

      {(el.type === "shape_arc" || el.type === "shape_wedge") && (
        <Section label="Angle">
          <RangeRow value={el.angle ?? 90} min={5} max={360} onChange={(v) => updateElement(el.id, { angle: v })} suffix="°" />
        </Section>
      )}

      {el.type === "shape_arc" && (
        <Section label="Radii">
          <div className="text-xs mb-1" style={{ color: THEME.text }}>Inner: {el.innerRadius ?? 60}</div>
          <RangeRow value={el.innerRadius ?? 60} min={5} max={300} onChange={(v) => updateElement(el.id, { innerRadius: v })} />
          <div className="text-xs mb-1 mt-2" style={{ color: THEME.text }}>Outer: {el.outerRadius ?? 110}</div>
          <RangeRow value={el.outerRadius ?? 110} min={10} max={350} onChange={(v) => updateElement(el.id, { outerRadius: v })} />
        </Section>
      )}

      {el.type === "shape_wedge" && (
        <Section label="Radius">
          <RangeRow value={el.radius ?? 110} min={10} max={400} onChange={(v) => updateElement(el.id, { radius: v })} />
        </Section>
      )}

      {el.type === "shape_spiral" && (
        <Section label="Spiral">
          <div className="text-xs mb-1" style={{ color: THEME.text }}>Turns: {el.turns ?? 4}</div>
          <RangeRow value={el.turns ?? 4} min={1} max={12} onChange={(v) => updateElement(el.id, { turns: v })} />
          <div className="text-xs mb-1 mt-2" style={{ color: THEME.text }}>Smoothness: {el.pointsPerTurn ?? 80}</div>
          <RangeRow value={el.pointsPerTurn ?? 80} min={20} max={200} onChange={(v) => updateElement(el.id, { pointsPerTurn: v })} />
        </Section>
      )}

      {el.type === "shape_path" && (
        <Section label="SVG Path">
          <textarea
            value={el.data ?? ""}
            onChange={(e) => updateElement(el.id, { data: e.target.value })}
            className="h-20 w-full resize-none rounded px-2 py-1.5 text-xs outline-none"
            style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
          />
          <div className="mt-1 text-[10px]" style={{ color: THEME.textMuted }}>
            Paste an SVG path `d` string.
          </div>
        </Section>
      )}

      {/* Fill (shapes only) */}
      {isShape && el.type !== "shape_line" && el.type !== "shape_spiral" && (
        <Section label="Fill">
          <label className="flex items-center gap-2 text-xs mb-2" style={{ color: THEME.text }}>
            <input
              type="checkbox"
              checked={(el.fill || "") === "transparent"}
              onChange={(e) => updateElement(selectedId, { fill: e.target.checked ? "transparent" : "#FFFFFF" })}
              disabled={isPreview}
            />
            No fill
          </label>
          <ColorInput
            value={el.fill === "transparent" ? "#000000" : el.fill || "#ffffff"}
            disabled={isPreview || el.fill === "transparent"}
            onChange={(v) => updateElement(selectedId, { fill: v })}
          />
        </Section>
      )}

      {/* Stroke (shapes) */}
      {isShape && (
        <Section label="Stroke">
          <ColorInput value={el.stroke || "#1E293B"} disabled={isPreview} onChange={(v) => updateElement(selectedId, { stroke: v })} />
          <div className="mt-2">
            <NumInput value={el.strokeWidth ?? 2} disabled={isPreview} onChange={(v) => updateElement(selectedId, { strokeWidth: v })} />
          </div>
        </Section>
      )}

      {/* Corner radius */}
      {(el.type === "shape_rect" || el.type === "shape_roundrect" || el.type === "shape_frame") && (
        <Section label="Corner Radius">
          <RangeRow value={el.cornerRadius ?? 0} min={0} max={80} onChange={(v) => updateElement(selectedId, { cornerRadius: v })} disabled={isPreview} />
        </Section>
      )}

      {/* Line length */}
      {el.type === "shape_line" && (
        <Section label="Length">
          <NumInput value={el.width ?? 200} disabled={isPreview} onChange={(v) => updateElement(selectedId, { width: Math.max(20, v || 20) })} />
        </Section>
      )}

      {/* Text: outline button */}
      {isText && (
        <button
          type="button"
          onClick={outlineSelectedText}
          className="mb-3 flex w-full items-center justify-center rounded py-1.5 text-xs font-medium transition-colors"
          style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
        >
          Outline Text
        </button>
      )}

      {/* Text: typography */}
      {isText && (
        <>
          <Section label="Typography">
            <select
              value={el.fontFamily}
              onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
              className="h-7 w-full rounded px-2 text-xs outline-none mb-2"
              style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}`, fontFamily: el.fontFamily }}
              disabled={isPreview}
            >
              {Object.entries(
                BUNDLED_FONTS.reduce((acc, f) => {
                  (acc[f.category] = acc[f.category] || []).push(f);
                  return acc;
                }, {})
              ).map(([cat, fonts]) => (
                <optgroup key={cat} label={cat}>
                  {fonts.map((f) => (
                    <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                      {f.family}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <NumInput
                value={Math.round(el.fontSize * 10) / 10}
                disabled={isPreview}
                onChange={(v) => updateElement(selectedId, { fontSize: Math.round(v * 10) / 10 })}
              />
              <button
                onClick={() => updateElement(selectedId, { bold: !el.bold })}
                className="h-7 w-8 rounded text-xs font-bold transition-colors"
                style={{
                  background: el.bold ? THEME.bgActive : THEME.bgInput,
                  color: el.bold ? THEME.textBright : THEME.textMuted,
                  border: `1px solid ${THEME.borderLight}`,
                }}
              >
                B
              </button>
              <button
                onClick={() => updateElement(selectedId, { italic: !el.italic })}
                className="h-7 w-8 rounded text-xs italic transition-colors"
                style={{
                  background: el.italic ? THEME.bgActive : THEME.bgInput,
                  color: el.italic ? THEME.textBright : THEME.textMuted,
                  border: `1px solid ${THEME.borderLight}`,
                }}
              >
                I
              </button>
            </div>
          </Section>

          <Section label="Color">
            <ColorInput value={el.fill} disabled={isPreview} onChange={(v) => updateElement(selectedId, { fill: v })} />
          </Section>
        </>
      )}

      {/* Opacity (shapes + text) */}
      {(isShape || isText) && (
        <Section label="Opacity">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={el.opacity ?? 1}
              onChange={(e) => updateElement(selectedId, { opacity: Number(e.target.value) })}
              className="w-full"
              disabled={isPreview}
            />
            <div className="w-10 text-right text-[10px] tabular-nums" style={{ color: THEME.textMuted }}>
              {Math.round((el.opacity ?? 1) * 100)}%
            </div>
          </div>
        </Section>
      )}

      {/* Layer order */}
      {isText && (
        <Section label="Layer">
          <div className="flex gap-1.5">
            <button
              onClick={bringToFront}
              className="h-7 flex-1 rounded text-[10px] font-medium transition-colors"
              style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
              disabled={isPreview}
            >
              Bring Front
            </button>
            <button
              onClick={sendToBack}
              className="h-7 flex-1 rounded text-[10px] font-medium transition-colors"
              style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
              disabled={isPreview}
            >
              Send Back
            </button>
          </div>
        </Section>
      )}

      {/* Delete */}
      {!isPreview && (
        <button
          type="button"
          onClick={deleteSelected}
          className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded text-[11px] font-medium transition-colors"
          style={{ background: "#3b1c1c", color: "#f87171", border: `1px solid #5c2020` }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}

/* ── Assets Panel — Background, Shapes, Fields, Static Assets ── */
function AssetsPanel() {
  const {
    isPreview,
    canvasBackground,
    setBackgroundPatch,
    setGradientPatch,
    setPatternPatch,
    isValidCssColor,
    patternInputRef,
    fileInputRef,
    addLogo,
    addShape,
    addPlaceholder,
    addQrPlaceholder,
    handleFiles,
    shapeQuery,
    setShapeQuery,
    openToolGroups,
    setOpenToolGroups,
  } = useEditor();

  return (
    <div>
      {/* Background section */}
      <CollapsibleSection
        label="Background"
        isOpen={openToolGroups.background}
        onToggle={() => setOpenToolGroups((g) => ({ ...g, background: !g.background }))}
      >
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <TabBtn
            active={canvasBackground?.kind === "solid"}
            onClick={() => setBackgroundPatch({ kind: "solid" })}
            disabled={isPreview}
          >
            Solid
          </TabBtn>
          <TabBtn
            active={canvasBackground?.kind === "gradient"}
            onClick={() => setBackgroundPatch({ kind: "gradient" })}
            disabled={isPreview}
          >
            Gradient
          </TabBtn>
        </div>

        {canvasBackground?.kind === "solid" && (
          <ColorInput
            value={isValidCssColor(canvasBackground?.color) ? canvasBackground.color : "#ffffff"}
            disabled={isPreview}
            onChange={(v) => setBackgroundPatch({ color: v })}
          />
        )}

        {canvasBackground?.kind === "gradient" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={canvasBackground?.gradient?.type || "linear"}
                onChange={(e) => setGradientPatch({ type: e.target.value })}
                disabled={isPreview}
                className="h-7 rounded px-2 text-xs outline-none"
                style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
              <div className="flex items-center gap-1 rounded px-1.5" style={{ background: THEME.bgInput, border: `1px solid ${THEME.borderLight}` }}>
                <span className="text-[10px]" style={{ color: THEME.textMuted }}>Angle</span>
                <input
                  type="number"
                  value={Number(canvasBackground?.gradient?.angle ?? 90)}
                  onChange={(e) => setGradientPatch({ angle: Number(e.target.value) })}
                  disabled={isPreview || canvasBackground?.gradient?.type !== "linear"}
                  className="h-6 w-12 rounded bg-transparent px-1 text-xs outline-none"
                  style={{ color: THEME.text }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <GradientStop
                label="Color 1"
                stops={canvasBackground?.gradient?.stops}
                index={0}
                defaultColor="#ffffff"
                disabled={isPreview}
                onChange={(stops) => setGradientPatch({ stops })}
                isValidCssColor={isValidCssColor}
              />
              <GradientStop
                label="Color 2"
                stops={canvasBackground?.gradient?.stops}
                index={1}
                defaultColor="#000000"
                disabled={isPreview}
                onChange={(stops) => setGradientPatch({ stops })}
                isValidCssColor={isValidCssColor}
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Pattern Overlays */}
      <CollapsibleSection
        label="Pattern Overlays"
        isOpen={openToolGroups.pattern}
        onToggle={() => setOpenToolGroups((g) => ({ ...g, pattern: !g.pattern }))}
      >
        <input
          ref={patternInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setPatternPatch({ enabled: true, src: String(reader.result || "") });
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
          disabled={isPreview}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <TabBtn onClick={() => patternInputRef.current?.click()} disabled={isPreview}>
            Upload
          </TabBtn>
          <TabBtn onClick={() => setPatternPatch({ enabled: false, src: "" })} disabled={isPreview}>
            None
          </TabBtn>
        </div>
        {canvasBackground?.pattern?.enabled && (
          <div className="mt-2 space-y-2">
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: THEME.textMuted }}>
              OPACITY
            </div>
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
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: THEME.textMuted }}>
              SCALE
            </div>
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
      </CollapsibleSection>

      {/* Shapes */}
      <CollapsibleSection
        label="Shapes"
        isOpen={openToolGroups.shapes}
        onToggle={() => setOpenToolGroups((g) => ({ ...g, shapes: !g.shapes }))}
      >
        <input
          value={shapeQuery}
          onChange={(e) => setShapeQuery(e.target.value)}
          placeholder="Search shapes"
          className="mb-2 h-7 w-full rounded px-2 text-xs outline-none"
          style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
          disabled={isPreview}
        />
        <div className="grid grid-cols-2 gap-1">
          {[
            { kind: "rect", label: "Rectangle", terms: ["rect", "rectangle", "box"] },
            { kind: "rounded", label: "Rounded", terms: ["rounded", "round"] },
            { kind: "frame", label: "Frame", terms: ["frame", "border"] },
            { kind: "ellipse", label: "Ellipse", terms: ["circle", "ellipse", "oval"] },
            { kind: "polygon", label: "Polygon", terms: ["polygon", "hex"] },
            { kind: "star", label: "Star", terms: ["star"] },
            { kind: "arc", label: "Arc", terms: ["arc"] },
            { kind: "pie", label: "Pie", terms: ["pie", "wedge"] },
            { kind: "spiral", label: "Spiral", terms: ["spiral"] },
            { kind: "path", label: "Path", terms: ["path", "bezier"] },
            { kind: "divider", label: "Divider", terms: ["line", "divider"] },
          ]
            .filter((s) => {
              const q = String(shapeQuery || "").trim().toLowerCase();
              if (!q) return true;
              return s.label.toLowerCase().includes(q) || s.terms.some((t) => t.includes(q));
            })
            .map((s) => (
              <div
                key={s.kind}
                draggable={!isPreview}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("application/x-template-shape", JSON.stringify({ kind: s.kind }));
                }}
                onClick={() => !isPreview && addShape(s.kind)}
                className="flex h-9 cursor-grab items-center gap-1.5 rounded px-2 text-xs transition-colors"
                style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
                title="Drag onto canvas or click to add"
              >
                <span className="truncate">{s.label}</span>
              </div>
            ))}
        </div>
      </CollapsibleSection>

      {/* Dynamic Fields */}
      <CollapsibleSection
        label="Dynamic Fields"
        isOpen={openToolGroups.fields}
        onToggle={() => setOpenToolGroups((g) => ({ ...g, fields: !g.fields }))}
      >
        {DYNAMIC_FIELDS.map((field) => (
          <button
            key={field.name}
            type="button"
            onClick={() => addPlaceholder(field.name)}
            disabled={isPreview}
            className="mb-1 flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors disabled:opacity-50"
            style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
          >
            <span>{`{${field.name}}`}</span>
            <ArrowUpRight size={12} style={{ color: THEME.textMuted }} />
          </button>
        ))}
        <button
          type="button"
          onClick={addQrPlaceholder}
          disabled={isPreview}
          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ background: "#1e3a5f", color: THEME.accent, border: `1px solid #2a4a6f` }}
        >
          <span>QR Code</span>
          <ArrowUpRight size={12} />
        </button>
      </CollapsibleSection>

      {/* Static Assets */}
      <CollapsibleSection
        label="Static Assets"
        isOpen={openToolGroups.assets}
        onToggle={() => setOpenToolGroups((g) => ({ ...g, assets: !g.assets }))}
      >
        <div
          draggable={!isPreview}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData("application/x-template-asset", JSON.stringify({ type: "logo" }));
          }}
          onClick={() => !isPreview && addLogo()}
          className="flex cursor-grab items-center gap-2 rounded px-2 py-1.5 transition-colors"
          style={{ background: THEME.bgInput, border: `1px solid ${THEME.borderLight}` }}
          title="Drag onto canvas or click to add"
        >
          <img src="/uew-logo.png" alt="UEW Logo" className="h-6 w-6 rounded object-contain" style={{ background: "#f1f5f9" }} />
          <span className="text-xs" style={{ color: THEME.text }}>University Logo</span>
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
          className="mt-1.5 flex h-7 w-full items-center justify-center rounded text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
        >
          Upload Image
        </button>
      </CollapsibleSection>
    </div>
  );
}

/* ── Reusable sub-components ── */

function Section({ label, children }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.textMuted }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ label, isOpen, onToggle, children }) {
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded px-1 py-1 transition-colors"
      >
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: THEME.textMuted }}>
          {label}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          style={{ color: THEME.textMuted }}
        />
      </button>
      {isOpen && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-7 rounded text-xs font-semibold transition-colors disabled:opacity-50"
      style={{
        background: active ? THEME.bgActive : THEME.bgInput,
        color: active ? THEME.textBright : THEME.text,
        border: `1px solid ${active ? THEME.accent : THEME.borderLight}`,
      }}
    >
      {children}
    </button>
  );
}

function ColorInput({ value, disabled, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 rounded p-0.5 cursor-pointer"
        style={{ background: THEME.bgInput, border: `1px solid ${THEME.borderLight}` }}
        disabled={disabled}
      />
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded px-2 text-xs outline-none"
        style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
        disabled={disabled}
      />
    </div>
  );
}

function NumInput({ value, disabled, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 w-full rounded px-2 text-xs outline-none"
      style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
      disabled={disabled}
    />
  );
}

function RangeRow({ value, min, max, step, onChange, suffix, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        disabled={disabled}
      />
      <div className="w-10 text-right text-[10px] tabular-nums" style={{ color: THEME.textMuted }}>
        {value}{suffix || ""}
      </div>
    </div>
  );
}

function GradientStop({ label, stops, index, defaultColor, disabled, onChange, isValidCssColor }) {
  const currentStops = stops || [];
  const color = currentStops[index]?.color || defaultColor;

  function update(newColor) {
    const next = [...currentStops];
    if (!next[index]) next[index] = { color: defaultColor, pos: index };
    next[index] = { ...next[index], color: newColor, pos: index };
    if (index === 1 && !next[0]) next[0] = { color: "#ffffff", pos: 0 };
    onChange(next);
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold tracking-widest" style={{ color: THEME.textMuted }}>
        {label}
      </div>
      <input
        type="color"
        value={isValidCssColor(color) ? color : defaultColor}
        onChange={(e) => update(e.target.value)}
        disabled={disabled}
        className="h-7 w-full rounded cursor-pointer p-0.5"
        style={{ background: THEME.bgInput, border: `1px solid ${THEME.borderLight}` }}
      />
      <input
        value={color}
        onChange={(e) => update(e.target.value)}
        disabled={disabled}
        placeholder={defaultColor}
        className="h-7 w-full rounded px-2 text-xs outline-none"
        style={{ background: THEME.bgInput, color: THEME.text, border: `1px solid ${THEME.borderLight}` }}
      />
    </div>
  );
}
