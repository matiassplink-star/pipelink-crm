'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Loader2, User, Phone, Mail, MapPin, Briefcase, Calendar } from 'lucide-react';

export default function NewLeadModal({ isOpen, onClose, onCreated }: { isOpen: boolean, onClose: () => void, onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    service_type: '',
    title: '',
    value: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Client with all data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({ 
          name: formData.name, 
          phone: formData.phone,
          email: formData.email,
          city: formData.city,
          service_type: formData.service_type,
          tags: ['NOVO'] 
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Get first stage
      const { data: stages } = await supabase.from('funnel_stages').select('id').order('order_index').limit(1);
      const stageId = stages?.[0]?.id;

      // 3. Create Deal
      const { error: dealError } = await supabase
        .from('deals')
        .insert({
          client_id: client.id,
          stage_id: stageId,
          title: formData.title || `Negociação - ${formData.name}`,
          value: formData.value ? parseFloat(formData.value) : 0,
          description: `Serviço: ${formData.service_type} | Cidade: ${formData.city}`
        });

      if (dealError) throw dealError;

      onCreated();
      onClose();
      // Reset form
      setFormData({ name: '', phone: '', email: '', city: '', service_type: '', title: '', value: '' });
    } catch (error) {
      console.error(error);
      alert('Erro ao criar lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Cadastrar Novo Lead</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Preencha as informações iniciais</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Nome Completo
              </label>
              <input 
                required name="name" value={formData.name} onChange={handleChange}
                placeholder="Nome do cliente" 
                className="input-standard text-sm"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> Telefone / WhatsApp
              </label>
              <input 
                name="phone" value={formData.phone} onChange={handleChange}
                placeholder="(00) 00000-0000" 
                className="input-standard text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> E-mail
              </label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="email@exemplo.com" 
                className="input-standard text-sm"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> Cidade
              </label>
              <input 
                name="city" value={formData.city} onChange={handleChange}
                placeholder="Ex: São Paulo - SP" 
                className="input-standard text-sm"
              />
            </div>

            {/* Tipo de Serviço */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={12} /> Tipo de Serviço
              </label>
              <input 
                name="service_type" value={formData.service_type} onChange={handleChange}
                placeholder="Ex: Consultoria, Instalação..." 
                className="input-standard text-sm"
              />
            </div>

            {/* Título da Negociação */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Título da Negociação
              </label>
              <input 
                name="title" value={formData.title} onChange={handleChange}
                placeholder="Ex: Projeto Residencial" 
                className="input-standard text-sm"
              />
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Estimado (Opcional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                <input 
                  type="number" name="value" value={formData.value} onChange={handleChange}
                  placeholder="0,00" 
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 w-32 text-sm font-bold"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center gap-2 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> FINALIZAR CADASTRO</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
