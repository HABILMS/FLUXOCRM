
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { Activity, Opportunity } from '../types';
import { Calendar, Plus, CheckCircle, Clock, Trash2, Search, CalendarPlus } from 'lucide-react';

export const Activities: React.FC = () => {
  const { user } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addToCalendar, setAddToCalendar] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
      title: '', description: '', date: '', opportunityId: ''
  });

  useEffect(() => {
    if (user) {
        const loadData = async () => {
            setActivities(await StorageService.getActivities(user.id));
            setOpportunities(await StorageService.getOpportunities(user.id));
        };
        loadData();
    }
  }, [user, isModalOpen]);

  if (!user) return null;

  const addToGoogleCalendar = (activity: Activity) => {
      const startDate = new Date(activity.date);
      // Default to 1 hour duration
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const formatDate = (date: Date) => {
           return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      };

      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      
      const details = `${activity.description || ''}\n\nGerado via Fluxo CRM`;

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.title)}&details=${encodeURIComponent(details)}&dates=${startStr}/${endStr}`;

      window.open(url, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newActivity: Activity = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        opportunityId: formData.opportunityId || undefined,
        completed: false
    };
    await StorageService.saveActivity(newActivity);

    if (addToCalendar) {
        addToGoogleCalendar(newActivity);
    }

    setIsModalOpen(false);
    setFormData({ title: '', description: '', date: '', opportunityId: '' });
    setAddToCalendar(false);
  };

  const toggleComplete = async (activity: Activity) => {
      const updated = { ...activity, completed: !activity.completed };
      await StorageService.saveActivity(updated);
      setActivities(await StorageService.getActivities(user.id));
  };

  const deleteActivity = async (id: string) => {
      if(confirm('Tem certeza que deseja excluir esta atividade?')) {
        await StorageService.deleteActivity(id);
        setActivities(await StorageService.getActivities(user.id));
      }
  };

  // Filter and Sort
  const filtered = activities
    .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Atividades e Agenda</h2>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform hover:scale-105"
        >
            <Plus size={18} /> Nova Atividade
        </button>
      </div>

      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6 flex items-start gap-3">
          <Clock className="text-indigo-600 mt-1" size={20} />
          <div>
              <h4 className="font-semibold text-indigo-800">Sincronização de Agenda</h4>
              <p className="text-sm text-indigo-700">
                  Gerencie seus compromissos aqui e sincronize com o Google Calendar clicando no ícone de calendário em cada atividade.
              </p>
          </div>
      </div>

      <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar atividades..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
      </div>

      <div className="grid gap-4">
          {filtered.length === 0 && (
              <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>Nenhuma atividade encontrada.</p>
              </div>
          )}

          {filtered.map(activity => {
              const opp = opportunities.find(o => o.id === activity.opportunityId);
              const isLate = new Date(activity.date) < new Date() && !activity.completed;

              return (
                <div key={activity.id} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 ${activity.completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-4 flex-1">
                        <button 
                            onClick={() => toggleComplete(activity)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${activity.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'}`}
                        >
                            {activity.completed && <CheckCircle size={14} />}
                        </button>
                        
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`font-semibold ${activity.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                    {activity.title}
                                </h3>
                                {isLate && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Atrasado</span>}
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1">{activity.description}</p>
                            {opp && (
                                <p className="text-xs text-indigo-600 mt-1">Vinculado a: {opp.product} ({opp.contactName})</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="flex flex-col md:items-end">
                             <div className="flex items-center gap-1 text-sm text-slate-600 font-medium">
                                <Calendar size={14} />
                                {new Date(activity.date).toLocaleDateString()}
                             </div>
                             <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock size={12} />
                                {new Date(activity.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                        </div>

                        <div className="flex items-center gap-1">
                             <button 
                                onClick={() => addToGoogleCalendar(activity)} 
                                className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Adicionar ao Google Calendar"
                            >
                                <CalendarPlus size={20} />
                            </button>

                            <button 
                                onClick={() => deleteActivity(activity.id)} 
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir Atividade"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
              );
          })}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                  <h3 className="text-xl font-bold mb-4 text-slate-800">Agendar Atividade</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <input 
                        type="text" 
                        placeholder="Título da Atividade" 
                        required 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                      />
                      
                      <textarea 
                        placeholder="Descrição" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors h-24 resize-none"
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                      />

                      <div className="grid grid-cols-1 gap-4">
                          <label className="block">
                              <span className="text-xs font-bold text-slate-500 uppercase">Data e Hora</span>
                              <input 
                                type="datetime-local" 
                                required 
                                className="w-full p-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})} 
                              />
                          </label>
                      </div>

                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                        value={formData.opportunityId}
                        onChange={e => setFormData({...formData, opportunityId: e.target.value})}
                      >
                          <option value="">Vincular a Oportunidade (Opcional)</option>
                          {opportunities.map(op => <option key={op.id} value={op.id}>{op.product} - {op.contactName}</option>)}
                      </select>

                      <div className="flex items-center gap-2 pt-2 px-1">
                          <input 
                            type="checkbox" 
                            id="addCalendar" 
                            checked={addToCalendar} 
                            onChange={e => setAddToCalendar(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="addCalendar" className="text-sm text-slate-600 cursor-pointer font-medium">Adicionar ao Google Calendar</label>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
                          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-200 transition-all">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
