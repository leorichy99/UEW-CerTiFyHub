/* eslint-disable react/prop-types */
import React from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { THEME } from "./constants";
import TopControlBar from "./TopControlBar";
import LeftToolbar from "./LeftToolbar";
import Canvas from "./Canvas";
import RightSidebar from "./RightSidebar";
import StatusBar from "./StatusBar";

function PreviewModal() {
  const { showPreviewModal, setShowPreviewModal, previewImage, setPreviewImage } = useEditor();

  if (!showPreviewModal || !previewImage) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        setShowPreviewModal(false);
        setPreviewImage(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowPreviewModal(false);
          setPreviewImage(null);
        }
      }}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={previewImage}
          alt="Template preview"
          className="max-h-[80vh] object-contain shadow-sm"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}

function EditorLayout() {
  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden"
      style={{ background: THEME.bg, color: THEME.text }}
    >
      <TopControlBar />

      <div className="flex flex-1 overflow-hidden">
        <LeftToolbar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Canvas />
          <StatusBar />
        </div>

        <RightSidebar />
      </div>

      <PreviewModal />
    </div>
  );
}

export default function NewTemplateEditor({ initialData, onSave, onClose, toast }) {
  return (
    <EditorProvider initialData={initialData} onSave={onSave} onClose={onClose} toast={toast}>
      <EditorLayout />
    </EditorProvider>
  );
}
