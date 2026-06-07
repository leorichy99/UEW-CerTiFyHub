import { useEffect } from "react";

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — UEW CerTiFyHub` : "UEW CerTiFyHub";
  }, [title]);
}
