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
  Search,
  Loader2,
  Globe,
  ArrowRight,
  Info,
  Tv,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import {
  detectStreamSource,
  resolveEmbedCandidates,
  SAMPLE_STREAMS,
} from '../services/streamDetector';
import { isIframeSnippet, parseIframeSnippet } from '../services/iframeParser';
import { storageService } from '../services/storageService';
import {
  EmbedCandidate,
  HistoryItem,
  SandboxMode,
  StreamType,
} from '../types/stream';
import { AddStreamOptions } from '../hooks/useStreams';

interface StreamInputProps {
  channelIndex: number;
  initialUrl?: string;
  initialEmbedUrl?: string;
  initialSandboxMode?: SandboxMode;
  onConfirm: (
    url: string,
    manualOverrideType?: StreamType,
    sandboxMode?: SandboxMode,
    options?: AddStreamOptions
  ) => void;
  onCancel?: () => void;
}

export const StreamInput: React.FC<StreamInputProps> = ({
  channelIndex,
  initialUrl = '',
  initialEmbedUrl = '',
  initialSandboxMode = 'no-sandbox',
  onConfirm,
  onCancel,
}) => {
  // Main view tab
  const [activeTab, setActiveTab] = useState<'stream' | 'samples' | 'history'>('stream');

  // Input method mode: 'auto' (Automatic Resolution) vs 'manual' (Manual Embed Input)
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>(
    initialEmbedUrl ? 'manual' : 'auto'
  );

  // Automatic mode state
  const [autoUrl, setAutoUrl] = useState(initialUrl);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedCandidates, setResolvedCandidates] = useState<EmbedCandidate[]>([]);
  const [diagnosticSteps, setDiagnosticSteps] = useState<string[]>([]);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveAttempted, setResolveAttempted] = useState(false);

  // Manual mode state: Dual inputs (Original Page URL + Direct Embed URL / Iframe code)
  const [manualPageUrl, setManualPageUrl] = useState(initialUrl);
  const [manualEmbedInput, setManualEmbedInput] = useState(initialEmbedUrl || (isIframeSnippet(initialUrl) ? initialUrl : ''));

  // Common options
  const [manualType, setManualType] = useState<'auto' | StreamType>('auto');
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>(initialSandboxMode);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(storageService.getHistory());
  }, []);

  // Real-time analysis for Automatic URL
  const autoDetection = autoUrl.trim() ? detectStreamSource(autoUrl.trim()) : null;
  const isAutoWebPage = autoDetection?.classification === 'web-page';
  const isAutoEmbed = autoDetection?.classification === 'iframe-embed';
  const canResolve = Boolean(autoUrl.trim() && (isAutoWebPage || isAutoEmbed));

  // Real-time analysis for Manual Embed Input
  const manualHasIframe = isIframeSnippet(manualEmbedInput);
  const manualParsedIframe = manualHasIframe ? parseIframeSnippet(manualEmbedInput) : null;
  const manualEffectiveEmbedUrl = manualHasIframe
    ? manualParsedIframe?.src || ''
    : manualEmbedInput.trim();

  // Trigger Multi-Level Automatic Resolver
  const handleAutoResolve = async () => {
    const trimmed = autoUrl.trim();
    if (!trimmed) return;

    // Direct media manifests (.m3u8, .mp4, official YouTube/Twitch) can be confirmed directly
    if (autoDetection && !isAutoWebPage && !isAutoEmbed) {
      handleConfirmDirectAuto();
      return;
    }

    setIsResolving(true);
    setResolveError(null);
    setResolveAttempted(true);
    setResolvedCandidates([]);
    setDiagnosticSteps([]);
    setIsDiagnosticsOpen(true);

    try {
      const res = await resolveEmbedCandidates(trimmed);
      setDiagnosticSteps(res.diagnosticSteps || []);

      if (res.success && res.candidates.length > 0) {
        setResolvedCandidates(res.candidates);
      } else {
        setResolveError(
          res.reason ||
            'No se identificaron reproductores ni fuentes multimedia en la estructura de esta página. Puedes introducir la URL directa o código <iframe> en el modo manual.'
        );
      }
    } catch (err: any) {
      setResolveError(
        'Error de conexión al analizar la página. Si dispones del enlace directo del reproductor o su código <iframe>, puedes introducirlo en el modo manual.'
      );
    } finally {
      setIsResolving(false);
    }
  };

  // Confirm loading a specific resolved candidate
  const handleSelectCandidate = (candidate: EmbedCandidate) => {
    const isDirect = Boolean(candidate.isDirectMedia);
    const candidateType = candidate.type || (isDirect ? 'hls' : 'iframe-embed');
    const finalType = manualType === 'auto' ? candidateType : manualType;

    onConfirm(autoUrl.trim(), finalType, sandboxMode, {
      embedUrl: candidate.url,
      pageUrl: autoUrl.trim(),
      resolutionMethod: 'auto-resolved',
      isDirectMedia: isDirect,
      candidateEmbeds: resolvedCandidates,
      diagnosticSteps,
      title: candidate.title,
    });
  };

  // Direct confirm in Auto mode (for direct media, official embeds, or direct web page)
  const handleConfirmDirectAuto = (forceWebPage = false) => {
    const trimmed = autoUrl.trim();
    if (!trimmed) return;

    if (forceWebPage) {
      onConfirm(trimmed, 'web-page', sandboxMode, {
        embedUrl: trimmed,
        pageUrl: trimmed,
        resolutionMethod: 'web-page',
      });
      return;
    }

    const detected = detectStreamSource(trimmed);
    const override = manualType === 'auto' ? undefined : manualType;
    onConfirm(trimmed, override, sandboxMode, {
      embedUrl: detected.embedUrl,
      pageUrl: detected.pageUrl,
      resolutionMethod: detected.resolutionMethod,
      title: detected.title,
    });
  };

  // Switch to Manual Mode carrying over the current page URL
  const handleSwitchToManualWithPage = () => {
    setManualPageUrl(autoUrl.trim());
    setInputMode('manual');
  };

  // Confirm Manual Embed Input
  const handleConfirmManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!manualEffectiveEmbedUrl) {
      return;
    }

    const effectivePage = manualPageUrl.trim() || undefined;
    const finalUrl = effectivePage || manualEffectiveEmbedUrl;
    const finalType: StreamType = manualType === 'auto' ? 'iframe-embed' : manualType;

    onConfirm(finalUrl, finalType, sandboxMode, {
      embedUrl: manualEffectiveEmbedUrl,
      pageUrl: effectivePage,
      resolutionMethod: 'manual-embed',
      customIframeAttributes: manualParsedIframe?.attributes,
      title: manualHasIframe ? 'Reproductor IFrame Manual' : undefined,
    });
  };

  // Confirm Predefined sample
  const handleSelectPredefined = (selectedUrl: string, selectedType?: StreamType) => {
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

      {/* Main Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#101114] border border-white/5 mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('stream')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'stream'
              ? 'bg-emerald-500 text-black font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Cargar Transmisión</span>
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

      {/* Tab: Cargar Transmisión */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          {/* Method Selector: Modo Automático vs Modo Manual Embed */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#101114] rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setInputMode('auto')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                inputMode === 'auto'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1. Resolución Automática</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                inputMode === 'manual'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>2. Entrada Manual Embed</span>
            </button>
          </div>

          {/* ========================================================
              MODO 1: RESOLUCIÓN AUTOMÁTICA
             ======================================================== */}
          {inputMode === 'auto' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  URL de la página web completa o enlace de transmisión:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={autoUrl}
                    onChange={(e) => {
                      setAutoUrl(e.target.value);
                      setResolveAttempted(false);
                      setResolvedCandidates([]);
                      setResolveError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (canResolve) {
                          handleAutoResolve();
                        } else {
                          handleConfirmDirectAuto();
                        }
                      }
                    }}
                    placeholder="https://streamec.st/embed/ch31.php o tvsportslive.fr, .m3u8, direct video"
                    className="w-full rounded-xl bg-[#101114] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 font-mono transition"
                    autoFocus
                  />
                  {autoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAutoUrl('');
                        setResolvedCandidates([]);
                        setDiagnosticSteps([]);
                        setResolveError(null);
                        setResolveAttempted(false);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Source Classification Hint */}
              {autoDetection && (
                <div className="p-3 rounded-xl bg-[#101114] border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">Tipo Detectado:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        autoDetection.classification === 'blob-resource'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : autoDetection.classification === 'web-page'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : autoDetection.classification === 'iframe-embed'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {autoDetection.classification}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 font-mono font-medium truncate">
                    {autoDetection.title || autoDetection.originalUrl}
                  </div>
                  {autoDetection.reason && (
                    <div className="text-[11px] text-slate-300 pt-1 border-t border-white/5">
                      {autoDetection.reason}
                    </div>
                  )}
                </div>
              )}

              {/* Auto Resolve Action Button */}
              {canResolve && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAutoResolve}
                    disabled={isResolving || !autoUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                  >
                    {isResolving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inspeccionando capas y buscando reproductor interno...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {isAutoEmbed
                            ? 'Inspeccionar Capas y Resolver Reproductor Interno'
                            : 'Localizar Reproductor Automáticamente'}
                        </span>
                      </>
                    )}
                  </button>
                  {isAutoEmbed && !resolvedCandidates.length && (
                    <button
                      type="button"
                      onClick={() => handleConfirmDirectAuto(false)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] font-medium border border-white/5 transition cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>O cargar embed directamente tal cual (sin inspección previa)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Resolved Candidates List */}
              {resolvedCandidates.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        {resolvedCandidates.length === 1
                          ? '1 Reproductor Detectado:'
                          : `${resolvedCandidates.length} Reproductores Detectados:`}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Selecciona uno para cargar</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {resolvedCandidates.map((candidate, idx) => (
                      <div
                        key={candidate.id || idx}
                        className="p-2.5 rounded-lg bg-[#14161b] border border-white/10 hover:border-emerald-500/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-white truncate">
                              {candidate.title || candidate.sourceHostname}
                            </span>
                            {candidate.isDirectMedia ? (
                              candidate.isVerifiedAccessible ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  HLS Directo (Audio Controlable)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Fuente Protegida (Token CDN)
                                </span>
                              )
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Reproductor Interno (Audio Externo)
                              </span>
                            )}
                            {candidate.depth !== undefined && candidate.depth > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
                                Nivel {candidate.depth}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {candidate.url}
                          </p>
                          {candidate.note && (
                            <p className="text-[10px] text-slate-400 leading-normal">
                              {candidate.note}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectCandidate(candidate)}
                          className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Usar este</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic Steps Accordion */}
              {diagnosticSteps.length > 0 && (
                <div className="rounded-xl bg-[#101114] border border-white/10 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setIsDiagnosticsOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition font-mono text-[11px] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Diagnóstico de Inspección ({diagnosticSteps.length} eventos)</span>
                    </span>
                    {isDiagnosticsOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                  {isDiagnosticsOpen && (
                    <div className="p-3 space-y-1.5 max-h-44 overflow-y-auto font-mono text-[10px] border-t border-white/5 bg-black/60">
                      {diagnosticSteps.map((step, idx) => {
                        const isSuccess =
                          step.includes('accesible') ||
                          step.includes('Final') ||
                          step.includes('¡Fuente');
                        const isWarn =
                          step.includes('protegida') ||
                          step.includes('403') ||
                          step.includes('incontrolable');
                        const isLevel = step.startsWith('[Nivel');
                        return (
                          <div
                            key={idx}
                            className={`leading-relaxed ${
                              isSuccess
                                ? 'text-emerald-400'
                                : isWarn
                                ? 'text-amber-400'
                                : isLevel
                                ? 'text-cyan-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {step}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Failure Notice & Manual Fallback Button */}
              {resolveAttempted && resolveError && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-amber-200 font-medium leading-relaxed">
                        {resolveError}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchToManualWithPage}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/40 transition cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Introducir Enlace Directo en Entrada Manual</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Direct confirm button for non-resolvable pages (Direct media, YouTube, Twitch, Vimeo) */}
              {!canResolve && autoUrl.trim() && (
                <button
                  type="button"
                  onClick={() => handleConfirmDirectAuto(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Cargar Transmisión en Canal {channelIndex + 1}</span>
                </button>
              )}

              {/* Option to load whole webpage directly if desired */}
              {isAutoWebPage && !resolvedCandidates.length && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">¿Deseas probar cargar el sitio completo?</span>
                  <button
                    type="button"
                    onClick={() => handleConfirmDirectAuto(true)}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 underline transition"
                  >
                    Cargar marco directo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              MODO 2: ENTRADA MANUAL DE URL EMBED / CÓDIGO IFRAME
             ======================================================== */}
          {inputMode === 'manual' && (
            <form onSubmit={handleConfirmManual} className="space-y-3.5">
              {/* Field 1: Original Web Page URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. URL de la página web de origen <span className="text-slate-500">(Opcional / Referencia)</span>:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualPageUrl}
                    onChange={(e) => setManualPageUrl(e.target.value)}
                    placeholder="https://tvsportslive.fr/baltimore-ravens-vs-buffalo-bills/"
                    className="w-full rounded-xl bg-[#101114] border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 font-mono transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Permite identificar la fuente original del evento o partido en la vista múltiple.
                </p>
              </div>

              {/* Field 2: Direct Embed URL or Iframe Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    2. URL directa del reproductor o código HTML &lt;iframe&gt; <span className="text-emerald-400">*</span>:
                  </label>
                  {manualHasIframe && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      &lt;iframe&gt; detectado
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={manualEmbedInput}
                    onChange={(e) => setManualEmbedInput(e.target.value)}
                    rows={manualHasIframe ? 3 : 2}
                    placeholder="Pega la URL del embed (ej. https://play.aurasportsplayer.cfd/...) o la etiqueta completa <iframe src=...></iframe>"
                    className="w-full rounded-xl bg-[#101114] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 font-mono transition resize-none"
                    autoFocus
                  />
                  {manualEmbedInput && (
                    <button
                      type="button"
                      onClick={() => setManualEmbedInput('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sanitized Iframe Preview */}
              {manualHasIframe && manualParsedIframe && manualParsedIframe.isValid && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>IFrame Sanitizado y Validado para Inserción:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono truncate">
                    SRC: {manualParsedIframe.src}
                  </p>
                  {manualParsedIframe.attributes.allow && (
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      Permisos: {manualParsedIframe.attributes.allow}
                    </p>
                  )}
                </div>
              )}

              {/* External Player Compatibility (Sandbox Control) */}
              <div className="p-2.5 rounded-xl bg-[#101114] border border-white/5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compatibilidad de iframe:</span>
                  </span>
                  <select
                    value={sandboxMode}
                    onChange={(e) => setSandboxMode(e.target.value as SandboxMode)}
                    className="bg-[#191b20] border border-white/10 text-white text-[11px] rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="no-sandbox">Sin sandbox (Recomendado para AuraSports/JWPlayer)</option>
                    <option value="standard">Protección estándar (Con sandbox)</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  El modo sin sandbox permite que reproductores complejos inicialicen trabajadores y sub-reproductores sin bloqueos.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!manualEffectiveEmbedUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Cargar Reproductor Embed en Canal {channelIndex + 1}</span>
              </button>
            </form>
          )}

          {/* Common Adapter Type Override selector (collapsed by default) */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#101114] border border-white/5 text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Adaptador forzado (Opcional):</span>
            </span>
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value as any)}
              className="bg-[#191b20] border border-white/10 text-white text-[11px] rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="auto">Automático (Recomendado)</option>
              <option value="iframe-embed">Embed IFrame (Prioridad)</option>
              <option value="hls">Streaming HLS (.m3u8)</option>
              <option value="html5">Video HTML5 (MP4 / WebM)</option>
              <option value="dash">Streaming DASH (.mpd)</option>
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="vimeo">Vimeo</option>
              <option value="web-page">Página Web</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab: Canales de Prueba */}
      {activeTab === 'samples' && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          <p className="text-xs text-slate-400 mb-2">
            Selecciona una fuente verificada para probar la reproducción en MULTIVIEW:
          </p>
          {SAMPLE_STREAMS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPredefined(sample.url, sample.type)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#101114] border border-white/5 hover:border-emerald-500/50 hover:bg-[#14161b] transition text-left group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition truncate">
                    {sample.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    {sample.badge}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                  {sample.url}
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'history' && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No hay transmisiones previas en el historial.
            </div>
          ) : (
            history.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPredefined(item.url, item.type)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#101114] border border-white/5 hover:border-emerald-500/50 hover:bg-[#14161b] transition text-left group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition truncate">
                    {item.title || item.url}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    {item.url}
                  </div>
                </div>
                <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
