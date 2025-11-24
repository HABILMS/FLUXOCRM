
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle, Loader2, ArrowRight, PlusCircle } from 'lucide-react';
import { OpportunityStatus, PlanType } from '../types';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, plans } = useApp();
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
      if (user) {
          Promise.all([
              StorageService.getOpportunities(user.id),
              StorageService.getContacts(user.id),
              StorageService.getExpenses(user.id)
          ]).then(([opps, contacts, expenses]) => {
              const totalWon = opps.filter(o => o.status === OpportunityStatus.WON).reduce((acc, curr) => acc + curr.value, 0);
              const totalPipeline = opps.filter(o => o.status !== OpportunityStatus.WON && o.status !== OpportunityStatus.LOST).reduce((acc, curr) => acc + curr.value, 0);
              
              const expenseTotal = expenses.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
              const incomeTotal = expenses.filter(e => e.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);

              const statusData = [
                  { name: 'Abertas', value: opps.filter(o => o.status === OpportunityStatus.OPEN).length },
                  { name: 'Negociação', value: opps.filter(o => o.status === OpportunityStatus.NEGOTIATION).length },
                  { name: 'Ganhas', value: opps.filter(o => o.status === OpportunityStatus.WON).length },
                  { name: 'Perdidas', value: opps.filter(o => o.status === OpportunityStatus.LOST).length },
              ].filter(d => d.value > 0);

              const productDataMap = opps.reduce((acc, curr) => {
                  acc[curr.product] = (acc[curr.product] || 0) + curr.value;
                  return acc;
              }, {} as Record<string, number>);
              
              const productData = Object.keys(productDataMap).map(key => ({ name: key, value: productDataMap[key] }));

              setData({
                  contactCount: contacts.length,
                  oppCount: opps.length,
                  totalWon,
                  totalPipeline,
                  netBalance: incomeTotal - expenseTotal,
                  statusData,
                  productData
              });
          });
      }
  }, [user]);

  if (!user) return null;
  if (!data) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40}/></div>;
  
  // Safe Plan Access
  const plan = plans[user.plan] || plans[PlanType.BASIC];

  const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#ef4444'];

  // Empty State / Onboarding
  if (data.contactCount === 0 && data.oppCount === 0) {
      return (
          <div className="max-w-4xl mx-auto py-10">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-800 dark:to-purple-900 rounded-3xl p-10 text-white shadow-2xl">
                  <h2 className="text-3xl font-bold mb-4">Bem-vindo ao FluxoCRM, {user.name}! 🚀</h2>
                  <p className="text-indigo-100 text-lg mb-8 max-w-2xl">
                      Seu sistema está pronto. Parece que você ainda não tem dados. Vamos configurar seu fluxo de trabalho em dois passos simples?
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Link to="/contacts" className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all group">
                          <div className="bg-white text-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                              <Users size={24} />
                          </div>
                          <h3 className="text-xl font-bold mb-2">1. Adicione Contatos</h3>
                          <p className="text-indigo-100 text-sm mb-4">Cadastre seus clientes e parceiros para começar a interagir.</p>
                          <div className="flex items-center gap-2 font-semibold text-sm">
                              Começar agora <ArrowRight size={16} />
                          </div>
                      </Link>

                      <Link to="/opportunities" className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all group">
                          <div className="bg-white text-purple-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                              <TrendingUp size={24} />
                          </div>
                          <h3 className="text-xl font-bold mb-2">2. Crie Oportunidades</h3>
                          <p className="text-indigo-100 text-sm mb-4">Registre negociações e acompanhe seu funil de vendas.</p>
                          <div className="flex items-center gap-2 font-semibold text-sm">
                              Criar primeira venda <ArrowRight size={16} />
                          </div>
                      </Link>
                  </div>
              </div>

              <div className="mt-8 text-center text-slate-500 dark:text-slate-400">
                  <p className="flex items-center justify-center gap-2">
                      <PlusCircle size={16} /> Dica: Você também pode usar o Assistente IA (botão flutuante) para criar dados falando!
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Executivo</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.netBalance >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            Saldo Líquido: R$ {data.netBalance.toFixed(2)}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Contatos</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{data.contactCount}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                         {plan?.maxContacts === -1 ? 'Ilimitado' : `Limite: ${plan?.maxContacts || 0}`}
                    </p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Oportunidades</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{data.oppCount}</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                    <TrendingUp size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Vendas Fechadas</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">R$ {data.totalWon.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <DollarSign size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Em Negociação</p>
                    <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">R$ {data.totalPipeline.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                    <AlertCircle size={24} />
                </div>
            </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Status das Oportunidades</h3>
              {data.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.statusData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <PieChart size={48} className="opacity-20 mb-2" />
                      <p>Sem dados suficientes</p>
                  </div>
              )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Valor por Produto/Serviço</h3>
              {data.productData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.productData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                          <Tooltip 
                            cursor={{fill: 'transparent'}} 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <BarChart size={48} className="opacity-20 mb-2" />
                      <p>Sem dados de vendas</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
