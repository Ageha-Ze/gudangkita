'use client';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemValue: string;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemValue,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="w-16 h-16 border-4 border-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-orange-400 text-3xl font-bold">!</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Anda yakin?</h3>
        <p className="text-gray-600 mb-6">
          Anda yakin ingin menghapus {itemName} &quot;{itemValue}&quot;?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition"
          >
            Ya, Hapus!
          </button>
        </div>
      </div>
    </div>
  );
}