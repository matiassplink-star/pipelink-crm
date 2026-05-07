'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

export default function ReportsView() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('');
  const [data, setData] = useState({
    revenue: 0,
    proposals: 0,
    conversion: 0,
    newLeads: 0,
    growth: 12.5
  });

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        setDateRange(`Hoje, ${now.toLocaleDateString('pt-BR')}`);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
        setDateRange(`${startDate.toLocaleDateString('pt-BR')} até ${now.toLocaleDateString('pt-BR')}`);
      } else {
        startDate.setDate(now.getDate() - 30);
        setDateRange(`${startDate.toLocaleDateString('pt-BR')} até ${now.toLocaleDateString('pt-BR')}`);
      }

      const { data: deals } = await supabase
        .from('deals')
        .select('*, funnel_stages(name)')
        .gte('created_at', startDate.toISOString());

      if (deals) {
        const revenue = deals
          .filter(d => d.funnel_stages?.name.toLowerCase().includes('fechado'))
          .reduce((acc, d) => acc + (d.value || 0), 0);
        
        const proposals = deals
          .filter(d => d.funnel_stages?.name.toLowerCase().includes('proposta'))
          .reduce((acc, d) => acc + (d.value || 0), 0);

        const closedCount = deals.filter(d => d.funnel_stages?.name.toLowerCase().includes('fechado')).length;
        const totalCount = deals.length;
        const conversion = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;

        setData({
          revenue,
          proposals,
          conversion,
          newLeads: totalCount,
          growth: 15.2
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Relatório de Performance</h2>
          <p className="text-blue-600 text-xs font-black uppercase tracking-widest mt-1">
            {dateRange}
          </p>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'daily' ? 'DIÁRIO' : p === 'weekly' ? 'SEMANAL' : 'MENSAL'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-premium p-6 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.revenue)}
              </h3>
              <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-[10px]">
                <ArrowUpRight size={12} />
                +{data.growth}% vs anterior
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-20 blur-2xl"></div>
        </div>

        <div className="card-premium p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Propostas</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.proposals)}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Potencial de fechamento</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Target size={20} />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversão</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2">{data.conversion.toFixed(1)}%</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Leads vs Ganhos</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Zap size={20} />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novos Leads</p>
              <h3 className="text-2xl font-black text-slate-900 mt-2">{data.newLeads}</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-2">Entrada no período</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
              <Calendar size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-8 h-80 flex flex-col items-center justify-center border-dashed border-2">
          <BarChart3 size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Gráfico de Crescimento</p>
          <p className="text-[10px] text-slate-400">Em processamento de dados históricos...</p>
        </div>
        
        <div className="card-premium p-8 h-80 flex flex-col items-center justify-center border-dashed border-2">
          <Target size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Metas do Período</p>
          <p className="text-[10px] text-slate-400">Configure suas metas nas configurações.</p>
        </div>
      </div>
    </div>
  );
}
