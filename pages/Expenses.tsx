import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { Expense } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Lock } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { user, plans } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: 0, category: 'Geral', type: 'EXPENSE' as 'INCOME' | 'EXPENSE' });

  useEffect(() => {
    if (user) setExpenses(StorageService.getExpenses(user.id));
  }, [user, isModalOpen]);

  if (!user) return null;
  const plan = plans[user.plan];

  if (!plan.features.expenses && user.role !== 'ADMIN') {
      return (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500">
              <Lock size={48} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-bold mb-2">Funcionalidade Bloqueada</h2>
              <p>Atualize para o plano Avançado ou Expert para gerenciar finanças.</p>
          </div>
      );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
        id: crypto.randomUUID(),
        userId: user.id,
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        type: formData.type,
        date: new Date().toISOString()
    };
    StorageService.saveExpense(newExpense);
    setIsModalOpen(false);
    setFormData({ description: '', amount: 0, category: 'Geral', type: 'EXPENSE' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
        >
            <Plus size={18} /> Adicionar Registro
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                      <th className="p-4 font-medium">Descrição</th>
                      <th className="p-4 font-medium">Categoria</th>
                      <th className="p-4 font-medium">Data</th>
                      <th className="p-4 font-medium text-right">Valor</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum registro financeiro.</td></tr>
                  )}
                  {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-4 flex items-center gap-2">
                              {item.type === 'INCOME' ? <ArrowUpCircle size={16} className="text-emerald-500"/> : <ArrowDownCircle size={16} className="text-red-500"/>}
                              {item.description}
                          </td>
                          <td className="p-4">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{item.category}</span>
                          </td>
                          <td className="p-4 text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                          <td className={`p-4 text-right font-medium ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.type === 'INCOME' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
      
      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">Novo Registro</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="type" checked={formData.type === 'EXPENSE'} onChange={() => setFormData({...formData, type: 'EXPENSE'})} />
                              Despesa
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="type" checked={formData.type === 'INCOME'} onChange={() => setFormData({...formData, type: 'INCOME'})} />
                              Receita
                          </label>
                      </div>
                      <input type="text" placeholder="Descrição" required className="w-full p-2 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      <input type="number" placeholder="Valor" required className="w-full p-2 border rounded" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                      <select className="w-full p-2 border rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option>Geral</option>
                          <option>Alimentação</option>
                          <option>Transporte</option>
                          <option>Escritório</option>
                          <option>Vendas</option>
                      </select>
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
