
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { User, PlanType, PlanConfig } from '../types';
import { Save, Trash2, Download, Upload, Database, RefreshCw, AlertTriangle } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user, plans, updatePlans } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [editingPlans, setEditingPlans] = useState<Record<PlanType, PlanConfig>>(plans);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'database'>('users');
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
      refreshData();
  }, [plans]);

  const refreshData = () => {
      setUsers(StorageService.getUsers());
      setEditingPlans(plans);
      setDbStats(StorageService.getDatabaseStats());
  };

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

  const handleExport = () => {
      const data = StorageService.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluxo_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const json = event.target?.result as string;
          if (StorageService.importDatabase(json)) {
              alert("Banco de dados restaurado com sucesso! A página será recarregada.");
              window.location.reload();
          } else {
              alert("Erro ao importar banco de dados. Arquivo inválido.");
          }
      };
      reader.readAsText(file);
  };

  const handleReset = () => {
      if (confirm("ATENÇÃO: Isso apagará TODOS os dados do sistema e restaurará os usuários padrão. Essa ação não pode ser desfeita. Continuar?")) {
          StorageService.resetDatabase();
      }
  };

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Usuários
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'plans' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Planos
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'database' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Banco de Dados
          </button>
      </div>

      {/* User Management */}
      {activeTab === 'users' && (
        <section className="animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
            </div>
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
                                        <button 
                                            onClick={() => {
                                                if(confirm('Excluir usuário e todos os dados associados?')) {
                                                    StorageService.deleteUser(u.id); 
                                                    setUsers(StorageService.getUsers());
                                                }
                                            }} 
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            title="Excluir Usuário"
                                        >
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
      )}

      {/* Plan Configuration */}
      {activeTab === 'plans' && (
        <section className="animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Configuração de Planos</h2>
                <button onClick={savePlans} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
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
      )}

      {/* Database Management */}
      {activeTab === 'database' && dbStats && (
          <section className="animate-in fade-in">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Manutenção do Banco de Dados</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Stats */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <Database size={20} className="text-indigo-600" /> 
                          Estatísticas do Sistema
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-xs text-slate-500">Usuários</p>
                              <p className="text-xl font-bold text-slate-800">{dbStats.users}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-xs text-slate-500">Contatos</p>
                              <p className="text-xl font-bold text-slate-800">{dbStats.contacts}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-xs text-slate-500">Oportunidades</p>
                              <p className="text-xl font-bold text-slate-800">{dbStats.opportunities}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                              <p className="text-xs text-slate-500">Atividades</p>
                              <p className="text-xl font-bold text-slate-800">{dbStats.activities}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                              <p className="text-xs text-slate-500">Tamanho Total (Local Storage)</p>
                              <p className="text-xl font-bold text-slate-800">{dbStats.sizeKB} KB</p>
                          </div>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <RefreshCw size={20} className="text-indigo-600" /> 
                          Ações
                      </h3>
                      
                      <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                              <h4 className="font-semibold text-sm mb-1">Backup e Restauração</h4>
                              <p className="text-xs text-slate-500 mb-3">
                                  Exporte seus dados para segurança ou importe para restaurar um backup anterior.
                              </p>
                              <div className="flex gap-2">
                                  <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
                                      <Download size={16} /> Exportar JSON
                                  </button>
                                  <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 cursor-pointer">
                                      <Upload size={16} /> Importar JSON
                                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                  </label>
                              </div>
                          </div>

                          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                              <h4 className="font-semibold text-sm mb-1 text-red-700 flex items-center gap-2">
                                  <AlertTriangle size={16} /> Zona de Perigo
                              </h4>
                              <p className="text-xs text-red-600/80 mb-3">
                                  Esta ação apagará permanentemente todos os dados e restaurará o sistema para o estado inicial.
                              </p>
                              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                                  <Trash2 size={16} /> Resetar Sistema Completo
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </section>
      )}
    </div>
  );
};
