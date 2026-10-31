import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl max-h-[90vh] overflow-auto w-full ${wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
          <h3 className="text-lg font-extrabold text-ink">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-primaryLight">
            <X size={18} className="text-inkSoft" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}