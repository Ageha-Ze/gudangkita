"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Terjadi Kesalahan
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Maaf, terdapat kesalahan pada sistem. Silakan coba lagi atau kembali ke halaman utama.
        </p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Detail Error (Development):</h3>
            <pre className="text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
