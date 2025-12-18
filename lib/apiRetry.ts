'use client';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
  isRetry?: boolean;
}

// Default retry condition - retry on network errors and 5xx server errors
const defaultRetryCondition = (error: any): boolean => {
  if (!error) return false;

  // Network errors
  if (error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.name === 'TypeError' ||
      error.code === 'NETWORK_ERROR') {
    return true;
  }

  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  return false;
};

export async function apiCallWithRetry<T = any>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<ApiResponse<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition
  } = options;

  let lastError: any;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();

      // If we get here, the call succeeded
      return {
        success: true,
        data: result,
        retryCount,
        isRetry: attempt > 0
      };
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxRetries && retryCondition(error)) {
        retryCount++;

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

        console.log(`🔄 API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error.message);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // No more retries or shouldn't retry
      break;
    }
  }

  // All attempts failed
  console.error('❌ API call failed after all retries:', lastError);

  return {
    success: false,
    error: lastError?.message || 'Unknown error occurred',
    retryCount,
    isRetry: retryCount > 0
  };
}

// Specialized retry for database operations
export async function databaseOperationWithRetry<T = any>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<ApiResponse<T>> {
  return apiCallWithRetry(operation, {
    maxRetries: 3,
    baseDelay: 1500, // Slightly longer delay for DB operations
    maxDelay: 8000,
    retryCondition: (error) => {
      // Retry on network errors and specific DB-related errors
      if (defaultRetryCondition(error)) return true;

      // Retry on connection timeouts
      if (error.message?.includes('timeout') ||
          error.message?.includes('connection') ||
          error.code === 'PGRST301' || // Supabase timeout
          error.code === 'PGRST204') { // Connection issues
        return true;
      }

      return false;
    }
  });
}

// Hook for using retry logic in React components
export function useApiRetry() {
  return {
    apiCallWithRetry,
    databaseOperationWithRetry
  };
}
