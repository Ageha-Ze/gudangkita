'use client';

import { useState, useEffect } from 'react';
import { QueuedOperation, offlineQueue } from '@/lib/offline-queue/queue';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function OfflineQueueIndicator() {
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe((newQueue) => {
      setQueue(newQueue);
    });

    // Initial load
    setQueue(offlineQueue.getQueue());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const getStatusIcon = (status: QueuedOperation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: QueuedOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatOperationType = (type: string) => {
    const typeMap: Record<string, string> = {
      pegawai: 'Pegawai',
      customer: 'Customer',
      cabang: 'Cabang',
      kas: 'Kas',
      produk: 'Produk',
      supplier: 'Supplier',
      transaksi_penjualan: 'Penjualan',
      transaksi_pembelian: 'Pembelian'
    };
    return typeMap[type] || type;
  };

  const formatActionType = (type: QueuedOperation['type']) => {
    switch (type) {
      case 'CREATE':
        return 'Tambah';
      case 'UPDATE':
        return 'Update';
      case 'DELETE':
        return 'Hapus';
      default:
        return type;
    }
  };

  const hasFailedOperations = queue.some(op => op.status === 'failed');
  const hasPendingOperations = queue.some(op => op.status === 'pending');
  const processingCount = queue.filter(op => op.status === 'processing').length;

  // Don't show if queue is empty and online
  if (queue.length === 0 && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Main Indicator */}
      <div
        className={`bg-white border rounded-lg shadow-lg cursor-pointer transition-all duration-200 ${
          isExpanded ? 'w-80' : 'w-auto'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center p-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {queue.length > 0 && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    {queue.length} pending
                  </span>
                )}
              </div>

              {!isExpanded && queue.length > 0 && (
                <div className="text-xs text-gray-500">
                  {processingCount > 0 && `${processingCount} processing, `}
                  {hasPendingOperations && 'waiting for connection...'}
                </div>
              )}
            </div>
          </div>

          {hasFailedOperations && (
            <AlertTriangle className="w-4 h-4 text-red-500 ml-auto animate-pulse" />
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t max-h-60 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {isOnline ? 'No pending operations' : 'Operations will be queued while offline'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {queue.map((operation) => (
                  <div
                    key={operation.id}
                    className={`flex items-center gap-2 p-2 rounded border text-sm ${getStatusColor(operation.status)}`}
                  >
                    {getStatusIcon(operation.status)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {formatActionType(operation.type)} {formatOperationType(operation.entityType)}
                      </div>
                      {operation.lastError && (
                        <div className="text-xs text-red-600 truncate">
                          {operation.lastError}
                        </div>
                      )}
                      <div className="text-xs opacity-75">
                        {new Date(operation.timestamp).toLocaleString('id-ID')}
                        {operation.retryCount > 0 && ` • Retry ${operation.retryCount}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {queue.length > 0 && (
              <div className="border-t p-2 flex gap-2">
                {hasFailedOperations && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      offlineQueue.retryFailed();
                    }}
                    className="flex-1 bg-red-500 text-white text-sm py-1 px-3 rounded hover:bg-red-600 transition-colors"
                  >
                    Retry Failed
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    offlineQueue.clearCompleted();
                  }}
                  className="flex-1 bg-gray-500 text-white text-sm py-1 px-3 rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Completed
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
