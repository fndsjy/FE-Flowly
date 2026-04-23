import type { ReactNode } from "react";

type DeleteConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  loadingLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const DeleteConfirmDialog = ({
  open,
  title,
  description = "Data ini akan sulit dipulihkan",
  onClose,
  onConfirm,
  isLoading = false,
  loadingLabel = "Menghapus...",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
}: DeleteConfirmDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <img
          src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
          alt="Delete Confirmation"
          className="mx-auto w-80"
        />
        <h2 className="mt-4 mb-1 text-center text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mb-4 text-center text-gray-600">{description}</p>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rose-400 px-4 py-2 text-base font-semibold text-rose-400 transition hover:bg-rose-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg bg-rose-400 px-4 py-2 text-base font-semibold text-white transition hover:bg-rose-500 ${
              isLoading ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
