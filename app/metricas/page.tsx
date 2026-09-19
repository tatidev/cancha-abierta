"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Users,
  Trophy,
  PlayCircle,
  Eye,
  QrCode,
  Key,
  ShieldCheck,
  Lock,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  LogOut,
} from "lucide-react";

interface AnalyticsData {
  kpis: {
    total_views: number;
    views_today: number;
    total_qr_opens: number;
    total_admin_logins: number;
    total_matches_assigned: number;
    total_scores_recorded: number;
    total_tournaments: number;
    total_matches: number;
    finished_matches: number;
    active_matches: number;
    total_games: number;
    total_players: number;
    active_players: number;
  };
  timeline: {
    date: string;
    views: number;
    scores: number;
    total_actions: number;
  }[];
  recent_events: {
    id: number;
    event_type: string;
    tournament_id?: number | null;
    metadata?: string | null;
    user_agent?: string | null;
    created_at: string;
  }[];
  tournaments: {
    id: number;
    name: string;
    date: string;
    courts_count: number;
    status: string;
    created_at: string;
    players_count: number;
    matches_count: number;
  }[];
  top_players: {
    name: string;
    tournaments_played: number;
  }[];
}

export default function MetricasPage() {
  const [pin, setPin] = useState("");
  const [authPin, setAuthPin] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check stored PIN on mount or URL param ?pin=
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get("pin");
      const savedPin = sessionStorage.getItem("metrics_auth_pin");

      const pinToTry = urlPin || savedPin;
      if (pinToTry) {
        setAuthPin(pinToTry);
      }
    }
  }, []);

  // Fetch data when authenticated
  const fetchData = useCallback(
    async (targetPin?: string) => {
      const activePin = targetPin || authPin;
      if (!activePin) return;

      setLoading(true);
      setAuthError(null);

      try {
        const res = await fetch(
          `/api/analytics?pin=${encodeURIComponent(activePin)}`,
          {
            headers: {
              "x-metrics-pin": activePin,
            },
            cache: "no-store",
          }
        );

        if (res.status === 401) {
          setAuthError("PIN incorrecto o expirado.");
          setAuthPin(null);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("metrics_auth_pin");
          }
          setData(null);
          return;
        }

        if (!res.ok) {
          throw new Error("Error al consultar las métricas");
        }

        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
        if (typeof window !== "undefined") {
          sessionStorage.setItem("metrics_auth_pin", activePin);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Error de comunicación";
        setAuthError(msg);
      } finally {
        setLoading(false);
      }
    },
    [authPin]
  );

  useEffect(() => {
    if (authPin) {
      fetchData(authPin);
    }
  }, [authPin, fetchData]);

  // Auto refresh every 20 seconds
  useEffect(() => {
    if (!authPin || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 20000);
    return () => clearInterval(interval);
  }, [authPin, autoRefresh, fetchData]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setAuthPin(pin.trim());
    fetchData(pin.trim());
  };

  const handleLogout = () => {
    setAuthPin(null);
    setData(null);
    setPin("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("metrics_auth_pin");
    }
  };

  const getEventBadge = (type: string, metaStr?: string | null) => {
    let parsedMeta: Record<string, unknown> = {};
    try {
      if (metaStr) parsedMeta = JSON.parse(metaStr);
    } catch {}

    switch (type) {
      case "page_view":
        return {
          icon: <Eye className="w-3.5 h-3.5 text-cyan-400" />,
          label: parsedMeta.is_mobile
            ? "Visita (Móvil)"
            : "Visita a la Web",
          color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
        };
      case "match_assigned":
        return {
          icon: <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />,
          label: `Partido Asignado (${parsedMeta.count || 1})`,
          color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        };
      case "score_recorded":
        return {
          icon: <Trophy className="w-3.5 h-3.5 text-amber-400" />,
          label: `Resultado: ${parsedMeta.score || "Guardado"}`,
          color: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        };
      case "player_added":
        return {
          icon: <Users className="w-3.5 h-3.5 text-violet-400" />,
          label: `Jugador: ${parsedMeta.name || "Nuevo"}`,
          color: "bg-violet-500/10 border-violet-500/30 text-violet-300",
        };
      case "qr_opened":
        return {
          icon: <QrCode className="w-3.5 h-3.5 text-pink-400" />,
          label: "QR de Torneo abierto",
          color: "bg-pink-500/10 border-pink-500/30 text-pink-300",
        };
      case "admin_login":
        return {
          icon: <Key className="w-3.5 h-3.5 text-amber-400" />,
          label: "Acceso a Mesa de Control",
          color: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        };
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
          label: type,
          color: "bg-slate-800 border-slate-700 text-slate-300",
        };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      // Parse UTC/local correctly
      const date = new Date(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`);
      const diffSecs = Math.max(
        0,
        Math.floor((now.getTime() - date.getTime()) / 1000)
      );

      if (diffSecs < 60) return "hace unos segundos";
      if (diffSecs < 3600) return `hace ${Math.floor(diffSecs / 60)} min`;
      if (diffSecs < 86400) return `hace ${Math.floor(diffSecs / 3600)} h`;
      return `hace ${Math.floor(diffSecs / 86400)} d`;
    } catch {
      return dateStr;
    }
  };

  // 1. If not authenticated, render Login Screen
  if (!authPin || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
            <Lock className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-center text-white mb-2">
            Telemetría y Estadísticas
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6 leading-relaxed">
            Panel privado de uso y monitoreo del sistema{" "}
            <strong className="text-white">Cancha Abierta</strong>. Ingresá el
            PIN para acceder.
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                PIN de Acceso
              </label>
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.4em] py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>

            {authError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {loading ? "Verificando..." : "Ingresar al Panel"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al Torneo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Dashboard
  const { kpis, timeline, recent_events, tournaments, top_players } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="Volver al torneo"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Cancha Abierta • Métricas
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En Vivo
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Monitoreo de uso, visitas, partidos y telemetría de torneos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <span className="hidden md:inline text-[11px] text-slate-400">
                Actualizado: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 font-medium ${
                autoRefresh
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoRefresh ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              Auto-sync {autoRefresh ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Actualizar ahora"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Visitas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Visitas Web</span>
              <Eye className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.total_views}
              </span>
              <span className="block text-[11px] text-cyan-400 font-medium mt-0.5">
                +{kpis.views_today} hoy
              </span>
            </div>
          </div>

          {/* Card 2: Partidos */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Partidos</span>
              <PlayCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.finished_matches}
              </span>
              <span className="block text-[11px] text-emerald-400 font-medium mt-0.5">
                {kpis.active_matches} en juego
              </span>
            </div>
          </div>

          {/* Card 3: Games */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Games Jugados</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.total_games}
              </span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                en todos los torneos
              </span>
            </div>
          </div>

          {/* Card 4: Jugadores */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Inscripciones</span>
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.total_players}
              </span>
              <span className="block text-[11px] text-violet-400 font-medium mt-0.5">
                {kpis.active_players} activos
              </span>
            </div>
          </div>

          {/* Card 5: Torneos */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">Torneos</span>
              <Calendar className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.total_tournaments}
              </span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                creados
              </span>
            </div>
          </div>

          {/* Card 6: QR Scans & Mesa */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold">QR / Mesa</span>
              <QrCode className="w-4 h-4 text-lime-400" />
            </div>
            <div>
              <span className="text-2xl font-black text-white">
                {kpis.total_qr_opens}
              </span>
              <span className="block text-[11px] text-lime-400 font-medium mt-0.5">
                {kpis.total_admin_logins} logins mesa
              </span>
            </div>
          </div>
        </div>

        {/* Middle Section: Timeline & Recent Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Activity Timeline & Tournaments Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Timeline Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">
                    Actividad Reciente (Últimos 14 días)
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Visitas y Resultados
                </span>
              </div>

              {timeline.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Aún no hay actividad registrada en los últimos 14 días.
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((item) => {
                    const maxCount = Math.max(
                      ...timeline.map((t) => t.total_actions),
                      10
                    );
                    const percent = Math.min(
                      100,
                      Math.round((item.total_actions / maxCount) * 100)
                    );

                    return (
                      <div key={item.date} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-300 font-semibold">
                            {item.date}
                          </span>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-cyan-400">
                              👁️ {item.views} visitas
                            </span>
                            <span className="text-amber-400">
                              🏆 {item.scores} partidos
                            </span>
                            <span className="text-slate-400 font-bold">
                              {item.total_actions} acciones
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tournaments List Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">
                    Historial de Torneos Realizados
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  {tournaments.length} torneos registrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Torneo</th>
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold text-center">Canchas</th>
                      <th className="pb-3 font-semibold text-center">Jugadores</th>
                      <th className="pb-3 font-semibold text-center">Partidos</th>
                      <th className="pb-3 font-semibold text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tournaments.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-bold text-white flex items-center gap-2">
                          <span>🎾</span>
                          {t.name}
                        </td>
                        <td className="py-3 font-mono text-slate-300">
                          {t.date}
                        </td>
                        <td className="py-3 text-center text-slate-300">
                          {t.courts_count}
                        </td>
                        <td className="py-3 text-center font-bold text-cyan-400">
                          {t.players_count}
                        </td>
                        <td className="py-3 text-center font-bold text-emerald-400">
                          {t.matches_count}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {t.status === "active" ? "Activo" : "Archivado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live Activity Stream & Top Players */}
          <div className="space-y-6">
            {/* Live Activity Feed */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">
                    Feed de Eventos en Vivo
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">Últimos 50</span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {recent_events.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No hay eventos recientes aún.
                  </div>
                ) : (
                  recent_events.map((ev) => {
                    const badge = getEventBadge(ev.event_type, ev.metadata);
                    return (
                      <div
                        key={ev.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                            {badge.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-white truncate block">
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatTimeAgo(ev.created_at)}
                            </span>
                          </div>
                        </div>

                        {ev.tournament_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-mono">
                            T#{ev.tournament_id}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Players across Tournaments */}
            {top_players.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">
                    Jugadores Más Frecuentes
                  </h2>
                </div>
                <div className="space-y-2">
                  {top_players.slice(0, 5).map((player, idx) => (
                    <div
                      key={player.name}
                      className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded-xl border border-slate-800/60"
                    >
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <span className="w-4 text-slate-500 font-mono font-bold">
                          #{idx + 1}
                        </span>
                        <span className="capitalize">{player.name}</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        {player.tournaments_played} torneo(s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Status & Link to DB Diagnostics */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> Base de Datos
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Turso Cloud
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Diagnóstico API:</span>
                <a
                  href="/api/db-check"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Abrir /api/db-check ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
