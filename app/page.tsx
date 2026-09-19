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
import TournamentsModal from "@/components/TournamentsModal";
import AssignCourtModal from "@/components/AssignCourtModal";
import QrModal from "@/components/QrModal";
import { Trophy, PlayCircle, History, Sparkles, Users, RefreshCw, AlertTriangle } from "lucide-react";

export default function PadelApp() {
  // Main tournament state
  const [settings, setSettings] = useState<TournamentSettings>({
    active_tournament_id: 1,
    tournament_name: "Torneo Cancha Libre",
    tournament_date: new Date().toISOString().split("T")[0],
    courts_count: 5,
    target_games: 4,
    admin_pin: "1234",
    status: "active",
  });
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<
    { courtNumber: number; activeMatch: Match | null }[]
  >([]);
  const [currentlyPlayingIds, setCurrentlyPlayingIds] = useState<number[]>([]);

  // Multi-tournament viewing state
  const [viewingTournamentId, setViewingTournamentId] = useState<number | undefined>(undefined);

  // Organization & Session
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"courts" | "standings" | "history">("courts");

  // Modals state
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTournamentsOpen, setIsTournamentsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);

  // Matchmaker modal state
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState(false);
  const [assignCourtNumber, setAssignCourtNumber] = useState<number | null>(null);
  const [proposedMatches, setProposedMatches] = useState<ProposedMatch[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<PlayerStats[]>([]);
  const [matchmakerWarning, setMatchmakerWarning] = useState<string | undefined>();
  const [targetCourtForGen, setTargetCourtForGen] = useState<number | undefined>();

  // Error state for DB connection
  const [dbError, setDbError] = useState<string | null>(null);

  // Fetch tournament state
  const fetchState = useCallback(async (customTournamentId?: number) => {
    try {
      const tId = customTournamentId !== undefined ? customTournamentId : viewingTournamentId;
      const url = tId ? `/api/tournament?tournament_id=${tId}` : "/api/tournament";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error ${res.status} al consultar la base de datos`);
      }
      const data = await res.json();

      setSettings(data.settings);
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setCourts(data.courts || []);
      setCurrentlyPlayingIds(data.currentlyPlayingPlayerIds || []);
      setLastUpdated(new Date());
      setDbError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el servidor";
      console.error("Error fetching tournament state:", err);
      setDbError(msg);
    }
  }, [viewingTournamentId]);

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

  // Tournament switching & management
  const handleSelectTournament = (tId: number) => {
    setViewingTournamentId(tId);
    fetchState(tId);
  };

  const handleBackToActive = () => {
    setViewingTournamentId(undefined);
    fetchState(undefined);
  };

  const handleCreateTournament = async (data: {
    name: string;
    date: string;
    courts_count: number;
    target_games: number;
    copy_players_from_id?: number;
  }) => {
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear nuevo torneo");
    setViewingTournamentId(undefined);
    await fetchState(undefined);
  };

  const handleDeleteTournament = async (tId: number) => {
    const res = await fetch(`/api/tournaments/${tId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar torneo");
    if (viewingTournamentId === tId) {
      setViewingTournamentId(undefined);
    }
    await fetchState(undefined);
  };

  const handleSetActiveTournament = async (tId: number) => {
    const res = await fetch(`/api/tournaments/${tId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al activar torneo");
    setViewingTournamentId(tId);
    await fetchState(tId);
  };

  // Add player
  const handleAddPlayer = async (name: string, phone?: string) => {
    const currentTourneyId = viewingTournamentId || settings.active_tournament_id;
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, tournament_id: currentTourneyId }),
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
    if (courtNumber !== undefined) {
      setAssignCourtNumber(courtNumber);
      return;
    }

    setTargetCourtForGen(undefined);
    const currentTourneyId = viewingTournamentId || settings.active_tournament_id;
    try {
      const res = await fetch("/api/generate-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_id: currentTourneyId }),
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

  // Confirm single match (from AssignCourtModal - Auto or Manual)
  const handleConfirmSingleMatch = async (matchData: {
    court: number;
    round: number;
    t1_p1_id: number;
    t1_p2_id: number;
    t2_p1_id: number;
    t2_p2_id: number;
    allow_repeat?: boolean;
  }) => {
    const currentTourneyId = viewingTournamentId || settings.active_tournament_id;
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...matchData,
        tournament_id: currentTourneyId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al asignar partido");
    await fetchState();
  };

  // Confirm proposed matches
  const handleConfirmProposedMatches = async (matchesToConfirm: ProposedMatch[]) => {
    const currentTourneyId = viewingTournamentId || settings.active_tournament_id;
    const payload = matchesToConfirm.map((m) => ({
      tournament_id: currentTourneyId,
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
      body: JSON.stringify({ matches: payload, tournament_id: currentTourneyId }),
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

  const isViewingArchived =
    viewingTournamentId !== undefined &&
    viewingTournamentId !== settings.active_tournament_id;

  const activeMatchesCount = courts.filter((c) => c.activeMatch !== null).length;
  const finishedMatchesCount = matches.filter((m) => m.status === "finished").length;
  const activePlayersCount = players.filter((p) => p.active === 1).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        tournamentName={settings.tournament_name}
        tournamentDate={settings.tournament_date}
        isViewingArchived={isViewingArchived}
        onBackToActive={handleBackToActive}
        isAdmin={isAdmin}
        adminPin={settings.admin_pin}
        onLoginAdmin={handleLoginAdmin}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenTournaments={() => setIsTournamentsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        lastUpdated={lastUpdated}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* DB Connection Error Banner */}
        {dbError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-sm">Problema de conexión con la Base de Datos</div>
                <div className="text-xs text-amber-200/90 mt-0.5">{dbError}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  En Vercel: Asegúrate de tener <code className="text-amber-300">TURSO_DATABASE_URL</code> y <code className="text-amber-300">TURSO_AUTH_TOKEN</code> y luego haz un <strong className="text-white">Redeploy</strong>.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <a
                href="/api/db-check"
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition font-medium"
              >
                Diagnóstico API ↗
              </a>
              <button
                onClick={() => fetchState()}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

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

        {/* Add Player Bar for Organizers (only if active tournament) */}
        {isAdmin && !isViewingArchived && (
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
            <span>Posiciones</span>
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
            isAdmin={isAdmin && !isViewingArchived}
            onOpenScoreModal={(m) => setScoringMatch(m)}
            onGenerateMatches={handleGenerateMatches}
            onUpdateCourtsCount={handleQuickCourtsChange}
          />
        )}

        {activeTab === "standings" && (
          <LeaderboardTable
            players={players}
            isAdmin={isAdmin && !isViewingArchived}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onTogglePlayerActive={handleTogglePlayerActive}
            onDeletePlayer={handleDeletePlayer}
          />
        )}

        {activeTab === "history" && (
          <MatchHistorySection
            matches={matches}
            isAdmin={isAdmin && !isViewingArchived}
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

      <TournamentsModal
        isOpen={isTournamentsOpen}
        onClose={() => setIsTournamentsOpen(false)}
        activeTournamentId={settings.active_tournament_id}
        currentViewingTournamentId={viewingTournamentId || settings.active_tournament_id}
        isAdmin={isAdmin}
        onSelectTournament={handleSelectTournament}
        onCreateTournament={handleCreateTournament}
        onDeleteTournament={handleDeleteTournament}
        onSetActiveTournament={handleSetActiveTournament}
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
        onRegenerate={() => handleGenerateMatches()}
      />

      {assignCourtNumber !== null && (
        <AssignCourtModal
          isOpen={assignCourtNumber !== null}
          onClose={() => setAssignCourtNumber(null)}
          courtNumber={assignCourtNumber}
          currentRound={
            matches.reduce((max, m) => (m.round > max ? m.round : max), 0) + 1
          }
          players={players}
          matches={matches}
          currentlyPlayingIds={currentlyPlayingIds}
          onConfirmMatch={handleConfirmSingleMatch}
        />
      )}

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
