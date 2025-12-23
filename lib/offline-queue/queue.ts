'use client';

export interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string; // 'pegawai', 'customer', 'transaksi_penjualan', etc.
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  serverAction: string; // The server action function name
  optimisticData?: any; // For optimistic updates
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private readonly STORAGE_KEY = 'offline-queue';
  private readonly MAX_RETRY_COUNT = 5;
  private isProcessing = false;
  private listeners: Array<(queue: QueuedOperation[]) => void> = [];
  private isInitialized = false;

  constructor() {
    // Initialize only on client side
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.loadFromStorage();
    this.setupOnlineListener();
  }

  // Add operation to queue
  add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    if (!this.isInitialized) return '';

    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedOp: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    this.queue.push(queuedOp);
    this.saveToStorage();
    this.notifyListeners();

    console.log('📋 Added to offline queue:', queuedOp);

    // Try to process immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  // Get current queue
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  // Subscribe to queue changes
  subscribe(listener: (queue: QueuedOperation[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Process the queue
  async processQueue(): Promise<void> {
    if (!this.isInitialized) return;
    if (this.isProcessing || typeof navigator === 'undefined' || !navigator.onLine) return;

    this.isProcessing = true;
    console.log('🔄 Processing offline queue...');

    const pendingOps = this.queue.filter(op => op.status === 'pending');

    for (const operation of pendingOps) {
      await this.processOperation(operation);
    }

    this.isProcessing = false;
    this.notifyListeners();
  }

  // Process single operation
  private async processOperation(operation: QueuedOperation): Promise<void> {
    operation.status = 'processing';
    this.saveToStorage();
    this.notifyListeners();

    try {
      console.log(`⚙️ Processing operation: ${operation.id} (${operation.type} ${operation.entityType})`);

      // Since we migrated to API routes, server actions are no longer available
      // Update the operation to use API routes instead
      const apiEndpoint = `/api/master/${operation.entityType}`;
      const response = await fetch(apiEndpoint, {
        method: operation.type === 'CREATE' ? 'POST' :
                operation.type === 'UPDATE' ? 'PUT' :
                'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: operation.type === 'DELETE' ? undefined : JSON.stringify(operation.data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        operation.status = 'completed';
        console.log(`✅ Operation completed: ${operation.id}`);

        // Remove from queue after successful completion
        setTimeout(() => {
          this.removeOperation(operation.id);
        }, 1000); // Keep it visible for a moment
      } else {
        throw new Error(result.error || result.message || 'Operation failed');
      }

    } catch (error: any) {
      operation.retryCount++;
      operation.lastError = error.message;
      operation.status = operation.retryCount >= this.MAX_RETRY_COUNT ? 'failed' : 'pending';

      console.error(`❌ Operation failed: ${operation.id}`, error);

      if (operation.status === 'failed') {
        console.error(`💀 Operation permanently failed after ${operation.retryCount} retries: ${operation.id}`);
      }
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  // Remove operation from queue
  private removeOperation(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Retry failed operations
  retryFailed(): void {
    if (!this.isInitialized) return;

    const failedOps = this.queue.filter(op => op.status === 'failed');
    failedOps.forEach(op => {
      op.status = 'pending';
      op.retryCount = 0;
      op.lastError = undefined;
    });
    this.saveToStorage();
    this.notifyListeners();

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  // Clear completed operations
  clearCompleted(): void {
    this.queue = this.queue.filter(op => op.status !== 'completed');
    this.saveToStorage();
    this.notifyListeners();
  }

  // Setup online listener
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, processing offline queue...');
      setTimeout(() => this.processQueue(), 1000); // Small delay to ensure connection is stable
    });
  }

  // Load queue from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📋 Loaded ${this.queue.length} operations from storage`);
      }
    } catch (error) {
      console.error('Error loading offline queue from storage:', error);
      this.queue = [];
    }
  }

  // Save queue to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue to storage:', error);
    }
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
