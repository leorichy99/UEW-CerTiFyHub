/**
 * Re-export wrapper — the editor has been decomposed into modular files
 * under ./editor/. This file exists solely to preserve the existing import
 * path (lazy(() => import("../components/TemplateEditor"))).
 */
export { default } from "./editor/TemplateEditor";
