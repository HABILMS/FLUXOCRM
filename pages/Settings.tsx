
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { UserSettings } from '../types';
import { Bell, Save, Sparkles, Key, Trash2, Eye, EyeOff } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export const Settings: React.FC = () => {
  const { user } = useApp();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (user) {
      const userSettings = StorageService.getUserSettings(user.id);
      setSettings(userSettings);
      setCustomKey(userSettings.googleApiKey || '');
    }
    checkApiKey();
  }, [user]);

  const checkApiKey = async () => {
    if ((window as any).aistudio) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(has);
    }
  };

  const handleApiKeySelection = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        checkApiKey();
    }
  };

  if (!user || !settings) return null;

  const handleSave = () => {
    if (settings) {
      const updatedSettings = { ...settings, googleApiKey: customKey };
      setSettings(updatedSettings);
      StorageService.saveUserSettings(updatedSettings);
      
      if (settings.notificationsEnabled) {
          notificationService.requestPermission();
      }
      alert('Configurações salvas com sucesso!');
    }
  };

  const handleDeleteKey = () => {
      setCustomKey('');
      if (settings) {
          const updatedSettings = { ...settings, googleApiKey: '' };
          setSettings(updatedSettings);
          StorageService.saveUserSettings(updatedSettings);
      }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Configurações</h2>

      <div className="space-y-6">
        {/* Notifications Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Bell size={24} />
              </div>
              <div>
                  <h3 className="font-semibold text-slate-800">Notificações</h3>
                  <p className="text-sm text-slate-500">Gerencie seus alertas e lembretes</p>
              </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="font-medium text-slate-700">Habilitar Notificações</label>
                        <p className="text-xs text-slate-500">Receba alertas no navegador</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={settings.notificationsEnabled} 
                          onChange={(e) => setSettings({...settings, notificationsEnabled: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block font-medium text-slate-700 mb-2">Alertar antes da atividade (minutos)</label>
                    <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="5" 
                          max="60" 
                          step="5" 
                          value={settings.activityAlertMinutes}
                          onChange={(e) => setSettings({...settings, activityAlertMinutes: parseInt(e.target.value)})}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          disabled={!settings.notificationsEnabled}
                        />
                        <span className="font-bold text-indigo-600 w-12 text-right">{settings.activityAlertMinutes}m</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Você receberá um alerta {settings.activityAlertMinutes} minutos antes do horário agendado.
                    </p>
                </div>
            </div>
          </div>
        </div>

        {/* AI API Key Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Sparkles size={24} />
              </div>
              <div>
                  <h3 className="font-semibold text-slate-800">Inteligência Artificial</h3>
                  <p className="text-sm text-slate-500">Configure sua chave para usar recursos avançados</p>
              </div>
            </div>
            
            {/* Manual Key Input */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chave de API Google AI Studio</label>
                    <div className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type={showKey ? "text" : "password"}
                                value={customKey}
                                onChange={(e) => setCustomKey(e.target.value)}
                                placeholder="Cole sua chave API aqui (AIza...)"
                                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {customKey && (
                            <button 
                                onClick={handleDeleteKey}
                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover Chave"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Sua chave é armazenada localmente no navegador. Para produção, use um backend seguro.
                    </p>
                </div>

                {/* AI Studio OAuth Link (Alternative) */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                          <label className="font-medium text-slate-700 text-sm">Conexão Rápida (Preview)</label>
                          <p className="text-xs text-slate-500">
                            {hasApiKey ? 'Chave de sessão conectada.' : 'Usar chave temporária de sessão.'}
                          </p>
                      </div>
                      <button 
                        onClick={handleApiKeySelection}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                            hasApiKey 
                            ? 'border-slate-200 text-slate-600 hover:bg-slate-50' 
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {hasApiKey ? 'Alterar Sessão' : 'Conectar Sessão'}
                      </button>
                </div>
            </div>
          </div>
        </div>
      
        <div className="flex justify-end">
            <button 
                onClick={handleSave} 
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-200"
            >
                <Save size={18} /> Salvar Preferências
            </button>
        </div>
      </div>
    </div>
  );
};
