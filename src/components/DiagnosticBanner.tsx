/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  WifiOff,
  ExternalLink,
  RefreshCw,
  Info,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { DiagnosticCode, SourceClassification, StreamSlot } from '../types/stream';

interface DiagnosticBannerProps {
  slot: StreamSlot;
  onRetry: () => void;
  onEditUrl: () => void;
}

export const DiagnosticBanner: React.FC<DiagnosticBannerProps> = ({
  slot,
  onRetry,
  onEditUrl,
}) => {
  const code: DiagnosticCode = slot.diagnosticCode || 'none';
  const targetUrl = slot.originalInput || slot.url;

  const handleOpenExternal = () => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenPopup = () => {
    const width = 1000;
    const height = 650;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    window.open(
      targetUrl,
      `mv_player_${slot.id}`,
      `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes`
    );
  };

  const getDiagnosticDetails = () => {
    switch (code) {
      case 'incompatible-resource':
        return {
          title: 'Recurso Incompatible (URL Blob / Local)',
          icon: <FileCode className="w-6 h-6 text-amber-400" />,
          color: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
          message:
            slot.errorMessage ||
            'Las direcciones de tipo blob: son referencias locales efímeras generadas en la memoria de la pestaña original. No son permanentes ni pueden compartirse entre dominios o pestañas.',
          actionHelp:
            'Introduce la URL canónica de la página web, el documento embed oficial o la señal directa HLS (.m3u8).',
        };

      case 'embedding-forbidden':
        return {
          title: 'Inserción Externa Prohibida por el Servidor',
          icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
          color: 'border-rose-500/40 bg-rose-950/20 text-rose-200',
          message:
            'El servidor de origen restringe su visualización dentro de marcos de terceros mediante cabeceras de seguridad HTTP (X-Frame-Options o CSP frame-ancestors).',
          actionHelp:
            'Puedes abrir esta transmisión en una ventana de monitoreo flotante para visualizarla en su contexto original.',
        };

      case 'timeout':
        return {
          title: 'Tiempo de Espera Agotado (Sin Carga Infinita)',
          icon: <Clock className="w-6 h-6 text-amber-400" />,
          color: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
          message:
            'El recurso no emitió un evento de carga o reproducción tras 8 segundos. Es posible que el servidor tarde en responder o que requiera interacción directa del usuario.',
          actionHelp:
            'Prueba a recargar el stream, abrirlo en ventana externa o verificar la conectividad del proveedor.',
        };

      case 'iframe-error':
        return {
          title: 'Fallo al Cargar Documento Iframe',
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          color: 'border-rose-500/40 bg-rose-950/20 text-rose-200',
          message:
            'El navegador no pudo cargar el marco externo. Puede deberse a restricciones de dominio, políticas de red o requerimiento de Compatibilidad sin sandbox del proveedor.',
          actionHelp: 'Verifica la URL, activa "Compatibilidad sin sandbox" en el icono de escudo del canal, o pulsa "Ventana Flotante".',
        };

      case 'initialization-error':
        return {
          title: 'Error de Inicialización del Reproductor',
          icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
          color: 'border-orange-500/40 bg-orange-950/20 text-orange-200',
          message:
            slot.errorMessage ||
            'El motor del reproductor (Hls.js / Dash.js / Embed) no pudo inicializar el flujo multimedia.',
          actionHelp: 'Asegúrate de que la URL del manifest o video sea accesible y permita CORS.',
        };

      case 'playback-error':
        return {
          title: 'Error en la Reproducción del Video',
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          color: 'border-rose-500/40 bg-rose-950/20 text-rose-200',
          message:
            slot.errorMessage ||
            'El elemento de video emitió un error de decodificación o interrupción de señal.',
          actionHelp: 'Verifica que el codec sea compatible con tu navegador (H.264/AAC, WebM).',
        };

      case 'network-error':
        return {
          title: 'Problema de Red o Sin Conexión',
          icon: <WifiOff className="w-6 h-6 text-red-400" />,
          color: 'border-red-500/40 bg-red-950/20 text-red-200',
          message: 'No se pudo contactar con el host remoto. Comprueba tu conexión a internet.',
          actionHelp: 'Reintenta la conexión una vez restablecida la red.',
        };

      default:
        return {
          title: 'Error de Carga',
          icon: <AlertTriangle className="w-6 h-6 text-slate-400" />,
          color: 'border-white/10 bg-white/5 text-slate-300',
          message: slot.errorMessage || 'No se pudo iniciar la reproducción.',
          actionHelp: 'Prueba con otra fuente o verifica el formato.',
        };
    }
  };

  const details = getDiagnosticDetails();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-5 bg-[#121418] text-center select-none overflow-y-auto">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-inner">
        {details.icon}
      </div>

      <h4 className="text-sm font-bold text-white mb-1.5 tracking-wide">{details.title}</h4>

      <p className="text-xs text-slate-300 max-w-sm mb-2 leading-relaxed font-mono">
        {details.message}
      </p>

      {details.actionHelp && (
        <p className="text-[11px] text-slate-400 max-w-sm mb-4 leading-normal bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
          {details.actionHelp}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>

        <button
          onClick={handleOpenPopup}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md shadow-emerald-950/40"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Ventana Flotante</span>
        </button>

        <button
          onClick={onEditUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition"
        >
          <span>Cambiar URL</span>
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 w-full max-w-xs text-[10px] text-slate-500 font-mono truncate">
        Fuente: {targetUrl}
      </div>
    </div>
  );
};
