
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { Opportunity, OpportunityStatus, Contact } from '../types';
import { Plus, DollarSign, ArrowRight } from 'lucide-react';

export const Opportunities: React.FC = () => {
  const { user, plans } = useApp();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
      contactId: '', product: '', value: 0, status: OpportunityStatus.OPEN
  });

  useEffect(() => {
    if (user) {
        const loadData = async () => {
            setOpportunities(await StorageService.getOpportunities(user.id));
            setContacts(await StorageService.getContacts(user.id));
        };
        loadData();
    }
  }, [user, isModalOpen]);

  if (!user) return null;
  const plan = plans[user.plan];
  const canAdd = plan.maxOpportunities === -1 || opportunities.length < plan.maxOpportunities;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find(c => c.id === formData.contactId);
    if (!contact) return;

    const newOpp: Opportunity = {
        id: crypto.randomUUID(),
        userId: user.id,
        contactId: formData.contactId,
        contactName: contact.name,
        product: formData.product,
        value: Number(formData.value),
        status: formData.status,
        createdAt: new Date().toISOString()
    };
    await StorageService.saveOpportunity(newOpp);
    setIsModalOpen(false);
    setFormData({ contactId: '', product: '', value: 0, status: OpportunityStatus.OPEN });
  };

  const updateStatus = async (opp: Opportunity, newStatus: OpportunityStatus) => {
      const updated = { ...opp, status: newStatus };
      await StorageService.saveOpportunity(updated);
      setOpportunities(await StorageService.getOpportunities(user.id)); // Refresh
  };

  const columns = [
      OpportunityStatus.OPEN,
      OpportunityStatus.NEGOTIATION,
      OpportunityStatus.WON,
      OpportunityStatus.LOST
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Oportunidades</h2>
        <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!canAdd}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
            <Plus size={18} /> Nova Oportunidade
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(status => (
              <div key={status} className="min-w-[280px] flex-1 bg-slate-100 rounded-xl p-4">
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${
                      status === OpportunityStatus.WON ? 'text-emerald-600' : 
                      status === OpportunityStatus.LOST ? 'text-red-500' : 'text-slate-700'
                  }`}>
                      {status}
                      <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 border">
                          {opportunities.filter(o => o.status === status).length}
                      </span>
                  </h3>
                  <div className="space-y-3">
                      {opportunities.filter(o => o.status === status).map(opp => (
                          <div key={opp.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 group">
                              <h4 className="font-semibold text-slate-800">{opp.product}</h4>
                              <p className="text-sm text-slate-500 mb-2">{opp.contactName}</p>
                              <div className="flex justify-between items-center mt-2">
                                  <span className="text-indigo-600 font-bold flex items-center text-sm">
                                      <DollarSign size={12} /> {opp.value.toLocaleString()}
                                  </span>
                                  
                                  {status !== OpportunityStatus.WON && status !== OpportunityStatus.LOST && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => updateStatus(opp, OpportunityStatus.WON)}
                                            className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="Ganhar"
                                          >✓</button>
                                          <button 
                                            onClick={() => updateStatus(opp, OpportunityStatus.LOST)}
                                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Perder"
                                          >×</button>
                                          {status === OpportunityStatus.OPEN && (
                                              <button 
                                                onClick={() => updateStatus(opp, OpportunityStatus.NEGOTIATION)}
                                                className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Negociar"
                                              ><ArrowRight size={14} /></button>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Nova Oportunidade</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <select 
                        required 
                        className="w-full p-2 border rounded"
                        value={formData.contactId}
                        onChange={e => setFormData({...formData, contactId: e.target.value})}
                      >
                          <option value="">Selecione um contato...</option>
                          {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                      </select>
                      <input type="text" placeholder="Produto/Serviço" required className="w-full p-2 border rounded" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
                      <input type="number" placeholder="Valor (R$)" required className="w-full p-2 border rounded" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                      
                      <div className="flex justify-end gap-2 mt-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
