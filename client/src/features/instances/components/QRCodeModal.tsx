import { useEffect, useState } from "react";
import { WhatsAppInstance } from "../types/instanceTypes";

interface QRCodeModalProps {
  instance: WhatsAppInstance | null;
  onClose: () => void;
  onRefresh: (instanceId: string) => void;
}

const COUNTDOWN_SECONDS = 30;

export default function QRCodeModal({ instance, onClose, onRefresh }: QRCodeModalProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-close modal when instance is connected
  useEffect(() => {
    if (instance?.status.toUpperCase() === "CONNECTED") {
      console.log("✅ Instance connected! Closing QR Code modal...");
      // Wait 1.5 seconds to show success message, then close
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [instance?.status, onClose]);

  // Reset countdown when instance changes (e.g., when QR code is refreshed)
  useEffect(() => {
    if (instance?.qrCode) {
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [instance?.qrCode]);

  useEffect(() => {
    if (!instance || !autoRefresh || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Refresh QR code only if instance is still connecting
          if (instance.status.toUpperCase() === "CONNECTING") {
            onRefresh(instance.id);
          }
          return COUNTDOWN_SECONDS; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [instance, autoRefresh, onRefresh, countdown]);

  const handleRefresh = () => {
    if (instance) {
      onRefresh(instance.id);
      setCountdown(COUNTDOWN_SECONDS);
    }
  };

  if (!instance) return null;

  const isConnected = instance.status.toUpperCase() === "CONNECTED";
  const isConnecting = instance.status.toUpperCase() === "CONNECTING";
  const hasQRCode = instance.qrCode && isConnecting;
  const isLoading = isConnecting && !instance.qrCode; // Connecting but QR not yet available

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">Conectar WhatsApp</h3>
        
        {hasQRCode ? (
          <div className="space-y-4">
            {/* QR Code Image */}
            <div className="flex justify-center items-center bg-white p-4 rounded-lg border border-base-300">
              <img 
                src={instance.qrCode} 
                alt="QR Code WhatsApp" 
                className="max-w-full h-auto"
                style={{ maxHeight: "300px" }}
              />
            </div>

            {/* Instructions */}
            <div className="alert">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="text-sm">
                <p className="font-bold">Como conectar:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Mais opções ou Configurações</li>
                  <li>Toque em Dispositivos conectados</li>
                  <li>Toque em Conectar dispositivo</li>
                  <li>Aponte seu celular para esta tela para ler o código</li>
                </ol>
              </div>
            </div>

            {/* Auto-refresh controls */}
            <div className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="text-sm">Atualizar automaticamente</span>
              </div>
              
              {autoRefresh && (
                <div className="badge badge-info">
                  {countdown}s
                </div>
              )}
            </div>

            {/* Manual refresh button */}
            <button
              className="btn btn-outline btn-sm w-full"
              onClick={handleRefresh}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar QR Code agora
            </button>
          </div>
        ) : isConnected ? (
          <div className="alert alert-success shadow-lg animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">🎉 Conectado com Sucesso!</h3>
              <div className="text-sm">Sua instância está conectada ao WhatsApp. Fechando...</div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <h3 className="font-bold">Gerando QR Code...</h3>
              <div className="text-sm">Aguarde enquanto preparamos o código QR para conexão.</div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">QR Code não disponível</h3>
              <div className="text-xs">Status: {instance.status}</div>
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
