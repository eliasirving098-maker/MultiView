/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Link,
  Plus,
  History,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  Code,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { detectStreamSource, SAMPLE_STREAMS } from '../services/streamDetector';
import { isIframeSnippet, parseIframeSnippet } from '../services/iframeParser';
import { storageService } from '../services/storageService';
import { HistoryItem, SandboxMode, StreamType } from '../types/stream';

interface StreamInputProps {
  channelIndex: number;
  initialUrl?: string;
  initialSandboxMode?: SandboxMode;
  onConfirm: (url: string, manualOverrideType?: StreamType, sandboxMode?: SandboxMode) => void;
  onCancel?: () => void;
}

export const StreamInput: React.FC<StreamInputProps> = ({
  channelIndex,
  initialUrl = '',
  initialSandboxMode = 'no-sandbox',
  onConfirm,
  onCancel,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [manualType, setManualType] = useState<'auto' | StreamType>('auto');
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>(initialSandboxMode);
  const [activeTab, setActiveTab] = useState<'custom' | 'samples' | 'history'>('custom');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(storageService.getHistory());
  }, []);

  const hasIframeSnippet = isIframeSnippet(url);
  const parsedIframe = hasIframeSnippet ? parseIframeSnippet(url) : null;
  const detection = url.trim() ? detectStreamSource(url) : null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;
    const override = manualType === 'auto' ? undefined : manualType;
    onConfirm(url.trim(), override, sandboxMode);
  };

  const handleSelectPredefined = (selectedUrl: string, selectedType?: StreamType) => {
    setUrl(selectedUrl);
    onConfirm(selectedUrl, selectedType, 'no-sandbox');
  };

  return (
    <div className="w-full max-w-xl p-5 rounded-2xl bg-[#191b20] border border-white/10 shadow-2xl text-left relative z-10 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
            {channelIndex + 1}
          </span>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            AGREGAR TRANSMISIÓN AL CANAL {channelIndex + 1}
          </h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#101114] border border-white/5 mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'custom'
              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>URL o Código IFrame</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('samples')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'samples'
              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Canales de Prueba</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial ({history.length})</span>
        </button>
      </div>

      {/* Tab 1: Custom URL or IFrame Code */}
      {activeTab === 'custom' && (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Pega una URL o código completo &lt;iframe&gt;:
              </label>
              {hasIframeSnippet && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Código IFrame Detectado
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                rows={hasIframeSnippet ? 3 : 2}
                placeholder="Pega un enlace (YouTube, Twitch, .m3u8, .mpd, MP4) o un código <iframe src=...></iframe>"
                className="w-full rounded-xl bg-[#101114] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 font-mono transition resize-none"
                autoFocus
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Parsed Iframe Sanitization Badge */}
          {hasIframeSnippet && parsedIframe && parsedIframe.isValid && (
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>IFrame Sanitizado y Validado:</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono truncate">
                SRC: {parsedIframe.src}
              </p>
              {parsedIframe.attributes.allow && (
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  Permisos: {parsedIframe.attributes.allow}
                </p>
              )}
            </div>
          )}

          {/* Real-time detection card */}
          {detection && !hasIframeSnippet && (
            <div className="p-3 rounded-xl bg-[#101114] border border-white/5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">Clasificación:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    detection.classification === 'blob-resource'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : detection.classification === 'web-page'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : detection.classification === 'iframe-embed'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {detection.classification}
                </span>
              </div>
              <div className="text-[11px] text-slate-200 truncate font-mono font-medium">
                {detection.title || detection.originalUrl}
              </div>
              {detection.reason && (
                <div className="text-[11px] text-slate-300 pt-1 border-t border-white/5 leading-normal">
                  {detection.reason}
                </div>
              )}
              {detection.guidance && (
                <div className="flex items-start gap-1.5 text-[10px] text-amber-300/90 pt-1 leading-normal bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>{detection.guidance}</span>
                </div>
              )}
            </div>
          )}

          {/* Manual Player Selection Option */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#101114] border border-white/5 text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Adaptador de reproducción:</span>
            </span>
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value as any)}
              className="bg-[#191b20] border border-white/10 text-white text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="auto">Automático (Recomendado)</option>
              <option value="iframe-embed">Embed IFrame (Prioridad)</option>
              <option value="hls">Streaming HLS (.m3u8)</option>
              <option value="html5">Video Directo HTML5 (MP4 / WebM)</option>
              <option value="dash">Streaming MPEG-DASH (.mpd)</option>
              <option value="youtube">YouTube API</option>
              <option value="twitch">Twitch Interactive</option>
              <option value="vimeo">Vimeo SDK</option>
              <option value="web-page">Página Web Completa</option>
            </select>
          </div>

          {/* External Player Compatibility (Sandbox Control) */}
          <div className="p-2.5 rounded-xl bg-[#101114] border border-white/5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compatibilidad del reproductor externo:</span>
              </span>
              <select
                value={sandboxMode}
                onChange={(e) => setSandboxMode(e.target.value as SandboxMode)}
                className="bg-[#191b20] border border-white/10 text-white text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="no-sandbox">Compatibilidad sin sandbox (Recomendado)</option>
                <option value="standard">Protección estándar (Con sandbox)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {sandboxMode === 'no-sandbox'
                ? 'El iframe se genera sin atributo sandbox. Permite decodificadores y workers de AuraSports, Streamec, Clappr, etc.'
                : 'Aplica sandbox restrictivo. Puede bloquear la reproducción si el proveedor requiere subframes o workers.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 disabled:pointer-events-none transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cargar en Canal {channelIndex + 1}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Sample Streams */}
      {activeTab === 'samples' && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
          <p className="text-[11px] text-slate-400 mb-2">
            Selecciona una fuente verificada para probar la reproducción inmediatamente:
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {SAMPLE_STREAMS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPredefined(sample.url, sample.type)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#101114] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-left transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 text-slate-300 group-hover:text-emerald-400 transition shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 group-hover:text-white truncate">
                      {sample.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{sample.url}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/5 text-emerald-400 shrink-0 border border-white/5">
                  {sample.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No hay enlaces en el historial reciente.
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                <span>Enlaces utilizados recientemente:</span>
                <button
                  type="button"
                  onClick={() => {
                    storageService.clearHistory();
                    setHistory([]);
                  }}
                  className="text-red-400 hover:text-red-300 text-[10px]"
                >
                  Limpiar historial
                </button>
              </div>
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPredefined(item.url, item.type)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#101114] hover:bg-white/5 border border-white/5 text-left transition group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-slate-300 group-hover:text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{item.url}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/5 text-slate-400 uppercase shrink-0">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
