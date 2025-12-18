// components/ConnectionHandler.tsx
'use client';

import { useState, useEffect } from 'react';
import { useConnectionHandler } from '@/hooks/useConnectionHandler';
import { WifiOff, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConnectionHandler() {
  const { isOnline, showOfflineModal, setShowOfflineModal } = useConnectionHandler();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!showOfflineModal) {
      setConnectionAttempts(0);
      setLastError(null);
    }
  }, [showOfflineModal]);

  // Enhanced error detection
  useEffect(() => {
    const handleFetchError = (event: any) => {
      if (event.detail?.error) {
        setLastError(event.detail.error.message || 'Network request failed');
        setConnectionAttempts(prev => prev + 1);
      }
    };

    window.addEventListener('fetch-error', handleFetchError);
    return () => window.removeEventListener('fetch-error', handleFetchError);
  }, []);

  const getConnectionMessage = () => {
    if (isOnline) return 'Koneksi internet telah pulih';

    if (connectionAttempts === 0) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    } else if (connectionAttempts < 3) {
      return 'Masih mencoba menyambungkan ke server...';
    } else {
      return 'Koneksi bermasalah. Operasi akan dicoba otomatis ketika koneksi pulih.';
    }
  };

  const getErrorDetails = () => {
    if (!lastError) return null;

    if (lastError.includes('fetch') || lastError.includes('network')) {
      return 'Masalah koneksi jaringan - tidak dapat mengakses server';
    }
    if (lastError.includes('timeout')) {
      return 'Permintaan waktu habis - server terlalu lama merespons';
    }
    if (lastError.includes('500') || lastError.includes('502') || lastError.includes('503')) {
      return 'Server mengalami masalah - coba lagi nanti';
    }

    return lastError;
  };

  if (!showOfflineModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isOnline ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isOnline ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isOnline ? 'Koneksi Pulih!' : 'Masalah Koneksi'}
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-4">
          {getConnectionMessage()}
        </p>

        {/* Error Details */}
        {getErrorDetails() && !isOnline && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <div className="font-medium mb-1">Detail Masalah:</div>
                <div>{getErrorDetails()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status Koneksi</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Terhubung' : 'Terputus'}
              </span>
            </div>
          </div>

          {connectionAttempts > 0 && !isOnline && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>Percobaan koneksi: {connectionAttempts}</span>
            </div>
          )}
        </div>

        {/* Offline Features Info */}
        {!isOnline && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">💡 Fitur Offline:</div>
              <ul className="text-xs space-y-1 ml-4">
                <li>• Operasi akan disimpan dan dikirim otomatis saat koneksi pulih</li>
                <li>• Progress tersimpan di indikator offline (pojok kanan bawah)</li>
                <li>• Data tetap aman dan tidak hilang</li>
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isOnline ? (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Lanjutkan
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  // Try to reconnect
                  window.location.reload();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </button>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Lanjut Offline
              </button>
            </>
          )}
        </div>

        {/* Auto-reconnect info */}
        {isOnline && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              ✓ Semua operasi pending akan diproses otomatis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
