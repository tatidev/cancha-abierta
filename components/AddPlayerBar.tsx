"use client";

import React, { useState } from "react";
import { UserPlus, Sparkles, Check } from "lucide-react";

interface AddPlayerBarProps {
  onAddPlayer: (name: string, phone?: string) => Promise<void>;
}

export default function AddPlayerBar({ onAddPlayer }: AddPlayerBarProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await onAddPlayer(name.trim(), phone.trim() || undefined);
      setName("");
      setPhone("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar jugador";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <UserPlus size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Inscripción de Jugadores
            </h3>
            <p className="text-[11px] text-slate-400">
              Podés sumar nuevos jugadores en cualquier momento del torneo.
            </p>
          </div>
        </div>

        {success && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full animate-fade-in">
            <Check size={14} /> ¡Jugador agregado con éxito!
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y Apellido del jugador..."
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
            required
            disabled={loading}
          />
        </div>

        <div className="sm:w-48">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <UserPlus size={16} />
          {loading ? "Inscribiendo..." : "Anotar Jugador"}
        </button>
      </form>
    </div>
  );
}
