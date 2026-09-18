"use client";

import React, { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  TournamentSettings,
  PlayerStats,
  Match,
  ProposedMatch,
} from "@/lib/types";
import Navbar from "@/components/Navbar";
import AddPlayerBar from "@/components/AddPlayerBar";
import CourtsSection from "@/components/CourtsSection";
import LeaderboardTable from "@/components/LeaderboardTable";
import MatchHistorySection from "@/components/MatchHistorySection";
import ScoreModal from "@/components/ScoreModal";
import MatchmakerModal from "@/components/MatchmakerModal";
import PlayerModal from "@/components/PlayerModal";
import SettingsModal from "@/components/SettingsModal";
import QrModal from "@/components/QrModal";
import { Trophy, PlayCircle, History, Sparkles, Users, RefreshCw } from "lucide-react";

export default function PadelApp() {
  // Main tournament state
  const [settings, setSettings] = useState<TournamentSettings>({
    tournament_name: "Torneo Americano de Pádel",
    courts_count: 5,
    target_games: 4,
    admin_pin: "1234",
    status: "in_progress",
  });
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<
    { courtNumber: number; activeMatch: Match | null }[]
  >([]);
  const [currentlyPlayingIds, setCurrentlyPlayingIds] = useState<number[]>([]);

  // Organization & Session
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"courts" | "standings" | "history">("courts");

  // Modals state
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);

  // Matchmaker modal state
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState(false);
  const [proposedMatches, setProposedMatches] = useState<ProposedMatch[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<PlayerStats[]>([]);
  const [matchmakerWarning, setMatchmakerWarning] = useState<string | undefined>();
  const [targetCourtForGen, setTargetCourtForGen] = useState<number | undefined>();

  // Fetch tournament state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/tournament", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al consultar el servidor");
      const data = await res.json();

      setSettings(data.settings);
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setCourts(data.courts || []);
      setCurrentlyPlayingIds(data.currentlyPlayingPlayerIds || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching tournament state:", err);
    }
  }, []);

  // Initialize and check admin session
  useEffect(() => {
    fetchState();

    if (typeof window !== "undefined") {
      const savedAdmin = localStorage.getItem("padel_admin_authenticated");
      if (savedAdmin === "true") {
        setIsAdmin(true);
      }
    }

    // Auto-refresh every 5 seconds for live real-time sync across all devices
    const interval = setInterval(() => {
      fetchState();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchState]);

  // Admin login / logout
  const handleLoginAdmin = () => {
    setIsAdmin(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("padel_admin_authenticated", "true");
    }
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("padel_admin_authenticated");
    }
  };

  // Add player
  const handleAddPlayer = async (name: string, phone?: string) => {
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo agregar al jugador");
    await fetchState();
  };

  // Toggle player active
  const handleTogglePlayerActive = async (playerId: number, active: boolean) => {
    const res = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error("Error al modificar estado del jugador");
    await fetchState();
  };

  // Delete player
  const handleDeletePlayer = async (playerId: number) => {
    const res = await fetch(`/api/players/${playerId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Error al eliminar jugador");
    await fetchState();
  };

  // Matchmaking: Generate matches
  const handleGenerateMatches = async (courtNumber?: number) => {
    setTargetCourtForGen(courtNumber);
    try {
      const res = await fetch("/api/generate-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudieron generar partidos");
        return;
      }

      setProposedMatches(data.proposedMatches || []);
      setWaitingPlayers(data.waitingPlayers || []);
      setMatchmakerWarning(data.warning);
      setIsMatchmakerOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar";
      alert(msg);
    }
  };

  // Confirm proposed matches
  const handleConfirmProposedMatches = async (matchesToConfirm: ProposedMatch[]) => {
    const payload = matchesToConfirm.map((m) => ({
      court: m.court,
      round: m.round,
      t1_p1_id: m.team1[0].id,
      t1_p2_id: m.team1[1].id,
      t2_p1_id: m.team2[0].id,
      t2_p2_id: m.team2[1].id,
    }));

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: payload }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar partidos");

    await fetchState();
  };

  // Save match score
  const handleSaveScore = async (
    matchId: number,
    t1_games: number,
    t2_games: number
  ) => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish", t1_games, t2_games }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al registrar resultado");

    // Nice visual celebration
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    await fetchState();
  };

  // Cancel match
  const handleCancelMatch = async (matchId: number) => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cancelar partido");
    await fetchState();
  };

  // Delete match
  const handleDeleteMatch = async (matchId: number) => {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar partido");
    await fetchState();
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<TournamentSettings>) => {
    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar configuración");
    await fetchState();
  };

  // Reset Tournament
  const handleResetTournament = async (keepPlayers: boolean) => {
    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_tournament", keepPlayers }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al reiniciar torneo");
    await fetchState();
  };

  // Quick court count change
  const handleQuickCourtsChange = async (count: number) => {
    await handleUpdateSettings({ courts_count: count });
  };

  const activeMatchesCount = courts.filter((c) => c.activeMatch !== null).length;
  const finishedMatchesCount = matches.filter((m) => m.status === "finished").length;
  const activePlayersCount = players.filter((p) => p.active === 1).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        tournamentName={settings.tournament_name}
        isAdmin={isAdmin}
        adminPin={settings.admin_pin}
        onLoginAdmin={handleLoginAdmin}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        lastUpdated={lastUpdated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              🎾
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Canchas</span>
              <span className="text-lg font-bold text-white">
                {activeMatchesCount} / {settings.courts_count} en juego
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
              👥
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Inscriptos</span>
              <span className="text-lg font-bold text-white">
                {players.length} ({activePlayersCount} activos)
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
              🏆
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Partidos Jugados</span>
              <span className="text-lg font-bold text-white">
                {finishedMatchesCount} finalizados
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              🎯
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Regla Formato</span>
              <span className="text-lg font-bold text-emerald-400 truncate">
                A {settings.target_games} games (Dif)
              </span>
            </div>
          </div>
        </div>

        {/* Add Player Bar for Organizers */}
        {isAdmin && (
          <AddPlayerBar onAddPlayer={handleAddPlayer} />
        )}

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("courts")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "courts"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <PlayCircle size={18} />
            <span>Canchas en Juego</span>
            {activeMatchesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded-full text-[10px] font-black ml-1">
                {activeMatchesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("standings")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "standings"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Trophy size={18} />
            <span>Posiciones en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "history"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <History size={18} />
            <span>Historial ({finishedMatchesCount})</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === "courts" && (
          <CourtsSection
            courts={courts}
            isAdmin={isAdmin}
            onOpenScoreModal={(m) => setScoringMatch(m)}
            onGenerateMatches={handleGenerateMatches}
            onUpdateCourtsCount={handleQuickCourtsChange}
          />
        )}

        {activeTab === "standings" && (
          <LeaderboardTable
            players={players}
            isAdmin={isAdmin}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onTogglePlayerActive={handleTogglePlayerActive}
            onDeletePlayer={handleDeletePlayer}
          />
        )}

        {activeTab === "history" && (
          <MatchHistorySection
            matches={matches}
            isAdmin={isAdmin}
            onEditMatch={(m) => setScoringMatch(m)}
            onDeleteMatch={handleDeleteMatch}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-4 text-center text-xs text-slate-500">
        <p>Sistema de Gestión de Torneos de Pádel • Americano Individual con Rotación de Parejas</p>
      </footer>

      {/* Modals */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        tournamentName={settings.tournament_name}
      />

      <PlayerModal
        player={selectedPlayer}
        matches={matches}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
      />

      <ScoreModal
        match={scoringMatch}
        targetGames={settings.target_games}
        isOpen={scoringMatch !== null}
        onClose={() => setScoringMatch(null)}
        onSaveScore={handleSaveScore}
        onCancelMatch={handleCancelMatch}
      />

      <MatchmakerModal
        isOpen={isMatchmakerOpen}
        onClose={() => setIsMatchmakerOpen(false)}
        proposedMatches={proposedMatches}
        waitingPlayers={waitingPlayers}
        warning={matchmakerWarning}
        onConfirm={handleConfirmProposedMatches}
        onRegenerate={() => handleGenerateMatches(targetCourtForGen)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetTournament={handleResetTournament}
      />
    </div>
  );
}
