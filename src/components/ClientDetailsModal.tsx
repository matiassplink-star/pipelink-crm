'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  FileText, 
  History, 
  Plus, 
  Loader2,
  Paperclip,
  Trash2,
  CheckCircle2
} from 'lucide-react';

interface Interaction {
  id: string;
  type: string;
  content: string;
  created_at: string;
}

interface Attachment {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
}

export default function ClientDetailsModal({ dealId, isOpen, onClose, onRefresh }: { dealId: string | null, isOpen: boolean, onClose: () => void, onRefresh?: () => void }) {
  const [deal, setDeal] = useState<any>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'whatsapp' | 'docs' | 'tasks'>('history');
  const [newNote, setNewNote] = useState('');
  const [scheduledMsg, setScheduledMsg] = useState({ text: '', date: '', time: '' });
  const [scheduledList, setScheduledList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (isOpen && dealId) {
      fetchDetails();
      fetchScheduledMessages();
    }
  }, [isOpen, dealId]);

  const fetchScheduledMessages = async () => {
    let { data, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('deal_id', dealId)
      .order('scheduled_for', { ascending: true });
    
    if (error || !data || data.length === 0) {
      const { data: d2 } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('deal_id', dealId)
        .order('scheduled_for', { ascending: true });
      setScheduledList(d2 || []);
    } else {
      setScheduledList(data || []);
    }
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Deal with Client
      const { data: dealData } = await supabase
        .from('deals')
        .select('*, clients(*)')
        .eq('id', dealId)
        .single();
      
      setDeal(dealData);
      setEditData({
        name: dealData.clients.name,
        phone: dealData.clients.phone,
        email: dealData.clients.email,
        city: dealData.clients.city,
        service_type: dealData.clients.service_type,
        title: dealData.title,
        value: dealData.value
      });

      // 2. Fetch Interactions
      const { data: interactionData } = await supabase
        .from('interactions_history')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      
      setInteractions(interactionData || []);

      // 3. Fetch Attachments
      let { data: attachData, error: attachErr } = await supabase
        .from('attachments')
        .select('*')
        .eq('deal_id', dealId);
      
      if (attachErr || !attachData || attachData.length === 0) {
        const { data: d2 } = await supabase
          .from('deal_attachments')
          .select('*')
          .eq('deal_id', dealId);
        setAttachments(d2 || []);
      } else {
        setAttachments(attachData || []);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledMsg.text || !scheduledMsg.date || !scheduledMsg.time) return;

    try {
      const scheduled_for = new Date(`${scheduledMsg.date}T${scheduledMsg.time}`).toISOString();

      const msgData: any = {
        deal_id: dealId,
        message_text: scheduledMsg.text,
        scheduled_for: scheduled_for,
        status: 'pending'
      };

      if (deal?.client_id) msgData.client_id = deal.client_id;

      let { data, error } = await supabase
        .from('scheduled_messages')
        .insert(msgData)
        .select()
        .single();

      if (error) {
        // Tenta 'whatsapp_messages' como alternativa
        const { data: d2, error: e2 } = await supabase
          .from('whatsapp_messages')
          .insert(msgData)
          .select()
          .single();
        
        if (e2) throw e2;
        data = d2;
      }
      
      setScheduledList([...scheduledList, data]);
      setScheduledMsg({ text: '', date: '', time: '' });
      alert('WhatsApp agendado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao agendar: Verifique se a tabela "scheduled_messages" existe no seu Supabase.');
    }
  };
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const noteData: any = {
        deal_id: dealId,
        type: 'note',
        content: newNote
      };
      
      if (deal?.client_id) noteData.client_id = deal.client_id;

      let { data, error } = await supabase
        .from('interactions_history')
        .insert(noteData)
        .select()
        .single();

      if (error) {
        console.log('Erro na interactions_history:', error);
        const { data: d2, error: e2 } = await supabase
          .from('interactions')
          .insert(noteData)
          .select()
          .single();
        
        if (e2) {
          alert(`Erro do Banco: ${e2.message} (Tabela: interactions)`);
          throw e2;
        }
        data = d2;
      }

      setInteractions([data, ...interactions]);
      setNewNote('');
      alert('Nota salva!');
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dealId) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${dealId}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Save to Database
      const attachData = {
        deal_id: dealId,
        name: file.name,
        file_url: publicUrl
      };

      let { data: attach, error: dbError } = await supabase
        .from('attachments')
        .insert(attachData)
        .select()
        .single();

      if (dbError) {
        alert(`Erro ao registrar anexo: ${dbError.message}`);
        throw dbError;
      }

      setAttachments([attach, ...attachments]);
      alert('Documento anexado!');
    } catch (error: any) {
      console.error(error);
      alert('Erro Crítico: ' + (error.message || 'Erro no servidor'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Update Client
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: editData.name,
          phone: editData.phone,
          email: editData.email,
          city: editData.city,
          service_type: editData.service_type
        })
        .eq('id', deal.client_id);

      if (clientError) throw clientError;

      // Update Deal
      const { error: dealError } = await supabase
        .from('deals')
        .update({
          title: editData.title,
          value: editData.value
        })
        .eq('id', dealId);

      if (dealError) throw dealError;

      setIsEditing(false);
      fetchDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar dados.');
    }
  };

  const handleDeleteDeal = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead permanentemente?')) return;
    
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);
      
      if (error) throw error;
      onClose();
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir o lead.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-[100]">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                {deal?.clients?.tags?.[0] || 'LEAD'}
              </span>
              <span className="text-slate-400 text-xs font-medium">ID: {dealId?.slice(0, 8)}</span>
            </div>
            {isEditing ? (
              <div className="space-y-2 mt-2">
                <input 
                  className="text-2xl font-bold text-slate-900 bg-white border border-blue-200 rounded px-2 w-full outline-none focus:ring-2 focus:ring-blue-500/10"
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  placeholder="Nome do Cliente"
                />
                <input 
                  className="text-slate-500 font-medium bg-white border border-blue-200 rounded px-2 w-full outline-none"
                  value={editData.title}
                  onChange={e => setEditData({...editData, title: e.target.value})}
                  placeholder="Título do Negócio"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                    <input 
                      type="number"
                      className="bg-white border border-blue-200 rounded px-2 py-1 w-full text-sm font-bold text-emerald-600 outline-none"
                      value={editData.value}
                      onChange={e => setEditData({...editData, value: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input 
                      className="bg-white border border-blue-200 rounded px-2 py-1 w-full text-sm outline-none"
                      value={editData.phone}
                      onChange={e => setEditData({...editData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                    <input 
                      className="bg-white border border-blue-200 rounded px-2 py-1 w-full text-sm outline-none"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cidade</label>
                    <input 
                      className="bg-white border border-blue-200 rounded px-2 py-1 w-full text-sm outline-none"
                      value={editData.city}
                      onChange={e => setEditData({...editData, city: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-900">{deal?.clients?.name}</h2>
                <div className="flex items-center gap-4 text-slate-500 text-xs mt-1">
                  <p className="font-medium">{deal?.title}</p>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <p>{deal?.clients?.phone || 'Sem telefone'}</p>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <p>{deal?.clients?.city || 'Cidade n/d'}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-all">
                  CANCELAR
                </button>
                <button onClick={handleUpdate} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg transition-all">
                  SALVAR
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg shadow-sm transition-all">
                EDITAR
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-white sticky top-0 z-10">
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <History size={18} />
              HISTÓRICO
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'whatsapp' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              WHATSAPP
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'docs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center gap-2">
              <Paperclip size={18} />
              DOCUMENTOS
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 text-sm font-medium">Carregando detalhes...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Tab: History */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  {/* New Note Form */}
                  <form onSubmit={handleAddNote} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <textarea 
                      placeholder="Adicione uma nota interna sobre este lead..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all min-h-[100px]"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <Plus size={16} /> SALVAR NOTA
                      </button>
                    </div>
                  </form>

                  {/* Timeline */}
                  <div className="space-y-4">
                    {interactions.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            item.type === 'note' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {item.type === 'note' ? <FileText size={14} /> : <History size={14} />}
                          </div>
                          <div className="w-px flex-1 bg-slate-200 my-1"></div>
                        </div>
                        <div className="pb-6">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-900 uppercase">
                              {item.type === 'note' ? 'Nota Interna' : 'Mudança de Estágio'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(item.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 p-3 rounded-lg text-sm text-slate-600 shadow-sm">
                            {item.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: WhatsApp Scheduler */}
              {activeTab === 'whatsapp' && (
                <div className="space-y-6">
                  <form onSubmit={handleScheduleMessage} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                      <MessageSquare size={14} /> Agendar Disparo WhatsApp
                    </div>
                    
                    <textarea 
                      placeholder="Escreva a mensagem que será enviada..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[120px]"
                      value={scheduledMsg.text}
                      onChange={e => setScheduledMsg({...scheduledMsg, text: e.target.value})}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-sm outline-none"
                          value={scheduledMsg.date}
                          onChange={e => setScheduledMsg({...scheduledMsg, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                        <input 
                          type="time" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-sm outline-none"
                          value={scheduledMsg.time}
                          onChange={e => setScheduledMsg({...scheduledMsg, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      <Calendar size={18} /> CONFIRMAR AGENDAMENTO
                    </button>
                  </form>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Próximos Envios</h4>
                    {scheduledList.length === 0 ? (
                      <div className="text-center py-10 bg-white/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                        Nenhuma mensagem agendada.
                      </div>
                    ) : (
                      scheduledList.map((msg) => (
                        <div key={msg.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                msg.status === 'sent' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {msg.status === 'sent' ? 'Enviado' : 'Pendente'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 italic">"{msg.message_text}"</p>
                          </div>
                          <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Docs */}
              {activeTab === 'docs' && (
                <div className="grid grid-cols-1 gap-4">
                  <label className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                    <Plus size={32} />
                    <p className="text-sm font-bold mt-2">ANEXAR ORÇAMENTO OU COMPROVANTE</p>
                  </label>
                  {attachments.map(doc => (
                    <div key={doc.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" className="text-blue-600 text-xs font-bold hover:underline">VER ARQUIVO</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Tasks */}
              {activeTab === 'tasks' && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Calendar size={48} className="mb-4 opacity-20" />
                  <p className="font-bold text-sm">NENHUMA TAREFA AGENDADA</p>
                  <button className="mt-4 text-blue-600 font-bold text-xs">+ CRIAR FOLLOW-UP</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
          <button 
            onClick={handleDeleteDeal}
            className="flex items-center gap-2 text-red-600 text-xs font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
          >
            <Trash2 size={16} /> EXCLUIR LEAD
          </button>
          <div className="flex gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">VALOR TOTAL</span>
              <span className="text-xl font-black text-slate-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal?.value || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
