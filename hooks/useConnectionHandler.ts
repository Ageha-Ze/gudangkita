// hooks/useConnectionHandler.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useConnectionHandler() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check initial connection status
    setIsOnline(navigator.onLine);

    // Handle online event
    const handleOnline = () => {
      console.log('🟢 Connection restored');
      setIsOnline(true);
      setShowOfflineModal(false);
      
      // Refresh the page to reload data
      router.refresh();
    };

    // Handle offline event
    const handleOffline = () => {
      console.log('🔴 Connection lost');
      setIsOnline(false);
      setShowOfflineModal(true);
    };

    // Handle network errors in fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // If response is ok, connection is working
        if (response.ok || response.status < 500) {
          if (!isOnline && navigator.onLine) {
            setIsOnline(true);
            setShowOfflineModal(false);
          }
        }
        
        return response;
      } catch (error: any) {
        // Check if it's a network error
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
          console.log('🔴 Fetch error - Connection lost');
          setIsOnline(false);
          setShowOfflineModal(true);
        }
        throw error;
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.fetch = originalFetch;
    };
  }, [router, isOnline]);

  return { isOnline, showOfflineModal, setShowOfflineModal };
}