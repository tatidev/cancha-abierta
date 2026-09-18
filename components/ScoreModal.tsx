"use client";

import React, { useState, useEffect } from "react";
import { Match } from "@/lib/types";
import { X, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";

interface ScoreModalProps {
  match: Match | null;
  targetGames: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveScore: (matchId: number, t1_games: number, t2_games: number) => Promise<void>;
  onCancelMatch: (matchId: number) => Promise<void>;
}

export default function ScoreModal({
  match,
  targetGames = 4,
  isOpen,
  onClose,
  onSaveScore,
  onCancelMatch,
}: ScoreModalProps) {
  const [t1Games, setT1Games] = useState<number | "">("");
  const [t2Games, setT2Games] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (match) {
      if (match.t1_games !== null && match.t2_games !== null) {
        setT1Games(match.t1_games);
        setT2Games(match.t2_games);
      } else {
        setT1Games("");
        setT2Games("");
      }
      setError(null);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const handleSelectQuickScore = (g1: number, g2: number) => {
    setT1Games(g1);
    setT2Games(g2);
    setError(null);
  };

  const handleSave = async () => {
    if (t1Games === "" || t2Games === "") {
      setError("Por favor ingresa o selecciona el resultado.");
      return;
    }

    const g1 = Number(t1Games);
    const g2 = Number(t2Games);

    if (g1 === g2) {
      setError("No puede haber empate en games en este formato.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSaveScore(match.id, g1, g2);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar resultado";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelMatch = async () => {
    if (confirm("¿Estás seguro de cancelar este partido? Quedará anulado y no sumará puntos ni partidos jugados.")) {
      try {
        setSaving(true);
        await onCancelMatch(match.id);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cancelar";
        setError(msg);
      } finally {
        setSaving(false);
      }
    }
  };

  const diff = typeof t1Games === "number" && typeof t2Games === "number" ? t1Games - t2Games : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">
              Cancha {match.court} • Ronda {match.round}
            </span>
            <h3 className="text-lg font-bold text-white">Cargar Resultado</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Teams Header */}
          <div className="grid grid-cols-2 gap-3 text-center">
            {/* Team 1 */}
            <div className="bg-slate-800/90 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                Pareja 1
              </span>
              <p className="font-semibold text-sm text-white truncate">{match.t1_p1_name}</p>
              <p className="font-semibold text-sm text-white truncate">{match.t1_p2_name}</p>
            </div>

            {/* Team 2 */}
            <div className="bg-slate-800/90 p-3 rounded-xl border border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                Pareja 2
              </span>
              <p className="font-semibold text-sm text-white truncate">{match.t2_p1_name}</p>
              <p className="font-semibold text-sm text-white truncate">{match.t2_p2_name}</p>
            </div>
          </div>

          {/* Quick Score Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Resultados Rápidos Frecuentes (Primero a {targetGames} games)
            </label>

            <div className="space-y-2">
              {/* T1 Wins */}
              <div className="text-[11px] font-medium text-emerald-400 mb-1">
                Gana Pareja 1:
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((opp) => (
                  <button
                    key={`t1-${opp}`}
                    type="button"
                    onClick={() => handleSelectQuickScore(targetGames, opp)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg transition border ${
                      t1Games === targetGames && t2Games === opp
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-md scale-102"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    {targetGames} - {opp}
                  </button>
                ))}
              </div>

              {/* T2 Wins */}
              <div className="text-[11px] font-medium text-cyan-400 mt-2 mb-1">
                Gana Pareja 2:
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((opp) => (
                  <button
                    key={`t2-${opp}`}
                    type="button"
                    onClick={() => handleSelectQuickScore(opp, targetGames)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg transition border ${
                      t1Games === opp && t2Games === targetGames
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md scale-102"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    {opp} - {targetGames}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Input Alternative */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400 block mb-2">
              O ingresar games manualmente:
            </span>
            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                min="0"
                max="20"
                value={t1Games}
                onChange={(e) =>
                  setT1Games(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
                placeholder="0"
                className="w-16 h-12 text-center text-xl font-bold bg-slate-800 border border-slate-700 rounded-xl focus:border-emerald-500 focus:outline-hidden"
              />
              <span className="text-xl font-bold text-slate-500">-</span>
              <input
                type="number"
                min="0"
                max="20"
                value={t2Games}
                onChange={(e) =>
                  setT2Games(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
                placeholder="0"
                className="w-16 h-12 text-center text-xl font-bold bg-slate-800 border border-slate-700 rounded-xl focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Points Preview */}
          {diff !== null && diff !== 0 && (
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs text-center space-y-1">
              <span className="text-slate-400 block text-[11px]">Puntuación resultante:</span>
              <div className="flex justify-around font-semibold">
                <span className={diff > 0 ? "text-emerald-400" : "text-rose-400"}>
                  Pareja 1: {diff > 0 ? `+${diff}` : diff} pts
                </span>
                <span className={diff < 0 ? "text-emerald-400" : "text-rose-400"}>
                  Pareja 2: {diff < 0 ? `+${Math.abs(diff)}` : -diff} pts
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancelMatch}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
          >
            <Trash2 size={15} /> Cancelar Partido
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {saving ? "Guardando..." : "Guardar Resultado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
