"use client";

import React from "react";
import { Match } from "@/lib/types";
import { Sparkles, Plus, Minus, CheckCircle2, Clock, PlayCircle } from "lucide-react";

interface CourtInfo {
  courtNumber: number;
  activeMatch: Match | null;
}

interface CourtsSectionProps {
  courts: CourtInfo[];
  isAdmin: boolean;
  onOpenScoreModal: (match: Match) => void;
  onGenerateMatches: (courtNumber?: number) => void;
  onUpdateCourtsCount: (newCount: number) => void;
}

export default function CourtsSection({
  courts,
  isAdmin,
  onOpenScoreModal,
  onGenerateMatches,
  onUpdateCourtsCount,
}: CourtsSectionProps) {
  const freeCourts = courts.filter((c) => c.activeMatch === null);
  const occupiedCourts = courts.filter((c) => c.activeMatch !== null);

  return (
    <section className="space-y-4">
      {/* Courts Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <PlayCircle size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Canchas en Juego</h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {occupiedCourts.length} activas / {freeCourts.length} libres
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? "Asigná partidos y cargá resultados al terminar cada turno."
                : "Seguí en tiempo real qué partido se está disputando en cada cancha."}
            </p>
          </div>
        </div>

        {/* Admin Court Controls */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Courts +/- */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
              <span className="text-slate-400 px-2 font-medium">Canchas:</span>
              <button
                type="button"
                onClick={() => onUpdateCourtsCount(Math.max(1, courts.length - 1))}
                className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                title="Quitar cancha"
              >
                <Minus size={14} />
              </button>
              <span className="w-7 text-center font-bold text-emerald-400">
                {courts.length}
              </span>
              <button
                type="button"
                onClick={() => onUpdateCourtsCount(Math.min(20, courts.length + 1))}
                className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                title="Agregar cancha"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Smart Matchmaker Button */}
            {freeCourts.length > 0 && (
              <button
                type="button"
                onClick={() => onGenerateMatches()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/40 animate-pulse hover:animate-none"
              >
                <Sparkles size={16} />
                <span>Armar {freeCourts.length} Cancha(s) Libres</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courts.map((court) => {
          const match = court.activeMatch;

          return (
            <div
              key={court.courtNumber}
              className={`rounded-2xl border transition shadow-lg relative overflow-hidden flex flex-col justify-between ${
                match
                  ? "bg-slate-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20"
                  : "bg-slate-900/50 border-slate-800/80 border-dashed"
              }`}
            >
              {/* Card Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-extrabold text-sm text-white">
                    CANCHA {court.courtNumber}
                  </span>
                </div>

                {match ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <Clock size={11} className="animate-spin" /> En Juego • Ronda {match.round}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    Libre
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-center">
                {match ? (
                  <div className="space-y-3">
                    {/* Team 1 */}
                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                        Pareja 1
                      </span>
                      <div className="font-bold text-sm text-white truncate">
                        {match.t1_p1_name}
                      </div>
                      <div className="font-bold text-sm text-white truncate">
                        {match.t1_p2_name}
                      </div>
                    </div>

                    <div className="text-center text-xs font-bold text-slate-500">
                      VS
                    </div>

                    {/* Team 2 */}
                    <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-0.5">
                        Pareja 2
                      </span>
                      <div className="font-bold text-sm text-white truncate">
                        {match.t2_p1_name}
                      </div>
                      <div className="font-bold text-sm text-white truncate">
                        {match.t2_p2_name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 font-medium mb-3">
                      Cancha disponible
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onGenerateMatches(court.courtNumber)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
                      >
                        <Sparkles size={14} />
                        Asignar Partido
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer for Admin */}
              {isAdmin && match && (
                <div className="p-3 bg-slate-800/80 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenScoreModal(match)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30"
                  >
                    <CheckCircle2 size={16} />
                    Cargar Resultado (4-X)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
