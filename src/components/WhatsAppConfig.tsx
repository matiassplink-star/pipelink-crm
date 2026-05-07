'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';

export default function WhatsAppConfig() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [config, setConfig] = useState({
    url: '',
    apikey: '',
    instance: 'PipeLink'
  });

  const fetchQRCode = async () => {
    if (!config.url || !config.apikey) {
      alert('Preencha a URL e a API Key nas configurações.');
      return;
    }

    setLoading(true);
    setQrCode(null);
    setStatus('connecting');

    try {
      // 1. Check/Create Instance
      const res = await fetch(`${config.url}/instance/connect/${config.instance}`, {
        headers: { 'apikey': config.apikey }
      });
      const data = await res.json();

      if (data.base64) {
        setQrCode(data.base64);
      } else if (data.instance?.status === 'open') {
        setStatus('connected');
      }
    } catch (error) {
      console.error(error);
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configuração WhatsApp</h2>
          <p className="text-sm text-slate-500">Conecte sua instância da Evolution API para habilitar disparos.</p>
        </div>
        <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${
          status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
        }`}>
          {status === 'connected' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {status === 'connected' ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config Form */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
            <LinkIcon size={14} /> Dados da API
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL da Evolution API</label>
            <input 
              type="text" 
              placeholder="https://api.suadominio.com"
              className="input-standard text-sm"
              value={config.url}
              onChange={e => setConfig({...config, url: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global API Key</label>
            <input 
              type="password" 
              placeholder="Sua API Key"
              className="input-standard text-sm"
              value={config.apikey}
              onChange={e => setConfig({...config, apikey: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome da Instância</label>
            <input 
              type="text" 
              className="input-standard text-sm bg-slate-50"
              value={config.instance}
              onChange={e => setConfig({...config, instance: e.target.value})}
            />
          </div>

          <button 
            onClick={fetchQRCode}
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
            {status === 'connected' ? 'RECONECTAR' : 'GERAR QR CODE'}
          </button>
        </div>

        {/* QR Code Display */}
        <div className="card-premium p-6 flex flex-col items-center justify-center min-h-[350px] bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-sm font-bold">Solicitando QR Code...</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">Escaneie com seu WhatsApp</p>
                <p className="text-xs text-slate-500 mt-1">O código expira em breve.</p>
              </div>
              <button onClick={fetchQRCode} className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:underline">
                <RefreshCcw size={14} /> ATUALIZAR QR CODE
              </button>
            </div>
          ) : status === 'connected' ? (
            <div className="flex flex-col items-center gap-4 text-emerald-600 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <p className="font-bold text-lg">WhatsApp Conectado!</p>
                <p className="text-sm opacity-80">Sua instância "{config.instance}" está ativa.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-300 text-center p-8">
              <QrCode size={64} className="opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">QR Code aparecerá aqui</p>
              <p className="text-xs">Preencha os dados e clique em gerar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
