'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export function ServiceWorkerProvider() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
