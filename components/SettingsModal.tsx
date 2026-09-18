"use client";

import React, { useState } from "react";
import { TournamentSettings } from "@/lib/types";
import { X, Settings, Plus, Minus, Save, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TournamentSettings;
  onUpdateSettings: (newSettings: Partial<TournamentSettings>) => Promise<void>;
  onResetTournament: (keepPlayers: boolean) => Promise<void>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetTournament,
}: SettingsModalProps) {
  const [courtsCount, setCourtsCount] = useState<number>(settings.courts_count || 5);
  const [targetGames, setTargetGames] = useState<number>(settings.target_games || 4);
  const [tournamentName, setTournamentName] = useState<string>(settings.tournament_name || "");
  const [adminPin, setAdminPin] = useState<string>(settings.admin_pin || "1234");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [keepPlayersOnReset, setKeepPlayersOnReset] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      await onUpdateSettings({
        courts_count: courtsCount,
        target_games: targetGames,
        tournament_name: tournamentName,
        admin_pin: adminPin,
      });
      setMessage("Configuración guardada con éxito.");
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      await onResetTournament(keepPlayersOnReset);
      setConfirmReset(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al reiniciar";
      alert(msg);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Configuración del Torneo</h3>
              <p className="text-xs text-slate-400">Ajustá canchas, reglas y seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5">
          {message && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold">
              {message}
            </div>
          )}

          {/* Tournament Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nombre del Torneo / Evento
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-emerald-500"
              placeholder="Ej: Torneo Americano Nocturno"
              required
            />
          </div>

          {/* Courts Count (Dynamic Requirement) */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-white block">
                  Cantidad de Canchas Activas
                </label>
                <p className="text-xs text-slate-400">
                  Podés aumentarla o disminuirla en cualquier momento según la disponibilidad del club.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCourtsCount((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  <Minus size={16} />
                </button>
                <span className="text-xl font-extrabold text-emerald-400 w-8 text-center">
                  {courtsCount}
                </span>
                <button
                  type="button"
                  onClick={() => setCourtsCount((prev) => Math.min(20, prev + 1))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Target Games */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Games objetivo para ganar el partido
            </label>
            <div className="flex items-center gap-3">
              {[3, 4, 5, 6].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTargetGames(g)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                    targetGames === g
                      ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {g} Games {g === 4 ? "(Estándar)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Admin PIN */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-400" />
              PIN de Acceso a Mesa de Control
            </label>
            <input
              type="text"
              maxLength={8}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-emerald-500"
              placeholder="1234"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Código para que solo los organizadores puedan cargar resultados y gestionar partidos.
            </p>
          </div>

          {/* Danger Zone: Reset */}
          <div className="pt-4 border-t border-slate-800">
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Zona de Peligro
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reiniciar el torneo para comenzar uno nuevo.
                  </p>
                </div>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
                  >
                    Reiniciar Torneo
                  </button>
                ) : null}
              </div>

              {confirmReset && (
                <div className="mt-3 p-3 bg-slate-900/90 rounded-lg border border-rose-500/50 space-y-2.5 text-xs">
                  <p className="text-slate-200 font-semibold">
                    ¿Confirmas el reinicio del torneo? Se borrarán los partidos y resultados acumulados.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="keepPlayers"
                      checked={keepPlayersOnReset}
                      onChange={(e) => setKeepPlayersOnReset(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <label htmlFor="keepPlayers" className="text-slate-300 cursor-pointer">
                      Mantener la lista de jugadores inscritos (solo borrar partidos)
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteReset}
                      disabled={resetting}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold transition disabled:opacity-50"
                    >
                      {resetting ? "Reiniciando..." : "Sí, Reiniciar Ahora"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
