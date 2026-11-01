/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-black shadow-lg border border-amber-300">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Modo sin conexión. La reproducción de transmisiones en vivo requiere internet activo.</span>
    </div>
  );
};
