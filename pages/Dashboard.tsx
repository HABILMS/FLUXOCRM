import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
import { OpportunityStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { user, plans } = useApp();
  
  const data = useMemo(() => {
      if (!user) return null;
      const opps = StorageService.getOpportunities(user.id);
      const contacts = StorageService.getContacts(user.id);
      const expenses = StorageService.getExpenses(user.id);

      const totalWon = opps.filter(o => o.status === OpportunityStatus.WON).reduce((acc, curr) => acc + curr.value, 0);
      const totalPipeline = opps.filter(o => o.status !== OpportunityStatus.WON && o.status !== OpportunityStatus.LOST).reduce((acc, curr) => acc + curr.value, 0);
      
      const expenseTotal = expenses.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
      const incomeTotal = expenses.filter(e => e.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0); // Usually matches won, but tracking separately in expenses ledger

      // Chart Data: Opportunities by Status
      const statusData = [
          { name: 'Abertas', value: opps.filter(o => o.status === OpportunityStatus.OPEN).length },
          { name: 'Negociação', value: opps.filter(o => o.status === OpportunityStatus.NEGOTIATION).length },
          { name: 'Ganhas', value: opps.filter(o => o.status === OpportunityStatus.WON).length },
          { name: 'Perdidas', value: opps.filter(o => o.status === OpportunityStatus.LOST).length },
      ].filter(d => d.value > 0);

      // Chart Data: Pipeline Value by Product
      const productDataMap = opps.reduce((acc, curr) => {
          acc[curr.product] = (acc[curr.product] || 0) + curr.value;
          return acc;
      }, {} as Record<string, number>);
      
      const productData = Object.keys(productDataMap).map(key => ({ name: key, value: productDataMap[key] }));

      return {
          contactCount: contacts.length,
          oppCount: opps.length,
          totalWon,
          totalPipeline,
          netBalance: incomeTotal - expenseTotal,
          statusData,
          productData
      };
  }, [user]);

  if (!user || !data) return <div>Loading...</div>;
  const plan = plans[user.plan];

  const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Executivo</h2>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
            Saldo Líquido: R$ {data.netBalance.toFixed(2)}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500">Total Contatos</p>
                    <h3 className="text-2xl font-bold mt-1">{data.contactCount}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                         {plan.maxContacts === -1 ? 'Ilimitado' : `Limite: ${plan.maxContacts}`}
                    </p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Users size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500">Oportunidades</p>
                    <h3 className="text-2xl font-bold mt-1">{data.oppCount}</h3>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <TrendingUp size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500">Vendas Fechadas</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-600">R$ {data.totalWon.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <DollarSign size={24} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500">Em Negociação</p>
                    <h3 className="text-2xl font-bold mt-1 text-amber-600">R$ {data.totalPipeline.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertCircle size={24} />
                </div>
            </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
              <h3 className="font-semibold text-slate-700 mb-4">Status das Oportunidades</h3>
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
                    >
                        {data.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
              <h3 className="font-semibold text-slate-700 mb-4">Valor por Produto/Serviço</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.productData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};
