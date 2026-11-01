/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface LayoutOption {
  count: number;
  label: string;
  sublabel: string;
  description: string;
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    count: 1,
    label: '1 STREAM',
    sublabel: 'Pantalla Completa',
    description: '100% del espacio para máxima inmersión individual.',
  },
  {
    count: 2,
    label: '2 STREAMS',
    sublabel: 'Columnas Divididas',
    description: 'Dos transmisiones en paralelo para comparar o monitorear.',
  },
  {
    count: 3,
    label: '3 STREAMS',
    sublabel: 'Tríptico Dinámico',
    description: 'Distribución equilibrada para seguimiento múltiple.',
  },
  {
    count: 4,
    label: '4 STREAMS',
    sublabel: 'Cuadrícula 2 × 2',
    description: 'El formato estándar más popular y equilibrado.',
  },
  {
    count: 5,
    label: '5 STREAMS',
    sublabel: 'Asimétrico / Balanceado',
    description: 'Configuración de monitoreo profesional para eventos simultáneos.',
  },
  {
    count: 6,
    label: '6 STREAMS',
    sublabel: 'Cuadrícula 3 × 2',
    description: 'Capacidad máxima de visualización para centros de control.',
  },
];

/**
 * Mini visual representation graphic of the screen distribution
 */
export const MiniLayoutDiagram: React.FC<{ count: number; active?: boolean }> = ({
  count,
  active = false,
}) => {
  const boxClass = active
    ? 'bg-emerald-400 border-emerald-300'
    : 'bg-white/20 border-white/20 group-hover:bg-emerald-400/50 group-hover:border-emerald-400/60';

  return (
    <div className="w-14 h-10 rounded-md bg-[#101114] border border-white/10 p-1 flex flex-col justify-between overflow-hidden shadow-inner">
      {count === 1 && (
        <div className={`w-full h-full rounded-xs border ${boxClass}`} />
      )}
      {count === 2 && (
        <div className="w-full h-full grid grid-cols-2 gap-1">
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
        </div>
      )}
      {count === 3 && (
        <div className="w-full h-full grid grid-cols-3 gap-0.5">
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
        </div>
      )}
      {count === 4 && (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
        </div>
      )}
      {count === 5 && (
        <div className="w-full h-full flex flex-col gap-0.5">
          <div className="grid grid-cols-3 gap-0.5 h-1/2">
            <div className={`rounded-xs border ${boxClass}`} />
            <div className={`rounded-xs border ${boxClass}`} />
            <div className={`rounded-xs border ${boxClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-0.5 h-1/2">
            <div className={`rounded-xs border ${boxClass}`} />
            <div className={`rounded-xs border ${boxClass}`} />
          </div>
        </div>
      )}
      {count === 6 && (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5">
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
          <div className={`rounded-xs border ${boxClass}`} />
        </div>
      )}
    </div>
  );
};

interface LayoutSelectorCardsProps {
  selectedCount: number;
  onSelect: (count: number) => void;
}

export const LayoutSelectorCards: React.FC<LayoutSelectorCardsProps> = ({
  selectedCount,
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
      {LAYOUT_OPTIONS.map((opt) => {
        const isSelected = selectedCount === opt.count;
        return (
          <button
            key={opt.count}
            type="button"
            onClick={() => onSelect(opt.count)}
            className={`group flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all duration-200 ${
              isSelected
                ? 'bg-emerald-950/25 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/50 scale-[1.02]'
                : 'bg-[#191b20] border-white/10 hover:border-white/25 hover:bg-[#1f2229]'
            }`}
          >
            {/* Visual Graphic Representation */}
            <div className="mb-3">
              <MiniLayoutDiagram count={opt.count} active={isSelected} />
            </div>

            <div
              className={`text-xs font-mono font-bold tracking-wider mb-0.5 ${
                isSelected ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {opt.label}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mb-1">
              {opt.sublabel}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight hidden sm:block">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
