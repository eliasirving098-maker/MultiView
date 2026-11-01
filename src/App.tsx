/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Home } from './pages/Home';
import { Multiview } from './pages/Multiview';
import { OfflineIndicator } from './components/OfflineIndicator';
import { storageService } from './services/storageService';
import { SavedPreset } from './types/stream';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'multiview'>(() => {
    // If the user already has saved slots active, we can remember their state
    const savedSlots = storageService.getSavedSlotsState();
    return savedSlots.some((s) => s.url) ? 'multiview' : 'home';
  });

  const [streamCount, setStreamCount] = useState<number>(() => {
    return storageService.getSavedStreamCount(4);
  });

  const [initialPreset, setInitialPreset] = useState<SavedPreset | null>(null);

  const handleStartMultiview = (count: number) => {
    setStreamCount(count);
    setInitialPreset(null);
    setCurrentPage('multiview');
  };

  const handleStartWithPreset = (preset: SavedPreset) => {
    setStreamCount(preset.streamCount);
    setInitialPreset(preset);
    setCurrentPage('multiview');
  };

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 font-sans">
      {currentPage === 'home' ? (
        <Home
          initialCount={streamCount}
          onStartMultiview={handleStartMultiview}
          onStartWithPreset={handleStartWithPreset}
        />
      ) : (
        <Multiview
          initialCount={streamCount}
          initialPreset={initialPreset}
          onNavigateHome={() => setCurrentPage('home')}
        />
      )}

      {/* Global Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
