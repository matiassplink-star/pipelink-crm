'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Plus,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Settings,
  LogOut,
  RefreshCcw,
  Search,
  Bell,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KanbanBoard from '@/components/KanbanBoard';
import NewLeadModal from '@/components/NewLeadModal';
import ClientsView from '@/components/ClientsView';
import WhatsAppConfig from '@/components/WhatsAppConfig';
import ReportsView from '@/components/ReportsView';

type View = 'dashboard' | 'clients' | 'funnel' | 'agenda' | 'automation' | 'settings' | 'reports';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [boardView, setBoardView] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ 
    newLeads: 0, 
    qualified: 0, 
    proposal: 0, 
    negotiation: 0, 
    closed: 0,
    negotiationValue: 0,
    closedValue: 0,
    followups: 0
  });

  const [dealsList, setDealsList] = useState<any[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchDeals();
  }, [refreshKey]);

  const fetchDeals = async () => {
    const { data } = await supabase
      .from('deals')
      .select('*, clients(*)')
      .order('created_at', { ascending: false });
    setDealsList(data || []);
  };

  const fetchStats = async () => {
    try {
      const { data: stages } = await supabase.from('funnel_stages').select('*');
      const { data: deals } = await supabase.from('deals').select('value, stage_id');
      const { count: followupsCount } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!deals || !stages) return;

      const getStageDeals = (namePart: string) => {
        const stageIds = stages.filter(s => s.name.toLowerCase().includes(namePart.toLowerCase())).map(s => s.id);
        return deals.filter(d => stageIds.includes(d.stage_id));
      };

      setStats({
        newLeads: getStageDeals('novo').length + getStageDeals('lead').length,
        qualified: getStageDeals('qualificado').length,
        proposal: getStageDeals('proposta').length,
        negotiation: getStageDeals('negocia').length,
        closed: getStageDeals('fechado').length,
        negotiationValue: deals.filter(d => {
          const isClosed = stages.find(s => s.id === d.stage_id)?.name.toLowerCase().includes('fechado');
          return !isClosed;
        }).reduce((acc, d) => acc + (d.value || 0), 0),
        closedValue: deals.filter(d => {
          const isClosed = stages.find(s => s.id === d.stage_id)?.name.toLowerCase().includes('fechado');
          return isClosed;
        }).reduce((acc, d) => acc + (d.value || 0), 0),
        followups: followupsCount || 0
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
      case 'funnel':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Funnel Stats Row */}
            {activeView === 'dashboard' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novos</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.newLeads}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qualificados</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.qualified}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposta</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.proposal}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negociação</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.negotiation}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm bg-blue-50/30">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Fechados</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.closed}</p>
                </div>
              </div>
            )}

            {/* Value Stats Row */}
            {activeView === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-6 border-l-4 border-l-amber-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Negociação</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.negotiationValue)}
                      </h3>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fechado</p>
                      <h3 className="text-2xl font-bold text-emerald-600 mt-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.closedValue)}
                      </h3>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agendamentos</p>
                      <h3 className="text-2xl font-bold text-blue-600 mt-2">{stats.followups}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Calendar size={20} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kanban Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Fluxo de Vendas</h3>
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setBoardView('kanban')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${boardView === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    QUADRO
                  </button>
                  <button 
                    onClick={() => setBoardView('list')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${boardView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    LISTA
                  </button>
                </div>
              </div>
              <div className="bg-slate-100/50 rounded-2xl p-6 min-h-[600px]">
                {boardView === 'kanban' ? (
                  <KanbanBoard key={refreshKey} onRefresh={handleRefresh} />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negócio</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estágio</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {/* Deals will be mapped here if we fetch them for list view */}
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm italic">
                            Carregando lista de negócios...
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'clients':
        return <ClientsView />;
      case 'agenda':
        return (
          <div className="flex flex-col items-center justify-center py-40 text-slate-400 animate-in fade-in">
            <Calendar size={64} className="opacity-10 mb-4" />
            <p className="font-bold">AGENDA EM DESENVOLVIMENTO</p>
            <p className="text-sm">Integração com Google Calendar em breve.</p>
          </div>
        );
      case 'automation':
        return (
          <div className="flex flex-col items-center justify-center py-40 text-slate-400 animate-in fade-in">
            <MessageSquare size={64} className="opacity-10 mb-4" />
            <p className="font-bold">AUTOMAÇÕES (n8n)</p>
            <p className="text-sm">Configure seus webhooks nas configurações.</p>
          </div>
        );
      case 'settings':
        return <WhatsAppConfig />;
      case 'reports':
        return <ReportsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">PipeLink</h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => setActiveView('dashboard')} className={activeView === 'dashboard' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveView('clients')} className={activeView === 'clients' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <Users size={20} />
            <span>Clientes</span>
          </button>
          <button onClick={() => setActiveView('funnel')} className={activeView === 'funnel' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <TrendingUp size={20} />
            <span>Funil de Vendas</span>
          </button>
          <button onClick={() => setActiveView('agenda')} className={activeView === 'agenda' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <Calendar size={20} />
            <span>Agenda</span>
          </button>
          <button onClick={() => setActiveView('automation')} className={activeView === 'automation' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <MessageSquare size={20} />
            <span>Automações</span>
          </button>
          <button onClick={() => setActiveView('reports')} className={activeView === 'reports' ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}>
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setActiveView('settings')} className={activeView === 'settings' ? 'sidebar-item-active w-full mb-1' : 'sidebar-item w-full mb-1'}>
            <Settings size={20} />
            <span>Configurações</span>
          </button>
          <button className="sidebar-item w-full text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full text-slate-500 text-xs font-bold uppercase tracking-widest">
              PipeLink CRM // <span className="text-blue-600">{activeView}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.open('https://web.whatsapp.com', 'WhatsApp', 'width=1000,height=800')}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-200"
            >
              <MessageSquare size={16} />
              WHATSAPP WEB
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm border border-blue-200">
              AD
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          {/* Top Row with Title & Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 capitalize">{activeView}</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                <RefreshCcw size={20} />
              </button>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus size={20} />
                <span>NOVO LEAD</span>
              </button>
            </div>
          </div>

          {renderContent()}
        </div>
      </main>

      <NewLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={handleRefresh}
      />
    </div>
  );
}
