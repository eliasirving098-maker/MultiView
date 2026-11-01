/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Tv,
  ArrowRight,
  Info,
  Sparkles,
  RefreshCw,
  Globe,
  Radio,
  Zap,
} from 'lucide-react';
import { StreamSlot } from '../types/stream';
import { resolveStreamUrl, ResolvedStreamData } from '../services/streamResolver';

interface SportsStreamHelperProps {
  slot: StreamSlot;
  onReplaceUrl: (newUrl: string) => void;
  onToggleIframeMode: () => void;
  isIframeMode: boolean;
}

export const SportsStreamHelper: React.FC<SportsStreamHelperProps> = ({
  slot,
  onReplaceUrl,
  onToggleIframeMode,
  isIframeMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [extractedInput, setExtractedInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [resolvedData, setResolvedData] = useState<ResolvedStreamData | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const targetUrl = slot.originalInput || slot.url;

  // Extract host and match name
  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname.replace('www.', '');
  } catch {
    hostname = 'portal deportivo';
  }

  // Auto-resolve stream on mount or URL change
  useEffect(() => {
    let active = true;
    if (targetUrl) {
      setIsResolving(true);
      resolveStreamUrl(targetUrl)
        .then((data) => {
          if (active) {
            setResolvedData(data);
            setIsResolving(false);
          }
        })
        .catch(() => {
          if (active) setIsResolving(false);
        });
    }
    return () => {
      active = false;
    };
  }, [targetUrl]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPopup = () => {
    const width = 980;
    const height = 620;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      targetUrl,
      `sports_popout_${slot.id}`,
      `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes`
    );
  };

  const handleExtractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedInput.trim()) return;
    onReplaceUrl(extractedInput.trim());
  };

  const handleLoadAlternativeFeed = () => {
    onReplaceUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-[#14161c] text-left select-none overflow-y-auto">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-[280px]">
                {slot.title || 'Transmisión Deportiva'}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">{hostname}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            DEPORTES LIVE
          </span>
        </div>

        {/* Auto-resolved streams banner (if server found inner iframe or m3u8) */}
        {resolvedData && resolvedData.status === 'success' && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 mb-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Zap className="w-4 h-4 fill-current" />
              <span>Transmisión Desempaquetada Automáticamente:</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Se detectó el reproductor interno de la señal. Puedes reproducirlo sin las capas de redirección del sitio original:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {resolvedData.hlsPlaylist && (
                <button
                  onClick={() => onReplaceUrl(resolvedData.hlsPlaylist!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Reproducir Señal HLS (.m3u8)</span>
                </button>
              )}
              {resolvedData.bestEmbedUrl && resolvedData.bestEmbedUrl !== targetUrl && (
                <button
                  onClick={() => onReplaceUrl(resolvedData.bestEmbedUrl!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition shadow-sm"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Cargar Reproductor Puro</span>
                </button>
              )}
              {resolvedData.cleanEmbedUrl && (
                <button
                  onClick={() => onReplaceUrl(resolvedData.cleanEmbedUrl!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition border border-white/10"
                >
                  <span>Modo Limpio (Sin Popunders)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {/* Neutralized Anti-Sandbox Player */}
          <button
            onClick={() => onReplaceUrl(`/api/proxy-player?url=${encodeURIComponent(targetUrl)}`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-950/40 transition hover:scale-[1.01]"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Reproductor Optimizado</span>
          </button>

          {/* Direct Iframe view */}
          <button
            onClick={onToggleIframeMode}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isIframeMode ? 'Ocultar Marco' : 'Marco Directo'}</span>
          </button>

          {/* Pop-out window */}
          <button
            onClick={handleOpenPopup}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ventana Flotante</span>
          </button>
        </div>

        {/* Diagnostic info about sandbox */}
        <div className="p-2.5 rounded-xl bg-sky-950/25 border border-sky-500/30 mb-3 text-[11px] text-sky-200/90 leading-relaxed space-y-1">
          <p className="font-semibold text-sky-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>¿Mensaje de "Sandbox attribute has been added"?</span>
          </p>
          <p className="text-slate-300">
            Ocurre porque el script del portal (<code className="text-sky-300 font-mono">streamec.st</code>) ejecuta una función obsoleta (<code className="text-sky-300 font-mono">document.domain</code>) que falla en navegadores modernos y activa un aviso falso. El botón <strong>"Reproductor Optimizado"</strong> elimina ese bloqueo y reproduce el stream en limpio.
          </p>
        </div>

        {/* Extractor Tool: How to get clean direct stream */}
        <div className="p-3 rounded-xl bg-[#101114] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Extracción o Reemplazo Manual de Enlace</span>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <Info className="w-3 h-3" />
              <span>{showGuide ? 'Ocultar guía' : '¿Cómo extraer el .m3u8?'}</span>
            </button>
          </div>

          {showGuide && (
            <div className="text-[11px] text-slate-300 bg-[#15171d] p-2.5 rounded-lg border border-white/5 space-y-1.5 font-mono">
              <p>
                1. Abre el enlace en tu navegador: <strong className="text-white">{hostname}</strong>
              </p>
              <p>
                2. En el reproductor que reproduce el video, haz clic derecho y selecciona <strong>"Copiar dirección del marco"</strong> (ej: <code className="text-emerald-400">https://streamec.st/embed/ch32.php</code> o <code className="text-emerald-400">embedcenter.st</code>).
              </p>
              <p>
                3. Si abres las herramientas de desarrollador (F12) y filtras por <strong>.m3u8</strong> en la pestaña Red (Network), obtendrás la señal directa pura.
              </p>
              <p>
                4. Pega cualquiera de esos enlaces aquí abajo.
              </p>
            </div>
          )}

          {/* Input to paste extracted direct stream */}
          <form onSubmit={handleExtractSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={extractedInput}
              onChange={(e) => setExtractedInput(e.target.value)}
              placeholder="Pega aquí el enlace directo (ej. streamec.st/embed/... o .m3u8)"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#15171d] border border-white/10 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!extractedInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold disabled:opacity-40 transition flex items-center gap-1 shrink-0"
            >
              <span>Vincular</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom helper */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5">
        <button
          onClick={() => handleCopy(targetUrl)}
          className="flex items-center gap-1 hover:text-white transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? '¡URL Copiada!' : 'Copiar URL actual'}</span>
        </button>

        <button
          onClick={handleLoadAlternativeFeed}
          className="flex items-center gap-1 text-slate-400 hover:text-emerald-300 transition text-[10px]"
          title="Carga un stream de prueba verificado para comprobar el recuadro"
        >
          <Tv className="w-3 h-3 text-emerald-400" />
          <span>Feed de prueba</span>
        </button>
      </div>
    </div>
  );
};
