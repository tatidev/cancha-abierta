"use client";

import React from "react";
import { PlayerStats, Match } from "@/lib/types";
import { X, User, Trophy, Users, Shield, Award, Calendar } from "lucide-react";

interface PlayerModalProps {
  player: PlayerStats | null;
  matches: Match[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerModal({
  player,
  matches,
  isOpen,
  onClose,
}: PlayerModalProps) {
  if (!isOpen || !player) return null;

  // Filter matches involving this player
  const playerMatches = matches.filter(
    (m) =>
      (m.t1_p1_id === player.id ||
        m.t1_p2_id === player.id ||
        m.t2_p1_id === player.id ||
        m.t2_p2_id === player.id) &&
      m.status === "finished"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 font-bold text-xl">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {player.name}
                {player.active === 0 && (
                  <span className="text-[10px] uppercase font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    En Pausa
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Ficha individual y estadísticas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Puntos</span>
              <span
                className={`text-xl font-bold ${
                  player.game_diff > 0
                    ? "text-emerald-400"
                    : player.game_diff < 0
                    ? "text-rose-400"
                    : "text-slate-200"
                }`}
              >
                {player.game_diff > 0 ? `+${player.game_diff}` : player.game_diff}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Partidos</span>
              <span className="text-xl font-bold text-white">
                {player.matches_played}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Victorias</span>
              <span className="text-xl font-bold text-emerald-400">
                {player.matches_won}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">Derrotas</span>
              <span className="text-xl font-bold text-slate-300">
                {player.matches_lost}
              </span>
            </div>
          </div>

          {/* Games For / Against */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 flex justify-between items-center text-xs text-slate-300">
            <div>
              Games a favor: <span className="font-semibold text-emerald-400">{player.games_for}</span>
            </div>
            <div>
              Games en contra: <span className="font-semibold text-rose-400">{player.games_against}</span>
            </div>
            <div>
              Efectividad:{" "}
              <span className="font-semibold text-cyan-400">
                {player.matches_played > 0
                  ? Math.round((player.matches_won / player.matches_played) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Partners History (Crucial for rule compliance) */}
          <div>
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-2">
              <Users size={16} />
              Parejas con las que ya jugó ({player.partner_names.length})
            </h4>
            <p className="text-[11px] text-slate-400 mb-2.5">
              * El sistema garantiza que no volverá a formar dupla con estas personas.
            </p>
            {player.partner_names.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {player.partner_names.map((name, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                Aún no disputó partidos en el torneo.
              </p>
            )}
          </div>

          {/* Opponents History */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <Shield size={16} />
              Rivales que ya enfrentó ({player.opponent_names.length})
            </h4>
            {player.opponent_names.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {player.opponent_names.map((name, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                Sin rivales previos aún.
              </p>
            )}
          </div>

          {/* Match Log for Player */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
              <Calendar size={16} />
              Historial de Partidos ({playerMatches.length})
            </h4>
            {playerMatches.length > 0 ? (
              <div className="space-y-2">
                {playerMatches.map((m) => {
                  const isTeam1 = m.t1_p1_id === player.id || m.t1_p2_id === player.id;
                  const partnerName = isTeam1
                    ? m.t1_p1_id === player.id ? m.t1_p2_name : m.t1_p1_name
                    : m.t2_p1_id === player.id ? m.t2_p2_name : m.t2_p1_name;

                  const opp1 = isTeam1 ? m.t2_p1_name : m.t1_p1_name;
                  const opp2 = isTeam1 ? m.t2_p2_name : m.t1_p2_name;

                  const myGames = isTeam1 ? m.t1_games! : m.t2_games!;
                  const oppGames = isTeam1 ? m.t2_games! : m.t1_games!;
                  const diff = myGames - oppGames;
                  const won = diff > 0;

                  return (
                    <div
                      key={m.id}
                      className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] text-slate-400">
                          Ronda {m.round} • Cancha {m.court}
                        </div>
                        <div className="text-slate-200">
                          Con <span className="font-semibold text-emerald-300">{partnerName}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          vs {opp1} y {opp2}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span
                          className={`text-base font-bold ${
                            won ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {myGames} - {oppGames}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            won
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {won ? `+${diff} pts` : `${diff} pts`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-800/40 p-3 rounded-lg border border-slate-800 text-center">
                Sin partidos finalizados aún.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
