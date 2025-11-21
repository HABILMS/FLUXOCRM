
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { Contact } from '../types';
import { Plus, Search, Edit, Phone, Mail, Building, MapPin, X, User, MessageCircle, Loader2 } from 'lucide-react';

export const Contacts: React.FC = () => {
  const { user, plans } = useApp();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
      name: '', company: '', email: '', phone: '', address: ''
  });

  useEffect(() => {
    if (user) {
        setLoading(true);
        StorageService.getContacts(user.id).then(data => {
            setContacts(data);
            setLoading(false);
        });
    }
  }, [user, isModalOpen]);

  if (!user) return null;
  const plan = plans[user.plan];
  const canAdd = plan.maxContacts === -1 || contacts.length < plan.maxContacts;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: Contact = {
        id: editingContact ? editingContact.id : crypto.randomUUID(),
        userId: user.id,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        lastInteraction: editingContact ? editingContact.lastInteraction : new Date().toISOString()
    };
    await StorageService.saveContact(newContact);
    closeModal();
  };

  const deleteContact = async (id: string) => {
      if (confirm("Deseja excluir este contato?")) {
          await StorageService.deleteContact(id);
          // Refresh
          const data = await StorageService.getContacts(user.id);
          setContacts(data);
      }
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormData({ name: '', company: '', email: '', phone: '', address: '' });
  }

  const openEdit = (c: Contact) => {
      setEditingContact(c);
      setFormData({ 
          name: c.name, 
          company: c.company, 
          email: c.email, 
          phone: c.phone,
          address: c.address || ''
      });
      setIsModalOpen(true);
  };

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWhatsappLink = (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      if (clean.length >= 10 && clean.length <= 11) {
          return `https://wa.me/55${clean}`;
      }
      return `https://wa.me/${clean}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Contatos</h2>
            <p className="text-slate-500 mt-1 font-medium">{contacts.length} / {plan.maxContacts === -1 ? '∞' : plan.maxContacts} contatos</p>
        </div>
        <button 
            onClick={() => { setEditingContact(null); setFormData({ name: '', company: '', email: '', phone: '', address: '' }); setIsModalOpen(true); }}
            disabled={!canAdd}
            className="bg-indigo-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all hover:scale-105 font-semibold"
        >
            <Plus size={20} /> Novo Contato
        </button>
      </div>

      <div className="relative mb-8 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou empresa..." 
            className="w-full pl-14 pr-6 py-4 rounded-full border border-slate-200 bg-white focus:bg-slate-50 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all font-medium text-slate-900 placeholder:text-slate-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
      </div>

      {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(contact => (
                <div key={contact.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-5">
                        <div className="w-14 h-14 bg-slate-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-2xl border border-slate-100 shadow-inner">
                            {contact.name.charAt(0)}
                        </div>
                        <button onClick={() => openEdit(contact)} className="text-slate-300 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-full">
                            <Edit size={18} />
                        </button>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-xl truncate mb-1 ml-1">{contact.name}</h3>
                    <p className="text-slate-500 text-sm font-medium mb-4 flex items-center gap-1.5 ml-1">
                        <Building size={14} />
                        {contact.company || 'Empresa não informada'}
                    </p>

                    <div className="space-y-3 pt-4 border-t border-slate-50">
                        <a 
                            href={`mailto:${contact.email}`} 
                            className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors group/action cursor-pointer"
                            title="Enviar Email"
                        >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-400 shadow-sm shrink-0 group-hover/action:bg-indigo-600 group-hover/action:text-white transition-all">
                                <Mail size={14} />
                            </div>
                            <span className="truncate select-all font-medium">{contact.email}</span>
                        </a>
                        
                        <a 
                            href={getWhatsappLink(contact.phone)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors group/action cursor-pointer"
                            title="Abrir no WhatsApp"
                        >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm shrink-0 group-hover/action:bg-emerald-500 group-hover/action:text-white transition-all">
                                <MessageCircle size={14} />
                            </div>
                            <span className="truncate select-all font-medium">{contact.phone || 'Sem telefone'}</span>
                        </a>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Modal (Same as before) */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity animate-in fade-in duration-200">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-white/20">
                  <form onSubmit={handleSave} className="p-8 space-y-5">
                      <h3 className="text-2xl font-bold text-slate-800 mb-6">
                          {editingContact ? 'Editar Contato' : 'Novo Contato'}
                      </h3>
                      {/* ... same fields ... */}
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-4">Nome</label>
                                  <div className="relative">
                                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input type="text" required className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-full outline-none text-slate-900 focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-4">Empresa</label>
                                  <div className="relative">
                                      <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input type="text" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-full outline-none text-slate-900 focus:ring-2 focus:ring-indigo-500" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                                  </div>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-4">Email</label>
                              <div className="relative">
                                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input type="email" required className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-full outline-none text-slate-900 focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-4">Telefone</label>
                              <div className="relative">
                                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input type="tel" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-full outline-none text-slate-900 focus:ring-2 focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                          <button type="button" onClick={closeModal} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-full">Cancelar</button>
                          <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700">Salvar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
