interface Props {
  message: string | null;
  onClose: () => void;
}

/**
 * Popup de error centrado con overlay, en vez del banner inline anterior.
 * Se muestra, por ejemplo, cuando CardPointe rechaza la tarjeta
 * (ej. "Invalid card number", "Echeck not supported", fondos insuficientes, etc.).
 */
export function ErrorModal({ message, onClose }: Props) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-150 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto mb-4">
          !
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Payment Error</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-xl transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
