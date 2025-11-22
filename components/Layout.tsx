
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { PlanType } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Wallet, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Bell,
  Check,
  Image,
  MessageCircle
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, plans, notifications, refreshNotifications } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifRef]);

  if (!user) return <>{children}</>;

  // Safe plan access with fallback
  const plan = plans[user.plan] || plans[PlanType.BASIC];
  
  // Safety check: if plan is completely missing (rare), use a safe default object
  const safePlan = plan || { 
    name: 'Desconhecido', 
    features: { expenses: false, aiAssistant: false, voiceCommands: false },
    maxContacts: 0,
    maxOpportunities: 0
  };

  const isAdmin = user.role === 'ADMIN';
  const isExpert = user.plan === 'EXPERT' || isAdmin;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = (id: string) => {
      StorageService.markNotificationRead(id);
      refreshNotifications();
  };

  const markAllRead = () => {
      StorageService.markAllNotificationsRead(user.id);
      refreshNotifications();
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, visible: true },
    { label: 'Contatos', path: '/contacts', icon: Users, visible: true },
    { label: 'Oportunidades', path: '/opportunities', icon: Briefcase, visible: true },
    { label: 'Financeiro', path: '/expenses', icon: Wallet, visible: safePlan.features.expenses || isAdmin },
    { label: 'Atividades', path: '/activities', icon: Calendar, visible: true },
    { label: 'Admin', path: '/admin', icon: Settings, visible: isAdmin },
  ];

  // Expert Features
  const expertItems = [
      { label: 'Criar Imagens', path: '/image-gen', icon: Image, visible: isExpert },
      { label: 'Bot Whatsapp', path: '/whatsapp-bot', icon: MessageCircle, visible: isExpert }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            Fluxo<span className="text-slate-800">CRM</span>
          </h1>
          <div className="mt-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Plano {safePlan.name}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.filter(i => i.visible).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}

          {isExpert && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-2">Marketing & AI</p>
                  {expertItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-indigo-50 text-indigo-700 font-medium' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
           <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
               <Settings size={18} /> Configurações
           </Link>
          <div className="flex items-center gap-3 px-2 py-2">
            <img src={user.avatar || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-20">
        <span className="font-bold text-xl text-indigo-600">FluxoCRM</span>
        <div className="flex items-center gap-4">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-slate-600">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4 space-y-2 overflow-y-auto">
           {navItems.filter(i => i.visible).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 border-b border-slate-100"
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            
            {isExpert && (
                <>
                    <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase mt-2">Expert Features</div>
                    {expertItems.map(item => (
                         <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-slate-700 border-b border-slate-100"
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}
                </>
            )}

             <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 border-b border-slate-100"
              >
                <Settings size={20} /> Configurações
              </Link>
            <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 text-red-600 mt-4">
                <LogOut size={20} /> Sair
            </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 p-6 overflow-y-auto h-screen relative">
        
        {/* Desktop Top Bar with Notifications */}
        <div className="hidden md:flex justify-end mb-6 sticky top-0 z-20 pointer-events-none">
            <div className="relative pointer-events-auto" ref={notifRef}>
                <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)} 
                    className="p-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 hover:bg-slate-50 relative"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {/* Notification Dropdown */}
                {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-slate-700">Notificações</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800">
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">Nenhuma notificação</div>
                            ) : (
                                notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1">
                                                <h4 className={`text-sm ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                    {n.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-2 block">
                                                    {new Date(n.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {!n.read && (
                                                <button onClick={() => markAsRead(n.id)} className="text-slate-400 hover:text-indigo-600">
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
