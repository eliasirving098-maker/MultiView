/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleMuteActive?: () => void;
  onExitMaximize?: () => void;
  onToggleFullscreen?: () => void;
  onReloadActive?: () => void;
}

export function useKeyboardShortcuts({
  onToggleMuteActive,
  onExitMaximize,
  onToggleFullscreen,
  onReloadActive,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when typing inside form elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Escape' || e.code === 'Escape') {
        if (onExitMaximize) {
          e.preventDefault();
          onExitMaximize();
        }
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onToggleMuteActive) {
          e.preventDefault();
          onToggleMuteActive();
        }
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onToggleFullscreen) {
          e.preventDefault();
          onToggleFullscreen();
        }
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onReloadActive) {
          e.preventDefault();
          onReloadActive();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleMuteActive, onExitMaximize, onToggleFullscreen, onReloadActive]);
}
