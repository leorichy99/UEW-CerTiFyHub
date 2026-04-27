import { Toaster, toast as hotToast } from 'react-hot-toast';

// Export a small `useToast`-like wrapper so existing pages using
// `useToast()` continue to work with the same API: `success`, `error`, `warning`, `info`.
export const useToast = () => {
  return {
    success: (message, opts) => hotToast.success(message, { id: message, ...opts }),
    error: (message, opts) => hotToast.error(message, { id: message, ...opts }),
    warning: (message, opts) => hotToast(message, { icon: '⚠️', id: message, ...opts }),
    info: (message, opts) => hotToast(message, { id: message, ...opts }),
    // direct access to full API when needed
    raw: hotToast,
  };
};

// ToastProvider mounts a single Toaster for the app root. Keep the
// component name `ToastProvider` so it can replace previous provider usage.
export const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster position="right-bottom" toastOptions={{ duration: 3000 }} />
    </>
  );
};

export default useToast;
