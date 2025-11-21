import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { User, PlanType, PlanConfig } from '../types';
import { Save, Trash2, UserPlus } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user, plans, updatePlans } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [editingPlans, setEditingPlans] = useState<Record<PlanType, PlanConfig>>(plans);

  useEffect(() => {
      setUsers(StorageService.getUsers());
      setEditingPlans(plans);
  }, [plans]);

  if (!user || user.role !== 'ADMIN') return <div>Acesso negado.</div>;

  const handlePlanChange = (userId: string, newPlan: PlanType) => {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
          const updated = { ...targetUser, plan: newPlan };
          StorageService.saveUser(updated);
          setUsers(StorageService.getUsers());
      }
  };

  const savePlans = () => {
      updatePlans(editingPlans);
      alert("Configurações de planos salvas!");
  };

  return (
    <div className="space-y-10">
      
      {/* User Management */}
      <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Gerenciamento de Usuários</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                          <th className="p-4">Nome</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Plano Atual</th>
                          <th className="p-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                          <tr key={u.id}>
                              <td className="p-4 font-medium">{u.name}</td>
                              <td className="p-4 text-slate-500">{u.email}</td>
                              <td className="p-4">
                                  <select 
                                    value={u.plan} 
                                    onChange={(e) => handlePlanChange(u.id, e.target.value as PlanType)}
                                    className="border rounded p-1 text-xs bg-slate-50"
                                    disabled={u.role === 'ADMIN'}
                                  >
                                      {Object.values(PlanType).map(t => (
                                          <option key={t} value={t}>{t}</option>
                                      ))}
                                  </select>
                              </td>
                              <td className="p-4 text-right">
                                  {u.role !== 'ADMIN' && (
                                    <button onClick={() => {StorageService.deleteUser(u.id); setUsers(StorageService.getUsers())}} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <Trash2 size={16} />
                                    </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </section>

      {/* Plan Configuration */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Configuração de Planos</h2>
            <button onClick={savePlans} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                <Save size={18} /> Salvar Alterações
            </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(Object.values(editingPlans) as PlanConfig[]).map(plan => (
                <div key={plan.type} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="mb-4 border-b pb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">{plan.type}</span>
                        <input 
                            className="block text-xl font-bold w-full mt-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none"
                            value={plan.name}
                            onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, name: e.target.value }})}
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-500 font-semibold">Preço (R$)</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded mt-1"
                                value={plan.price}
                                onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, price: parseFloat(e.target.value) }})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 font-semibold">Max Contatos</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border rounded mt-1"
                                    value={plan.maxContacts}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, maxContacts: parseInt(e.target.value) }})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold">Max Oportun.</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border rounded mt-1"
                                    value={plan.maxOpportunities}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, maxOpportunities: parseInt(e.target.value) }})}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={plan.features.expenses}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, features: {...plan.features, expenses: e.target.checked} }})}
                                />
                                Controle de Despesas
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={plan.features.aiAssistant}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, features: {...plan.features, aiAssistant: e.target.checked} }})}
                                />
                                Assistente AI
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={plan.features.voiceCommands}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, features: {...plan.features, voiceCommands: e.target.checked} }})}
                                />
                                Comandos de Voz
                            </label>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};