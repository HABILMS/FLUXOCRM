
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { MessageCircle, Save, Send, Smartphone, RefreshCw, QrCode, Loader2, CheckCircle, Power, Wifi, WifiOff, Info, Briefcase, ShoppingBag, Clock, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { BotConfig } from '../types';

export const WhatsappBot: React.FC = () => {
  const { user } = useApp();
  const [config, setConfig] = useState<BotConfig>({
      userId: '', whatsappNumber: '', botName: '', systemInstructions: '', isConnected: false,
      businessDescription: '', productsAndPrices: '', operatingHours: '', communicationTone: 'Profissional e Educado'
  });
  
  // Connection State
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'scanning' | 'success'>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);

  // Simulation State
  const [simMessage, setSimMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // AI Session
  const [aiSession, setAiSession] = useState<Chat | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (user) {
        const load = async () => {
            const stored = await StorageService.getBotConfig(user.id);
            setConfig(stored);
            const settings = await StorageService.getUserSettings(user.id);
            setApiKey(settings.googleApiKey || process.env.API_KEY || '');
            
            if (stored.isConnected) {
                startSimulation(stored, settings.googleApiKey || process.env.API_KEY || '');
            }
        }
        load();
    }
  }, [user]);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
      let timer: any;
      if (scanStatus === 'scanning' && timeLeft > 0) {
          timer = setInterval(() => {
              setTimeLeft(prev => prev - 1);
          }, 1000);
      } else if (scanStatus === 'scanning' && timeLeft === 0) {
          // Auto connect for demo
          completeConnection();
      }
      return () => clearInterval(timer);
  }, [scanStatus, timeLeft]);

  const startConnection = () => {
      setScanStatus('loading');
      // Simulate API Call to get QR
      setTimeout(() => {
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=FluxoCRM-Auth-${Date.now()}`);
          setScanStatus('scanning');
          setTimeLeft(10);
      }, 1500);
  };

  const completeConnection = async () => {
      setScanStatus('success');
      setTimeout(async () => {
          const updated = { ...config, isConnected: true, lastConnection: new Date().toISOString(), connectionStatus: 'connected' as const };
          setConfig(updated);
          await StorageService.saveBotConfig(updated);
          setScanStatus('idle');
          startSimulation(updated, apiKey);
      }, 1000);
  };

  const handleDisconnect = async () => {
      if(confirm('Deseja desconectar? O bot parará de responder.')) {
        const updated = { ...config, isConnected: false, connectionStatus: 'disconnected' as const };
        setConfig(updated);
        await StorageService.saveBotConfig(updated);
        setAiSession(null);
        setChatHistory([]);
      }
  };

  const buildSystemInstruction = (cfg: BotConfig) => {
      return `Você é ${cfg.botName}, um assistente virtual no WhatsApp para o negócio descrito abaixo.
      
      SOBRE O NEGÓCIO:
      ${cfg.businessDescription || 'Não informado.'}
      
      PRODUTOS E PREÇOS:
      ${cfg.productsAndPrices || 'Consulte o atendimento.'}
      
      HORÁRIO DE ATENDIMENTO:
      ${cfg.operatingHours || 'Segunda a Sexta, horário comercial.'}
      
      TOM DE VOZ:
      ${cfg.communicationTone || 'Profissional'}
      
      DIRETRIZES:
      1. Responda de forma curta e natural, como no WhatsApp.
      2. Use emojis moderadamente se o tom permitir.
      3. Jamais invente preços ou produtos não listados.
      4. Se não souber a resposta, peça gentilmente para o cliente aguardar um humano.
      `;
  };

  const startSimulation = (currentConfig: BotConfig, key: string) => {
      if (!key) {
          setChatHistory([{role: 'model', text: 'ERRO: Chave de API não encontrada. Configure em Configurações.'}]);
          return;
      }

      try {
        const instruction = buildSystemInstruction(currentConfig);
        const ai = new GoogleGenAI({ apiKey: key });
        const session = ai.chats.create({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction: instruction
            }
        });
        setAiSession(session);
        setChatHistory([{role: 'model', text: `Olá! Eu sou o ${currentConfig.botName}. Bot conectado e pronto para atender.`}]);
      } catch (e) {
          console.error(e);
          setChatHistory([{role: 'model', text: 'Erro ao iniciar simulação AI. Verifique sua chave.'}]);
      }
  };

  const handleSave = async () => {
      const updatedConfig = {
          ...config,
          systemInstructions: buildSystemInstruction(config)
      };
      setConfig(updatedConfig);
      await StorageService.saveBotConfig(updatedConfig);
      
      if (config.isConnected) {
          startSimulation(updatedConfig, apiKey); 
          alert("Informações atualizadas e bot re-treinado!");
      } else {
          alert("Informações salvas! Conecte o WhatsApp para ativar.");
      }
  };

  const handleSendMessage = async () => {
      if (!simMessage.trim()) return;
      
      if (!config.isConnected) {
          alert("Conecte seu WhatsApp primeiro para testar o bot.");
          return;
      }

      if (!aiSession) {
          startSimulation(config, apiKey);
      }

      const userMsg = simMessage;
      setSimMessage('');
      setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsTyping(true);

      try {
          let currentSession = aiSession;
          if (!currentSession) {
               // Retry creation if lost
               if (!apiKey) throw new Error("Sem API Key");
               const ai = new GoogleGenAI({ apiKey });
               currentSession = ai.chats.create({
                    model: 'gemini-3-pro-preview',
                    config: {
                        systemInstruction: buildSystemInstruction(config)
                    }
               });
               setAiSession(currentSession);
          }

          const result = await currentSession!.sendMessage({ message: userMsg });
          setChatHistory(prev => [...prev, { role: 'model', text: result.text || '' }]);
      } catch (error) {
          console.error(error);
          setChatHistory(prev => [...prev, { role: 'model', text: 'Erro na conexão com o servidor de IA. Verifique sua chave em Configurações.' }]);
      } finally {
          setIsTyping(false);
      }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-emerald-600 rounded-lg text-white">
            <MessageCircle size={24} />
          </div>
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Bot WhatsApp Humanizado</h2>
              <p className="text-slate-500 text-sm">Configure as informações do seu negócio e conecte seu WhatsApp via QR Code.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Connection & Config */}
          <div className="space-y-6">
              
              {/* Connection Card */}
              <div className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${config.isConnected ? 'border-emerald-200 shadow-emerald-50' : 'border-slate-200'}`}>
                  <h3 className="font-bold text-lg text-slate-700 mb-4 border-b pb-2 flex items-center justify-between">
                      Status da Conexão
                      {config.isConnected ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              <Wifi size={12} /> ONLINE
                          </span>
                      ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                              <WifiOff size={12} /> OFFLINE
                          </span>
                      )}
                  </h3>

                  {!config.isConnected ? (
                      <div className="flex flex-col items-center justify-center py-4 space-y-4">
                          {scanStatus === 'idle' && (
                             <div className="text-center">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <QrCode size={32} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 text-sm mb-4 max-w-xs mx-auto">
                                    Para iniciar, gere um QR Code e escaneie com a câmera do seu WhatsApp (Menu Dispositivos Conectados).
                                </p>
                                <button 
                                    onClick={startConnection}
                                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-emerald-200"
                                >
                                    <QrCode size={18} /> Gerar QR Code
                                </button>
                             </div>
                          )}

                          {scanStatus === 'loading' && (
                              <div className="flex flex-col items-center">
                                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                                  <p className="text-sm text-slate-500">Gerando código de acesso seguro...</p>
                              </div>
                          )}

                          {scanStatus === 'scanning' && (
                              <div className="text-center animate-in fade-in zoom-in duration-300">
                                  <div className="p-4 bg-white border-2 border-slate-900 rounded-xl inline-block mb-4 relative">
                                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                                      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse rounded-lg pointer-events-none"></div>
                                  </div>
                                  <p className="font-bold text-slate-700">Aponte a câmera do seu WhatsApp</p>
                                  <p className="text-xs text-slate-500 mt-1">Aguardando leitura... {timeLeft}s</p>
                              </div>
                          )}

                          {scanStatus === 'success' && (
                              <div className="flex flex-col items-center text-emerald-600">
                                  <CheckCircle size={48} className="mb-2" />
                                  <p className="font-bold">Dispositivo Pareado!</p>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                  <Smartphone size={24} />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800">{config.whatsappNumber || 'Número Conectado'}</p>
                                  <p className="text-xs text-slate-500">Ativo desde: {new Date(config.lastConnection || Date.now()).toLocaleDateString()}</p>
                              </div>
                          </div>
                          <button 
                            onClick={handleDisconnect}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                          >
                             <Power size={16} /> Desconectar
                          </button>
                      </div>
                  )}
              </div>

              {/* Configuration Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-700 mb-4 border-b pb-2">Identidade do Negócio</h3>
                  
                  <div className="space-y-5">
                      <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700">
                          <Info size={16} className="shrink-0 mt-0.5" />
                          <p>
                            Preencha os dados abaixo para que o bot responda de forma humanizada e precisa. Essas informações treinam a IA sobre seu negócio.
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Bot/Atendente</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={config.botName}
                                    onChange={e => setConfig({...config, botName: e.target.value})}
                                    placeholder="Ex: Bia"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seu WhatsApp</label>
                            <div className="relative">
                                <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={config.whatsappNumber}
                                    onChange={e => setConfig({...config, whatsappNumber: e.target.value})}
                                    placeholder="Ex: (11) 99999-9999"
                                />
                            </div>
                        </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">O que sua empresa faz?</label>
                          <div className="relative">
                                <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                                <textarea 
                                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                                    value={config.businessDescription}
                                    onChange={e => setConfig({...config, businessDescription: e.target.value})}
                                    placeholder="Ex: Somos uma consultoria especializada em marketing digital para pequenas empresas..."
                                />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Principais Produtos/Serviços e Preços</label>
                          <div className="relative">
                                <ShoppingBag size={16} className="absolute left-3 top-3 text-slate-400" />
                                <textarea 
                                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                                    value={config.productsAndPrices}
                                    onChange={e => setConfig({...config, productsAndPrices: e.target.value})}
                                    placeholder="Ex: Consultoria Express (R$ 500), Gestão Mensal (R$ 2000)..."
                                />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={config.operatingHours}
                                    onChange={e => setConfig({...config, operatingHours: e.target.value})}
                                    placeholder="Ex: Seg-Sex 9h-18h"
                                />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tom de Voz</label>
                            <select 
                                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                value={config.communicationTone}
                                onChange={e => setConfig({...config, communicationTone: e.target.value})}
                            >
                                <option value="Profissional e Educado">Profissional</option>
                                <option value="Amigável e Divertido">Amigável</option>
                                <option value="Objetivo e Direto">Objetivo</option>
                                <option value="Sofisticado">Sofisticado</option>
                            </select>
                          </div>
                      </div>

                      <button 
                        onClick={handleSave}
                        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={18} /> Salvar e Treinar Bot
                      </button>
                  </div>
              </div>
          </div>

          {/* Right Column: Simulator */}
          <div className="relative pt-6 lg:pt-0">
              <div className="bg-slate-900 rounded-[2.5rem] p-4 border-[8px] border-slate-800 shadow-2xl max-w-sm mx-auto h-[640px] flex flex-col relative">
                  {/* Phone UI Details */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-10"></div>
                  <div className="absolute right-[-12px] top-24 w-1 h-16 bg-slate-700 rounded-r"></div>
                  <div className="absolute left-[-12px] top-24 w-1 h-8 bg-slate-700 rounded-l"></div>
                  <div className="absolute left-[-12px] top-36 w-1 h-16 bg-slate-700 rounded-l"></div>
                  
                  {/* WhatsApp Header */}
                  <div className="bg-[#075E54] text-white p-3 pt-8 rounded-t-2xl flex items-center gap-3 shadow-md z-0">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                          {config.botName ? config.botName.charAt(0).toUpperCase() : 'B'}
                      </div>
                      <div className="overflow-hidden">
                          <p className="font-bold text-sm truncate">{config.botName || 'Bot WhatsApp'}</p>
                          <p className="text-[10px] opacity-90 flex items-center gap-1">
                              {config.isConnected ? 'Online' : 'Visto por último hoje às 10:00'}
                          </p>
                      </div>
                      <button 
                        onClick={() => config.isConnected && apiKey && startSimulation(config, apiKey)} 
                        className="ml-auto p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Reiniciar conversa"
                      >
                          <RefreshCw size={16} />
                      </button>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 bg-[#e5ded8] overflow-y-auto p-4 space-y-3 relative" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'soft-light'}}>
                      {!config.isConnected && (
                          <div className="flex justify-center mt-4">
                              <div className="bg-[#fff5c4] text-slate-600 text-xs p-2 rounded shadow text-center max-w-[80%]">
                                  🔒 As mensagens são protegidas com criptografia de ponta-a-ponta.
                              </div>
                          </div>
                      )}
                      
                      {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-2 px-3 rounded-lg text-sm shadow-sm relative ${
                                  msg.role === 'user' 
                                  ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                                  : 'bg-white text-slate-800 rounded-tl-none'
                              }`}>
                                  {msg.text}
                                  <span className="text-[10px] text-slate-400 block text-right mt-1 select-none">
                                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      {msg.role === 'user' && <span className="ml-1 text-blue-400">✓✓</span>}
                                  </span>
                              </div>
                          </div>
                      ))}
                      {isTyping && (
                          <div className="flex justify-start">
                              <div className="bg-white p-2 px-4 rounded-lg rounded-tl-none text-xs text-slate-500 shadow-sm italic animate-pulse">
                                  Digitando...
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="bg-[#f0f0f0] p-2 rounded-b-2xl flex items-center gap-2 relative z-10">
                      <input 
                        type="text" 
                        className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm outline-none border-none placeholder:text-slate-400"
                        placeholder={config.isConnected ? "Digite uma mensagem..." : "Conecte o bot para testar"}
                        value={simMessage}
                        disabled={!config.isConnected}
                        onChange={e => setSimMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={!config.isConnected}
                        className={`p-2.5 rounded-full shadow-sm transition-all ${
                            config.isConnected 
                            ? 'bg-[#128C7E] text-white hover:bg-[#075E54]' 
                            : 'bg-slate-300 text-slate-500'
                        }`}
                      >
                          <Send size={18} />
                      </button>
                  </div>
              </div>
              <p className="text-center text-slate-400 text-xs mt-4">Simulador de ambiente WhatsApp</p>
          </div>
      </div>
    </div>
  );
};
