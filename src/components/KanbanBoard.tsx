'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, 
  Plus, 
  Calendar, 
  MessageSquare,
  DollarSign,
  FileText,
  Loader2,
  Tag as TagIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ClientDetailsModal from './ClientDetailsModal';

interface Card {
  id: string;
  title: string;
  client_name: string;
  company?: string;
  value: number;
  tags: string[];
  last_activity: string;
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export default function KanbanBoard({ onRefresh }: { onRefresh?: () => void }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: stages } = await supabase.from('funnel_stages').select('*').order('order_index');
      const { data: deals } = await supabase.from('deals').select('*, clients(name, tags)').order('order_index');

      if (stages && deals) {
        const mappedColumns: Column[] = stages.map(stage => ({
          id: stage.id,
          title: stage.name,
          cards: deals
            .filter(deal => deal.stage_id === stage.id)
            .map(deal => ({
              id: deal.id,
              title: deal.title,
              client_name: deal.clients?.name || 'Sem Nome',
              company: deal.description || 'S/ Empresa',
              value: deal.value,
              tags: deal.clients?.tags || [],
              last_activity: new Date(deal.updated_at).toLocaleDateString('pt-BR')
            }))
        }));
        setColumns(mappedColumns);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sourceColIndex = columns.findIndex(col => col.id === source.droppableId);
    const destColIndex = columns.findIndex(col => col.id === destination.droppableId);
    
    const newColumns = [...columns];
    const [movedCard] = newColumns[sourceColIndex].cards.splice(source.index, 1);
    newColumns[destColIndex].cards.splice(destination.index, 0, movedCard);
    setColumns(newColumns);

    try {
      const isClosed = destination.droppableId.toLowerCase().includes('fechado') || destination.droppableId.toLowerCase().includes('closed');
      
      await supabase.from('deals').update({ 
        stage_id: destination.droppableId,
        order_index: destination.index,
        updated_at: new Date().toISOString(),
        closed_at: isClosed ? new Date().toISOString() : null
      }).eq('id', draggableId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium">Carregando quadro...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 min-h-[500px]">
          {columns.map((column) => (
            <div key={column.id} className="w-72 min-w-[280px] flex flex-col gap-3">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-500 text-[11px] uppercase tracking-widest">{column.title}</h4>
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                    {column.cards.length}
                  </span>
                </div>
              </div>

              {/* Column Body */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 flex flex-col gap-2 p-1.5 rounded-xl transition-colors min-h-[150px] ${
                      snapshot.isDraggingOver ? 'bg-slate-200/40' : ''
                    }`}
                  >
                    <AnimatePresence>
                      {column.cards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="outline-none"
                              onClick={() => setSelectedDealId(card.id)}
                            >
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing ${
                                  snapshot.isDragging ? 'shadow-xl border-blue-400 ring-2 ring-blue-500/5' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                    {card.company?.slice(0, 20)}
                                  </span>
                                  <MoreVertical size={12} className="text-slate-300" />
                                </div>
                                
                                <h5 className="font-bold text-slate-800 text-sm leading-tight mb-0.5">{card.client_name}</h5>
                                <p className="text-slate-400 text-[11px] mb-3 line-clamp-1">{card.title}</p>
                                
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${card.value > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                      {card.value > 0 
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)
                                        : 'A definir'}
                                    </span>
                                  </div>
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 border border-slate-200">
                                    {card.client_name.charAt(0)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-2.5 text-slate-300">
                                  <div className="flex items-center gap-1 text-[9px] font-medium">
                                    <Calendar size={10} />
                                    {card.last_activity}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] font-medium ml-auto">
                                    <MessageSquare size={10} />
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] font-medium">
                                    <FileText size={10} />
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <ClientDetailsModal 
        dealId={selectedDealId}
        isOpen={!!selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onRefresh={() => {
          fetchData();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
