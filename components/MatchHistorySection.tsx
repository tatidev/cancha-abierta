"use client";

import React, { useState } from "react";
import { Match } from "@/lib/types";
import { History, CheckCircle2, Edit3, Trash2, Calendar } from "lucide-react";

interface MatchHistorySectionProps {
  matches: Match[];
  isAdmin: boolean;
  onEditMatch: (match: Match) => void;
  onDeleteMatch: (matchId: number) => Promise<void>;
}

export default function MatchHistorySection({
  matches,
  isAdmin,
  onEditMatch,
  onDeleteMatch,
}: MatchHistorySectionProps) {
  const [filterCourt, setFilterCourt] = useState<number | "all">("all");

  const finishedMatches = matches.filter(
    (m) => m.status === "finished" || (isAdmin && m.status === "cancelled")
  );

  const filtered = finishedMatches.filter((m) =>
    filterCourt === "all" ? true : m.court === filterCourt
  );

  // Collect available courts in history
  const courtsPresent = Array.from(
    new Set(finishedMatches.map((m) => m.court))
  ).sort((a, b) => a - b);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Historial de Resultados
            </h2>
            <p className="text-xs text-slate-400">
              {finishedMatches.length} partido(s) disputado(s) en el torneo.
            </p>
          </div>
        </div>

        {/* Filter by court */}
        {courtsPresent.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterCourt("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                filterCourt === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Todas
            </button>
            {courtsPresent.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCourt(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  filterCourt === c
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Cancha {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Matches List */}
      <div className="p-4 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((m) => {
            const isCancelled = m.status === "cancelled";
            const diff =
              m.t1_games !== null && m.t2_games !== null
                ? m.t1_games - m.t2_games
                : 0;
            const t1Won = diff > 0;

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row items-center justify-between gap-3 ${
                  isCancelled
                    ? "bg-slate-800/30 border-slate-800 opacity-60"
                    : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
                }`}
              >
                {/* Match Metadata */}
                <div className="flex items-center gap-2 text-xs text-slate-400 w-full md:w-auto">
                  <span className="font-bold text-emerald-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                    Cancha {m.court}
                  </span>
                  <span>Ronda {m.round}</span>
                  {isCancelled && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                      CANCELADO
                    </span>
                  )}
                </div>

                {/* Teams & Score */}
                <div className="flex-1 grid grid-cols-5 items-center gap-2 text-center w-full md:w-auto">
                  {/* Team 1 */}
                  <div className="col-span-2 text-right">
                    <div
                      className={`text-xs font-semibold truncate ${
                        t1Won ? "text-emerald-300 font-bold" : "text-slate-300"
                      }`}
                    >
                      {m.t1_p1_name} & {m.t1_p2_name}
                    </div>
                    {!isCancelled && (
                      <span className="text-[10px] text-slate-400">
                        {t1Won ? `+${diff} pts` : `${diff} pts`}
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex justify-center">
                    {isCancelled ? (
                      <span className="text-xs text-slate-500">-</span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm font-black text-white">
                        {m.t1_games} - {m.t2_games}
                      </span>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div className="col-span-2 text-left">
                    <div
                      className={`text-xs font-semibold truncate ${
                        !t1Won && !isCancelled
                          ? "text-emerald-300 font-bold"
                          : "text-slate-300"
                      }`}
                    >
                      {m.t2_p1_name} & {m.t2_p2_name}
                    </div>
                    {!isCancelled && (
                      <span className="text-[10px] text-slate-400">
                        {!t1Won ? `+${Math.abs(diff)} pts` : `${-diff} pts`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin options */}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditMatch(m)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Corregir resultado"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("¿Eliminar este partido del historial?")) {
                          onDeleteMatch(m.id);
                        }
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition"
                      title="Eliminar partido"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center py-8 text-xs text-slate-500 italic">
            Aún no hay partidos terminados en esta categoría.
          </p>
        )}
      </div>
    </div>
  );
}
