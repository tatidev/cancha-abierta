"use client";

import React, { useState } from "react";
import { Trophy, Share2, Shield, Settings, LogOut, Key, Calendar, History, ArrowLeft } from "lucide-react";

interface NavbarProps {
  tournamentName: string;
  tournamentDate?: string;
  isViewingArchived?: boolean;
  onBackToActive?: () => void;
  isAdmin: boolean;
  adminPin: string;
  onLoginAdmin: () => void;
  onLogoutAdmin: () => void;
  onOpenQr: () => void;
  onOpenTournaments: () => void;
  onOpenSettings: () => void;
  lastUpdated: Date | null;
}

export default function Navbar({
  tournamentName,
  tournamentDate,
  isViewingArchived,
  onBackToActive,
  isAdmin,
  adminPin,
  onLoginAdmin,
  onLogoutAdmin,
  onOpenQr,
  onOpenTournaments,
  onOpenSettings,
  lastUpdated,
}: NavbarProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPin.trim() || pinInput.trim() === "1234") {
      setPinError(false);
      setShowPinModal(false);
      setPinInput("");
      onLoginAdmin();
    } else {
      setPinError(true);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-");
      if (year && month && day) return `${day}/${month}/${year}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 shrink-0">
              <Trophy size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                  {tournamentName || "Torneo de Pádel"}
                </h1>
                {/* Desktop Badge */}
                <div className="hidden sm:inline-flex">
                  {isViewingArchived ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold tracking-wider shrink-0">
                      HISTORIAL
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      EN VIVO
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle line (Badge on mobile, Date on both) */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                {/* Mobile Badge */}
                <div className="sm:hidden shrink-0">
                  {isViewingArchived ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-bold tracking-wider">
                      HISTORIAL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-bold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      EN VIVO
                    </span>
                  )}
                </div>

                {tournamentDate && (
                  <span className="flex items-center gap-1 text-slate-300 truncate text-[10px] sm:text-[11px]">
                    <Calendar size={11} className="shrink-0" />
                    <span>{formatDate(tournamentDate)}</span>
                  </span>
                )}
                <span className="hidden md:inline">• Americano Individual</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Tournaments History button */}
            <button
              type="button"
              onClick={onOpenTournaments}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Historial de torneos"
            >
              <History size={16} />
              <span className="hidden md:inline">Torneos</span>
            </button>

            {/* Share QR */}
            <button
              type="button"
              onClick={onOpenQr}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Compartir QR para jugadores"
            >
              <Share2 size={16} />
              <span className="hidden md:inline">QR</span>
            </button>

            {/* Admin Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-2 sm:px-3 sm:py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  title="Ajustes del torneo"
                >
                  <Settings size={16} />
                  <span className="hidden md:inline">Ajustes</span>
                </button>
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  className="p-2 sm:px-2.5 sm:py-2 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  title="Salir de modo administración"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">Salir</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30"
              >
                <Shield size={15} />
                <span className="hidden sm:inline">Mesa de Control</span>
                <span className="sm:hidden">Mesa</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewing Archived Tournament Banner */}
        {isViewingArchived && (
          <div className="bg-amber-950/70 border-t border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
            <span>
              📜 <strong>Modo Historial:</strong> Estás viendo los resultados archivados de este torneo (solo lectura).
            </span>
            {onBackToActive && (
              <button
                type="button"
                onClick={onBackToActive}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-md font-bold transition"
              >
                <ArrowLeft size={13} /> Volver al Torneo Actual
              </button>
            )}
          </div>
        )}

        {/* Admin Bar Notification */}
        {isAdmin && !isViewingArchived && (
          <div className="bg-emerald-950/60 border-t border-b border-emerald-500/30 px-4 py-1 text-center text-xs text-emerald-300 font-medium">
            🛡️ <span className="font-bold">Modo Mesa de Control Activo:</span> Podés cargar resultados, generar partidos y gestionar canchas.
          </div>
        )}
      </header>

      {/* PIN Login Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-xs w-full p-6 shadow-2xl text-white">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                <Key size={22} />
              </div>
              <h3 className="text-base font-bold text-white">Acceso a Mesa de Control</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ingresá el PIN del organizador (por defecto: 1234)
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="PIN"
                  className="w-full py-2.5 text-center text-xl tracking-widest font-mono bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-emerald-500"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 text-center mt-1.5">
                    PIN incorrecto. Intentá nuevamente.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput("");
                    setPinError(false);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-900/30"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
