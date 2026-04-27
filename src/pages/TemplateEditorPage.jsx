import React, { Suspense, lazy, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../components/ToastContainer";
import { templateAPI } from "../services/api";

const TemplateEditor = lazy(() => import("../components/TemplateEditor"));

export default function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const returnTo = location.state?.returnTo || "/templates";

  useEffect(() => {
    if (!id || id === "new") {
      setTemplate(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    templateAPI
      .getOne(id)
      .then(({ data }) => {
        if (!cancelled) setTemplate(data);
      })
      .catch((err) => {
        console.error("Failed to load template:", err);
        if (!cancelled) toast.error("Failed to load template");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async (templateData) => {
    const prevVersion = Number(template?.metadata?.version ?? 1);
    const nextVersion = template?.id
      ? Math.round((prevVersion + 0.1) * 10) / 10
      : 1;

    const payload = {
      name:
        templateData?.title || template?.name || `Template ${Date.now()}`,
      canvas_width: templateData?.canvas?.width,
      canvas_height: templateData?.canvas?.height,
      metadata: {
        ...(templateData || {}),
        version: nextVersion,
      },
    };

    if (template?.id) {
      const { data } = await templateAPI.update(template.id, payload);
      setTemplate(data);
      toast.success("Template saved");
    } else {
      const { data } = await templateAPI.create(payload);
      setTemplate(data);
      toast.success("Template created");
      // Redirect to the edit URL so subsequent saves update instead of creating duplicates
      navigate(`/templates/${data.id}/edit`, {
        replace: true,
        state: { ...location.state, returnTo },
      });
    }
  };

  const handleClose = () => {
    navigate(returnTo);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <span className="text-sm text-slate-500">Loading editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              <span className="text-sm text-slate-500">Loading editor...</span>
            </div>
          </div>
        }
      >
        <TemplateEditor
          initialData={template}
          onSave={handleSave}
          onClose={handleClose}
          toast={toast}
        />
      </Suspense>
    </div>
  );
}
