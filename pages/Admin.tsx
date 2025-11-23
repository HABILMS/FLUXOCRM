
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { User, PlanType, PlanConfig, UserRole } from '../types';
import { Save, Trash2, Download, Upload, Database, RefreshCw, AlertTriangle, Plus, Search, X, UserPlus } from 'lucide-react';
import { supabase } from '../services/supabase';

export const Admin: React.FC = () => {
  const { user, plans, updatePlans } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [editingPlans, setEditingPlans] = useState<Record<PlanType, PlanConfig>>(plans);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'database'>('users');
  const [dbStats, setDbStats] = useState<any>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // User Management States
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
      name: '',
      email: '',
      role: 'USER' as UserRole,
      plan: 'BASIC' as PlanType
  });

  useEffect(() => {
      refreshData();
  }, [plans]);

  const refreshData = async () => {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await StorageService.getUsers();
        setUsers(fetchedUsers);
        setEditingPlans(plans);
        setDbStats(await StorageService.getDatabaseStats());
      } catch (error) {
        console.error("Erro ao carregar dados do admin:", error);
      } finally {
        setIsLoadingUsers(false);
      }
  };

  if (!user || user.role !== 'ADMIN') return <div>Acesso negado.</div>;

  const handlePlanChange = async (userId: string, newPlan: PlanType) => {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
          const updated = { ...targetUser, plan: newPlan };
          await StorageService.saveUser(updated);
          refreshData();
      }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
          const updated = { ...targetUser, role: newRole };
          await StorageService.saveUser(updated);
          refreshData();
      }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          // Create profile directly
          const { error } = await supabase.from('profiles').insert({
              id: crypto.randomUUID(), // Generate a UUID placeholder. Ideally this matches Auth ID, but for pre-registering it works until they sign up.
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              plan: newUser.plan,
              is_active: true
          });

          if (error) throw error;

          alert("Usuário pré-cadastrado com sucesso! O usuário deve se cadastrar com este email para acessar.");
          setIsUserModalOpen(false);
          setNewUser({ name: '', email: '', role: 'USER', plan: 'BASIC' });
          refreshData();
      } catch (err) {
          console.error(err);
          alert("Erro ao criar usuário. Verifique se o email já existe.");
      }
  };

  const savePlans = () => {
      updatePlans(editingPlans);
      alert("Configurações de planos salvas!");
  };

  const handleExport = async () => {
      const data = await StorageService.exportDatabase();
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
      reader.onload = async (event) => {
          const json = event.target?.result as string;
          if (await StorageService.importDatabase(json)) {
              alert("Banco de dados restaurado com sucesso! A página será recarregada.");
              window.location.reload();
          } else {
              alert("Erro ao importar banco de dados. Arquivo inválido.");
          }
      };
      reader.readAsText(file);
  };

  const handleReset = async () => {
      if (confirm("ATENÇÃO: Isso apagará TODOS os dados do sistema e restaurará os usuários padrão. Essa ação não pode ser desfeita. Continuar?")) {
          await StorageService.resetDatabase();
          window.location.reload();
      }
  };

  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar usuário..." 
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={refreshData}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200"
                        title="Recarregar Lista"
                    >
                        <RefreshCw size={18} className={isLoadingUsers ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setIsUserModalOpen(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-md text-sm font-medium"
                    >
                        <UserPlus size={18} /> Novo Usuário
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Plano Atual</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium flex items-center gap-2">
                                        <img src={u.avatar} alt="" className="w-6 h-6 rounded-full" />
                                        {u.name}
                                    </td>
                                    <td className="p-4 text-slate-500">{u.email}</td>
                                    <td className="p-4">
                                        <select 
                                            value={u.role} 
                                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                            className={`border rounded p-1 text-xs font-bold cursor-pointer ${u.role === 'ADMIN' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-600 bg-white border-slate-200'}`}
                                            disabled={u.email === 'habilsolarconsultoria@gmail.com'} // Protect master admin
                                        >
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <select 
                                            value={u.plan} 
                                            onChange={(e) => handlePlanChange(u.id, e.target.value as PlanType)}
                                            className="border border-slate-200 rounded p-1 text-xs bg-white text-slate-700 cursor-pointer"
                                        >
                                            {Object.values(PlanType).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 text-right">
                                        {u.email !== 'habilsolarconsultoria@gmail.com' && (
                                            <button 
                                                onClick={async () => {
                                                    if(confirm(`Tem certeza que deseja EXCLUIR ${u.name}? Todos os dados (contatos, oportunidades) deste usuário serão perdidos.`)) {
                                                        await StorageService.deleteUser(u.id); 
                                                        refreshData();
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
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        {isLoadingUsers ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                                className="block text-xl font-bold w-full mt-1 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none bg-white text-slate-900"
                                value={plan.name}
                                onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, name: e.target.value }})}
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 font-semibold">Preço (R$)</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border rounded mt-1 bg-white text-slate-900 border-slate-200"
                                    value={plan.price}
                                    onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, price: parseFloat(e.target.value) }})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold">Max Contatos</label>
                                    <input 
                                        type="number"
                                        className="w-full p-2 border rounded mt-1 bg-white text-slate-900 border-slate-200"
                                        value={plan.maxContacts}
                                        onChange={(e) => setEditingPlans({...editingPlans, [plan.type]: { ...plan, maxContacts: parseInt(e.target.value) }})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold">Max Oportun.</label>
                                    <input 
                                        type="number"
                                        className="w-full p-2 border rounded mt-1 bg-white text-slate-900 border-slate-200"
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

      {/* Create User Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Novo Usuário</h3>
                      <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                          <input 
                              type="text" required 
                              className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" 
                              value={newUser.name}
                              onChange={e => setNewUser({...newUser, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input 
                              type="email" required 
                              className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" 
                              value={newUser.email}
                              onChange={e => setNewUser({...newUser, email: e.target.value})}
                          />
                          <p className="text-xs text-slate-400 mt-1">O usuário usará este email para se cadastrar/entrar.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={newUser.role}
                                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                              >
                                  <option value="USER">Usuário Padrão</option>
                                  <option value="ADMIN">Administrador</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano Inicial</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={newUser.plan}
                                  onChange={e => setNewUser({...newUser, plan: e.target.value as PlanType})}
                              >
                                  <option value="BASIC">Básico</option>
                                  <option value="ADVANCED">Profissional</option>
                                  <option value="EXPERT">Expert AI</option>
                              </select>
                          </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex gap-2">
                          <AlertTriangle size={16} className="shrink-0" />
                          <p>
                              Esta ação cria o perfil no sistema. O usuário ainda precisará criar uma senha através da tela de cadastro usando o mesmo email.
                          </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Criar Usuário</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
