"use client";

import React, { useState } from "react";
import { ProposedMatch, PlayerStats } from "@/lib/types";
import { X, Sparkles, Check, RefreshCw, AlertTriangle, Users, ArrowRight } from "lucide-react";

interface MatchmakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposedMatches: ProposedMatch[];
  waitingPlayers: PlayerStats[];
  warning?: string;
  onConfirm: (matches: ProposedMatch[]) => Promise<void>;
  onRegenerate: () => Promise<void>;
}

export default function MatchmakerModal({
  isOpen,
  onClose,
  proposedMatches,
  waitingPlayers,
  warning,
  onConfirm,
  onRegenerate,
}: MatchmakerModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (proposedMatches.length === 0) return;
    try {
      setConfirming(true);
      setError(null);
      await onConfirm(proposedMatches);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al confirmar partidos";
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      setError(null);
      await onRegenerate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al recalcular cruces";
      setError(msg);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Sugerencia Inteligente de Cruces
              </h3>
              <p className="text-xs text-slate-400">
                Garantiza no repetir parejas y prioriza a quienes menos jugaron.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {warning && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {/* List of Proposed Matches */}
          {proposedMatches.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>
                  Partidos generados para {proposedMatches.length} cancha(s):
                </span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={14} /> Regla de no repetir verificada
                </span>
              </div>

              {proposedMatches.map((pm, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm hover:border-slate-600 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      CANCHA {pm.court}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Ronda {pm.round}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 text-center">
                    {/* Team 1 */}
                    <div className="md:col-span-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">
                        Pareja 1
                      </div>
                      <div className="font-semibold text-sm text-white truncate">
                        {pm.team1[0].name}
                      </div>
                      <div className="font-semibold text-sm text-white truncate">
                        {pm.team1[1].name}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-slate-500 font-extrabold text-sm my-1 md:my-0 flex justify-center">
                      <span className="px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700 text-slate-400 text-xs">
                        VS
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className="md:col-span-2 bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1">
                        Pareja 2
                      </div>
                      <div className="font-semibold text-sm text-white truncate">
                        {pm.team2[0].name}
                      </div>
                      <div className="font-semibold text-sm text-white truncate">
                        {pm.team2[1].name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm bg-slate-800/40 rounded-xl border border-slate-800">
              No se pudieron armar partidos. Verifica que haya al menos 4 jugadores disponibles sin partidos en juego.
            </div>
          )}

          {/* Resting Players */}
          {waitingPlayers.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-2">
                <Users size={15} />
                Jugadores que descansan en este turno ({waitingPlayers.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {waitingPlayers.map((wp) => (
                  <span
                    key={wp.id}
                    className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg"
                  >
                    {wp.name}{" "}
                    <span className="text-slate-500 text-[10px]">
                      ({wp.matches_played} PJ)
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating || confirming}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            Probar otra combinación
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || proposedMatches.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/40 disabled:opacity-50"
            >
              <Check size={16} />
              {confirming ? "Iniciando..." : "Confirmar y Mandar a Cancha"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
