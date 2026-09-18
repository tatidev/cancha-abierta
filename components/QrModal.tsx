"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, Share2, ExternalLink } from "lucide-react";

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
}

export default function QrModal({ isOpen, onClose, tournamentName }: QrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentUrl = window.location.origin;
      setUrl(currentUrl);
      QRCode.toDataURL(currentUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#064e3b", // Deep emerald
          light: "#ffffff",
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error("Error generating QR:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mb-3">
            <Share2 size={28} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">
            Seguimiento en Vivo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Los jugadores pueden escanear este código con su celular para ver el ranking y canchas en tiempo real.
          </p>
        </div>

        {/* QR Display */}
        <div className="flex justify-center my-4">
          <div className="bg-white p-3 rounded-2xl shadow-lg border-4 border-emerald-500/20">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Torneo de Pádel"
                className="w-56 h-56 rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-500 text-sm">
                Generando QR...
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs font-semibold text-emerald-400 mb-4">
          {tournamentName}
        </p>

        {/* URL Link and Copy */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-300 truncate font-mono select-all">
            {url}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} /> Copiado
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar
              </>
            )}
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
