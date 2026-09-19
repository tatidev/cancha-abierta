"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PlayerStats, Match, ProposedMatch } from "@/lib/types";
import { validateManualMatch, generateMatchesForCourts } from "@/lib/matchmaker";
import {
  X,
  Sparkles,
  Edit3,
  Check,
  AlertTriangle,
  Users,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface AssignCourtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtNumber: number;
  currentRound: number;
  players: PlayerStats[];
  matches: Match[];
  currentlyPlayingIds: number[];
  onConfirmMatch: (matchData: {
    court: number;
    round: number;
    t1_p1_id: number;
    t1_p2_id: number;
    t2_p1_id: number;
    t2_p2_id: number;
    allow_repeat?: boolean;
  }) => Promise<void>;
}

export default function AssignCourtModal({
  isOpen,
  onClose,
  courtNumber,
  currentRound,
  players,
  matches,
  currentlyPlayingIds,
  onConfirmMatch,
}: AssignCourtModalProps) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  // Auto state
  const [autoMatch, setAutoMatch] = useState<ProposedMatch | null>(null);
  const [autoWarning, setAutoWarning] = useState<string | undefined>();
  const [regenerating, setRegenerating] = useState(false);

  // Manual state: player IDs
  const [p1Id, setP1Id] = useState<number | "">("");
  const [p2Id, setP2Id] = useState<number | "">("");
  const [p3Id, setP3Id] = useState<number | "">("");
  const [p4Id, setP4Id] = useState<number | "">("");

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate auto suggestion
  const runAutoGeneration = () => {
    const result = generateMatchesForCourts(
      players,
      matches,
      [courtNumber],
      currentRound
    );
    if (result.proposedMatches.length > 0) {
      const pm = result.proposedMatches[0];
      setAutoMatch(pm);
      setAutoWarning(undefined);
      // Pre-fill manual dropdowns with the auto suggestion by default
      setP1Id(pm.team1[0].id);
      setP2Id(pm.team1[1].id);
      setP3Id(pm.team2[0].id);
      setP4Id(pm.team2[1].id);
    } else {
      setAutoMatch(null);
      setAutoWarning(result.warning || "No se encontró una combinación sin repetir parejas.");
      setP1Id("");
      setP2Id("");
      setP3Id("");
      setP4Id("");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMode("auto");
      setError(null);
      runAutoGeneration();
    }
  }, [isOpen, courtNumber, currentRound]);

  // Candidates list for manual selection:
  // Active players sorted by least matches played first
  const availablePlayers = useMemo(() => {
    const busySet = new Set(currentlyPlayingIds);
    return [...players]
      .filter((p) => p.active === 1)
      .sort((a, b) => {
        // First, currently not on another court
        const aBusy = busySet.has(a.id) ? 1 : 0;
        const bBusy = busySet.has(b.id) ? 1 : 0;
        if (aBusy !== bBusy) return aBusy - bBusy;
        // Then by fewest matches played
        if (a.matches_played !== b.matches_played) {
          return a.matches_played - b.matches_played;
        }
        return a.name.localeCompare(b.name);
      });
  }, [players, currentlyPlayingIds]);

  // Real-time validation for manual mode
  const manualValidation = useMemo(() => {
    if (!p1Id || !p2Id || !p3Id || !p4Id) {
      return { complete: false };
    }

    const ids = [Number(p1Id), Number(p2Id), Number(p3Id), Number(p4Id)];
    const unique = new Set(ids);
    if (unique.size !== 4) {
      return {
        complete: true,
        valid: false,
        error: "Un mismo jugador no puede seleccionarse dos veces.",
      };
    }

    const val = validateManualMatch(
      ids[0],
      ids[1],
      ids[2],
      ids[3],
      players,
      matches,
      undefined,
      true // allow repeat partners with warning
    );

    return {
      complete: true,
      valid: val.valid,
      partnerRepeated: val.partnerRepeated,
      warning: val.warning,
      error: val.error,
    };
  }, [p1Id, p2Id, p3Id, p4Id, players, matches]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      setError(null);

      if (mode === "auto") {
        if (!autoMatch) return;
        await onConfirmMatch({
          court: courtNumber,
          round: currentRound,
          t1_p1_id: autoMatch.team1[0].id,
          t1_p2_id: autoMatch.team1[1].id,
          t2_p1_id: autoMatch.team2[0].id,
          t2_p2_id: autoMatch.team2[1].id,
        });
      } else {
        if (!manualValidation.complete || !manualValidation.valid) {
          setError(manualValidation.error || "Por favor selecciona 4 jugadores válidos.");
          return;
        }

        await onConfirmMatch({
          court: courtNumber,
          round: currentRound,
          t1_p1_id: Number(p1Id),
          t1_p2_id: Number(p2Id),
          t2_p1_id: Number(p3Id),
          t2_p2_id: Number(p4Id),
          allow_repeat: manualValidation.partnerRepeated,
        });
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al asignar partido";
      setError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const renderPlayerSelect = (
    value: number | "",
    onChange: (val: number | "") => void,
    label: string,
    colorClass: string
  ) => {
    return (
      <div>
        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${colorClass}`}>
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 font-medium"
        >
          <option value="">-- Seleccionar jugador --</option>
          {availablePlayers.map((p) => {
            const isBusy = currentlyPlayingIds.includes(p.id);
            return (
              <option key={p.id} value={p.id} disabled={isBusy}>
                {p.name} ({p.matches_played} PJ{isBusy ? " - En cancha" : ""})
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
              Cancha {courtNumber} • Ronda {currentRound}
            </span>
            <h3 className="text-lg font-bold text-white">Asignar Partido</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-850 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              mode === "auto"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            <span>Sugerencia Automática</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("manual");
              if (autoMatch && (!p1Id || !p2Id || !p3Id || !p4Id)) {
                setP1Id(autoMatch.team1[0].id);
                setP2Id(autoMatch.team1[1].id);
                setP3Id(autoMatch.team2[0].id);
                setP4Id(autoMatch.team2[1].id);
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
              mode === "manual"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Edit3 size={14} />
            <span>Elegir a Mano</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: AUTO */}
          {mode === "auto" && (
            <div className="space-y-4">
              {autoMatch ? (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] text-emerald-400 font-semibold mb-3 flex items-center gap-1">
                    <Check size={14} />
                    Propuesta generada automáticamente sin repetir compañeros:
                  </div>

                  <div className="grid grid-cols-5 items-center gap-2 text-center">
                    {/* Team 1 */}
                    <div className="col-span-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                        Pareja 1
                      </span>
                      <p className="font-bold text-xs sm:text-sm text-white truncate">
                        {autoMatch.team1[0].name}
                      </p>
                      <p className="font-bold text-xs sm:text-sm text-white truncate">
                        {autoMatch.team1[1].name}
                      </p>
                    </div>

                    <div className="text-slate-500 font-extrabold text-xs">
                      VS
                    </div>

                    {/* Team 2 */}
                    <div className="col-span-2 bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block mb-1">
                        Pareja 2
                      </span>
                      <p className="font-bold text-xs sm:text-sm text-white truncate">
                        {autoMatch.team2[0].name}
                      </p>
                      <p className="font-bold text-xs sm:text-sm text-white truncate">
                        {autoMatch.team2[1].name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setRegenerating(true);
                        runAutoGeneration();
                        setTimeout(() => setRegenerating(false), 300);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white font-medium"
                    >
                      <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
                      Probar otra combinación automática
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                  <p>{autoWarning}</p>
                  <p className="text-[11px] text-slate-500">
                    Podés usar la pestaña <strong>"Elegir a Mano"</strong> para armar el partido seleccionando vos a los jugadores.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL */}
          {mode === "manual" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
                <span className="text-slate-300 text-[11px]">
                  💡 <strong>Sugerencia cargada por defecto:</strong> Podés cambiar cualquiera de los 4 jugadores.
                </span>
                {autoMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setP1Id(autoMatch.team1[0].id);
                      setP2Id(autoMatch.team1[1].id);
                      setP3Id(autoMatch.team2[0].id);
                      setP4Id(autoMatch.team2[1].id);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline shrink-0 cursor-pointer text-left"
                  >
                    Restablecer sugerencia
                  </button>
                )}
              </div>

              {/* Team 1 Selection */}
              <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  🎾 Pareja 1
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {renderPlayerSelect(p1Id, setP1Id, "Jugador 1", "text-emerald-400")}
                  {renderPlayerSelect(p2Id, setP2Id, "Jugador 2", "text-emerald-400")}
                </div>
              </div>

              {/* Team 2 Selection */}
              <div className="bg-cyan-950/25 border border-cyan-500/30 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  🎾 Pareja 2
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {renderPlayerSelect(p3Id, setP3Id, "Jugador 3", "text-cyan-400")}
                  {renderPlayerSelect(p4Id, setP4Id, "Jugador 4", "text-cyan-400")}
                </div>
              </div>

              {/* Validation / Warning Feedback */}
              {manualValidation.complete && (
                <div className="animate-fade-in">
                  {manualValidation.error ? (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{manualValidation.error}</span>
                    </div>
                  ) : manualValidation.partnerRepeated ? (
                    <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>¡Aviso de Pareja Repetida!</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        {manualValidation.warning}
                      </p>
                      <p className="text-[10px] text-amber-400/80 italic pt-0.5">
                        * Podés hacer clic en confirmar abajo para permitirlo de todos modos si el torneo lo requiere.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{manualValidation.warning || "¡Cruce perfecto! Ninguna de las dos parejas jugó junta antes."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end gap-2">
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
            disabled={
              confirming ||
              (mode === "auto" && !autoMatch) ||
              (mode === "manual" && (!manualValidation.complete || !manualValidation.valid))
            }
            className={`flex items-center gap-1.5 px-5 py-2 text-white text-xs font-bold rounded-xl transition shadow-lg disabled:opacity-50 ${
              mode === "manual" && manualValidation.partnerRepeated
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
            }`}
          >
            <Check size={16} />
            {confirming
              ? "Asignando..."
              : mode === "manual" && manualValidation.partnerRepeated
              ? "Confirmar de Todos Modos e Iniciar"
              : `Confirmar e Iniciar Cancha ${courtNumber}`}
          </button>
        </div>
      </div>
    </div>
  );
}
