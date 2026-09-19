"use client";

import React, { useState, useEffect } from "react";
import { Tournament } from "@/lib/types";
import {
  X,
  Trophy,
  Calendar,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  History,
  AlertTriangle,
  Play,
} from "lucide-react";

interface TournamentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTournamentId: number;
  currentViewingTournamentId: number;
  isAdmin: boolean;
  onSelectTournament: (tournamentId: number) => void;
  onCreateTournament: (data: {
    name: string;
    date: string;
    courts_count: number;
    target_games: number;
    copy_players_from_id?: number;
  }) => Promise<void>;
  onDeleteTournament: (tournamentId: number) => Promise<void>;
  onSetActiveTournament: (tournamentId: number) => Promise<void>;
}

export default function TournamentsModal({
  isOpen,
  onClose,
  activeTournamentId,
  currentViewingTournamentId,
  isAdmin,
  onSelectTournament,
  onCreateTournament,
  onDeleteTournament,
  onSetActiveTournament,
}: TournamentsModalProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCourts, setNewCourts] = useState(5);
  const [newTargetGames, setNewTargetGames] = useState(4);
  const [copyPlayers, setCopyPlayers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tournaments");
      if (!res.ok) throw new Error("Error al consultar torneos");
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch (err) {
      console.error("Error loading tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
      setNewDate(new Date().toISOString().split("T")[0]);
      setShowCreateForm(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      await onCreateTournament({
        name: newName.trim(),
        date: newDate.trim() || new Date().toISOString().split("T")[0],
        courts_count: newCourts,
        target_games: newTargetGames,
        copy_players_from_id: copyPlayers ? activeTournamentId : undefined,
      });
      setNewName("");
      setShowCreateForm(false);
      await fetchTournaments();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear torneo";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tId: number, tName: string) => {
    if (
      confirm(
        `¿Estás seguro de que deseas eliminar permanentemente el torneo "${tName}"? Se borrarán sus jugadores, partidos y estadísticas registradas.`
      )
    ) {
      try {
        await onDeleteTournament(tId);
        await fetchTournaments();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar torneo";
        alert(msg);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      if (year && month && day) return `${day}/${month}/${year}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <History size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Historial de Torneos</h3>
              <p className="text-xs text-slate-400">
                Gestioná y consultá todos los torneos del club
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

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Tournament Button / Form Toggle */}
          {isAdmin && !showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Plus size={16} />
              Iniciar / Crear Nuevo Torneo
            </button>
          )}

          {/* Create Tournament Form */}
          {isAdmin && showCreateForm && (
            <form
              onSubmit={handleCreateSubmit}
              className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-4 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Trophy size={16} /> Nuevo Torneo
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* Tournament Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nombre del Torneo:
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Americano Viernes Noche"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Fecha del Torneo:
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Courts */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Canchas iniciales:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newCourts}
                    onChange={(e) => setNewCourts(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Target Games */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Games por partido:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTargetGames}
                    onChange={(e) =>
                      setNewTargetGames(parseInt(e.target.value, 10) || 4)
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Copy Players Checkbox */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={copyPlayers}
                    onChange={(e) => setCopyPlayers(e.target.checked)}
                    className="rounded accent-emerald-500 mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-white block">
                      Copiar lista de jugadores del torneo actual
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Para no tener que anotarlos de nuevo. En el nuevo torneo empezarán de cero (0 partidos y sin parejas previas).
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {creating ? "Creando..." : "Crear e Iniciar"}
                </button>
              </div>
            </form>
          )}

          {/* Tournaments List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Todos los Torneos ({tournaments.length})
            </h4>

            {tournaments.map((t) => {
              const isActive = t.id === activeTournamentId;
              const isViewing = t.id === currentViewingTournamentId;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isViewing
                      ? "bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/30"
                      : "bg-slate-800/50 border-slate-700/60 hover:border-slate-600"
                  }`}
                >
                  {/* Left Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{t.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                          ACTIVO
                        </span>
                      )}
                      {isViewing && !isActive && (
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-bold">
                          VIENDO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {formatDate(t.date)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={13} /> {t.players_count || 0} jugadores
                      </span>
                      <span>•</span>
                      <span>{t.matches_count || 0} partidos</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTournament(t.id);
                        onClose();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isViewing
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                      }`}
                    >
                      <Eye size={13} />
                      {isViewing ? "Viendo ahora" : "Ver Torneo"}
                    </button>

                    {isAdmin && !isActive && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onSetActiveTournament(t.id);
                          await fetchTournaments();
                        }}
                        title="Establecer este torneo como el torneo en juego actual"
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 rounded-lg text-xs font-semibold transition border border-slate-600"
                      >
                        Activar
                      </button>
                    )}

                    {isAdmin && tournaments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        title="Eliminar torneo e historial"
                        className="p-1.5 bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition border border-slate-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
