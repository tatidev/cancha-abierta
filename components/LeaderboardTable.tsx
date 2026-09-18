"use client";

import React, { useState } from "react";
import { PlayerStats } from "@/lib/types";
import { Trophy, Search, ChevronRight, UserCheck, Pause, Play, Trash2, Edit2 } from "lucide-react";

interface LeaderboardTableProps {
  players: PlayerStats[];
  isAdmin: boolean;
  onSelectPlayer: (player: PlayerStats) => void;
  onTogglePlayerActive?: (playerId: number, active: boolean) => Promise<void>;
  onDeletePlayer?: (playerId: number) => Promise<void>;
}

export default function LeaderboardTable({
  players,
  isAdmin,
  onSelectPlayer,
  onTogglePlayerActive,
  onDeletePlayer,
}: LeaderboardTableProps) {
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Tabla de Posiciones
            </h2>
            <p className="text-xs text-slate-400">
              Puntos calculados por diferencia de games. Tocá un jugador para ver su historial.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3.5 text-center w-12 font-semibold">#</th>
              <th className="py-3 px-3.5 font-semibold">Jugador</th>
              <th className="py-3 px-3.5 text-center font-bold text-emerald-400">
                Puntos (Dif)
              </th>
              <th className="py-3 px-3.5 text-center font-semibold">PJ</th>
              <th className="py-3 px-3.5 text-center font-semibold text-emerald-400">
                PG
              </th>
              <th className="py-3 px-3.5 text-center font-semibold text-slate-400">
                PP
              </th>
              <th className="py-3 px-3.5 text-center font-semibold hidden md:table-cell">
                GF
              </th>
              <th className="py-3 px-3.5 text-center font-semibold hidden md:table-cell">
                GC
              </th>
              <th className="py-3 px-3.5 text-center font-semibold hidden sm:table-cell">
                Parejas
              </th>
              {isAdmin && (
                <th className="py-3 px-3.5 text-center font-semibold w-24">
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player, index) => {
                const isPodium = index < 3;
                const podiumBadges = ["🥇", "🥈", "🥉"];

                return (
                  <tr
                    key={player.id}
                    onClick={() => onSelectPlayer(player)}
                    className="hover:bg-slate-800/50 cursor-pointer transition group"
                  >
                    {/* Position */}
                    <td className="py-3.5 px-3.5 text-center font-bold">
                      {isPodium ? (
                        <span className="text-base">{podiumBadges[index]}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">
                          {index + 1}
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-emerald-400 transition">
                          {player.name}
                        </span>
                        {player.active === 0 && (
                          <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.2 rounded border border-amber-500/30">
                            Pausa
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Points (Net Game Diff) */}
                    <td className="py-3.5 px-3.5 text-center">
                      <span
                        className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                          player.game_diff > 0
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : player.game_diff < 0
                            ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                            : "text-slate-300 bg-slate-800"
                        }`}
                      >
                        {player.game_diff > 0
                          ? `+${player.game_diff}`
                          : player.game_diff}
                      </span>
                    </td>

                    {/* Matches Played (PJ) */}
                    <td className="py-3.5 px-3.5 text-center font-medium text-slate-300">
                      {player.matches_played}
                    </td>

                    {/* Matches Won (PG) */}
                    <td className="py-3.5 px-3.5 text-center font-semibold text-emerald-400">
                      {player.matches_won}
                    </td>

                    {/* Matches Lost (PP) */}
                    <td className="py-3.5 px-3.5 text-center font-medium text-slate-400">
                      {player.matches_lost}
                    </td>

                    {/* Games For (GF) */}
                    <td className="py-3.5 px-3.5 text-center text-slate-300 hidden md:table-cell">
                      {player.games_for}
                    </td>

                    {/* Games Against (GC) */}
                    <td className="py-3.5 px-3.5 text-center text-slate-400 hidden md:table-cell">
                      {player.games_against}
                    </td>

                    {/* Partners Count */}
                    <td className="py-3.5 px-3.5 text-center hidden sm:table-cell">
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        {player.partner_names.length} dupla(s)
                      </span>
                    </td>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <td
                        className="py-3.5 px-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {onTogglePlayerActive && (
                            <button
                              type="button"
                              onClick={() =>
                                onTogglePlayerActive(player.id, player.active === 0)
                              }
                              title={
                                player.active === 1
                                  ? "Pausar jugador (descanso temporal)"
                                  : "Reactivar jugador"
                              }
                              className={`p-1.5 rounded-lg border transition ${
                                player.active === 1
                                  ? "bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border-slate-700"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-emerald-500/20 hover:text-emerald-400"
                              }`}
                            >
                              {player.active === 1 ? (
                                <Pause size={13} />
                              ) : (
                                <Play size={13} />
                              )}
                            </button>
                          )}

                          {onDeletePlayer && player.matches_played === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Seguro que deseas eliminar a ${player.name}?`
                                  )
                                ) {
                                  onDeletePlayer(player.id);
                                }
                              }}
                              title="Eliminar jugador sin partidos"
                              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={isAdmin ? 10 : 9}
                  className="py-10 text-center text-slate-400 italic"
                >
                  {players.length === 0
                    ? "Aún no hay jugadores inscriptos. Utilizá la barra de inscripción superior para comenzar."
                    : "No se encontraron jugadores que coincidan con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
