/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as installed standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Instalar aplicación MULTIVIEW en tu dispositivo"
        className={`flex items-center gap-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/40 transition-all border border-emerald-400/30 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition-all ${
            compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
          title="Instalar en iPhone o iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#191b20] border border-slate-800 p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">Instalar en iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                    1
                  </span>
                  <p>
                    Toca el botón <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                    2
                  </span>
                  <p>
                    Desplázate hacia abajo y selecciona <strong className="text-white">"Agregar al inicio"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                    3
                  </span>
                  <p>Toca <strong className="text-white">Agregar</strong> en la esquina superior derecha.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-medium text-slate-200 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
