
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, SchemaType, Type } from '@google/genai';
import { MessageCircle, Save, Send, Smartphone, RefreshCw, QrCode, Loader2, CheckCircle, Power, Wifi, WifiOff, Info, Briefcase, ShoppingBag, Clock, User, Copy, ClipboardCheck, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';
import { BotConfig, OpportunityStatus } from '../types';

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
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text?: string, isTool?: boolean, content?: any}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
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
  }, [chatHistory, isTyping]);

  useEffect(() => {
      let timer: any;
      if (scanStatus === 'scanning' && timeLeft > 0) {
          timer = setInterval(() => {
              setTimeLeft(prev => prev - 1);
          }, 1000);
      } else if (scanStatus === 'scanning' && timeLeft === 0) {
          completeConnection();
      }
      return () => clearInterval(timer);
  }, [scanStatus, timeLeft]);

  const startConnection = () => {
      setScanStatus('loading');
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
      
      OBJETIVO:
      Atender o cliente, tirar dúvidas e, se ele demonstrar interesse, tentar capturar o nome e telefone para criar um Lead usando a ferramenta 'create_lead'.
      
      DIRETRIZES:
      1. Responda de forma curta e natural (estilo WhatsApp).
      2. Use emojis moderadamente.
      3. Se o cliente quiser contratar/comprar, peça o nome e telefone (se não tiver) e chame a função 'create_lead'.
      `;
  };

  // Define Tools
  const getTools = (): { functionDeclarations: FunctionDeclaration[] }[] => {
      return [{
          functionDeclarations: [{
              name: 'create_lead',
              description: 'Registra um novo cliente potencial (Lead) no CRM quando ele demonstra interesse.',
              parameters: {
                  type: Type.OBJECT,
                  properties: {
                      name: { type: Type.STRING, description: 'Nome do cliente' },
                      phone: { type: Type.STRING, description: 'Telefone/WhatsApp do cliente' },
                      interest: { type: Type.STRING, description: 'Produto ou serviço de interesse' }
                  },
                  required: ['name', 'interest']
              }
          }]
      }];
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
                systemInstruction: instruction,
                tools: getTools()
            }
        });
        setAiSession(session);
        setChatHistory([{role: 'model', text: `Olá! Eu sou o ${currentConfig.botName}. Bot conectado e pronto para simular atendimento.`}]);
      } catch (e) {
          console.error(e);
          setChatHistory([{role: 'model', text: 'Erro ao iniciar simulação AI. Verifique sua chave.'}]);
      }
  };

  const handleToolExecution = async (call: any) => {
      if (call.name === 'create_lead') {
          const { name, phone, interest } = call.args;
          
          if (user) {
              // 1. Create Contact
              const contactId = crypto.randomUUID();
              await StorageService.saveContact({
                  id: contactId,
                  userId: user.id,
                  name: name,
                  company: 'Lead WhatsApp',
                  email: '',
                  phone: phone || '',
                  lastInteraction: new Date().toISOString()
              });

              // 2. Create Opportunity
              await StorageService.saveOpportunity({
                  id: crypto.randomUUID(),
                  userId: user.id,
                  contactId: contactId,
                  contactName: name,
                  product: interest || 'Interesse Geral',
                  value: 0, // Valor a definir
                  status: OpportunityStatus.OPEN,
                  createdAt: new Date().toISOString()
              });

              setChatHistory(prev => [...prev, {
                  role: 'model', 
                  isTool: true,
                  text: `⚡ Lead Capturado: ${name} (${interest}) salvo no CRM!`
              }]);

              return { result: "Lead cadastrado com sucesso no CRM." };
          }
      }
      return { result: "Erro ao executar ferramenta." };
  };

  const handleSendMessage = async () => {
      if (!simMessage.trim()) return;
      if (!config.isConnected) {
          alert("Conecte o bot para testar.");
          return;
      }

      if (!aiSession) startSimulation(config, apiKey);

      const userMsg = simMessage;
      setSimMessage('');
      setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsTyping(true);

      try {
          let currentSession = aiSession;
          if (!currentSession && apiKey) {
               const ai = new GoogleGenAI({ apiKey });
               currentSession = ai.chats.create({
                    model: 'gemini-3-pro-preview',
                    config: { systemInstruction: buildSystemInstruction(config), tools: getTools() }
               });
               setAiSession(currentSession);
          }

          if (currentSession) {
              const result = await currentSession.sendMessage({ message: userMsg });
              
              // Handle Tool Calls
              const toolCalls = result.candidates?.[0]?.content?.parts?.filter(p => !!p.functionCall).map(p => p.functionCall);
              
              if (toolCalls && toolCalls.length > 0) {
                  const responseParts = [];
                  for (const call of toolCalls) {
                       if (call) {
                           const toolResult = await handleToolExecution(call);
                           responseParts.push({
                                functionResponse: {
                                    name: call.name,
                                    response: toolResult,
                                    id: call.id
                                }
                           });
                       }
                  }
                  // Send tool response back
                  const finalResponse = await currentSession.sendMessage({ message: responseParts });
                  setChatHistory(prev => [...prev, { role: 'model', text: finalResponse.text }]);
              } else {
                  setChatHistory(prev => [...prev, { role: 'model', text: result.text || '' }]);
              }
          }
      } catch (error) {
          console.error(error);
          setChatHistory(prev => [...prev, { role: 'model', text: 'Erro de conexão.' }]);
      } finally {
          setIsTyping(false);
      }
  };

  const copyPrompt = () => {
      const prompt = buildSystemInstruction(config);
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
      const updatedConfig = { ...config };
      setConfig(updatedConfig);
      await StorageService.saveBotConfig(updatedConfig);
      if (config.isConnected) {
          startSimulation(updatedConfig, apiKey);
          alert("Bot atualizado e re-treinado!");
      } else {
          alert("Configurações salvas.");
      }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-200">
                <MessageCircle size={24} />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Simulador de Bot WhatsApp</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Treine sua IA e simule atendimentos reais.</p>
              </div>
          </div>
          
          <button 
             onClick={copyPrompt}
             className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm font-medium text-sm"
          >
              {copied ? <ClipboardCheck size={16} className="text-emerald-500"/> : <Copy size={16}/>}
              {copied ? 'Prompt Copiado!' : 'Copiar Prompt do Sistema'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Config & Connection */}
          <div className="space-y-6">
              
              {/* Simulator Status */}
              <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border shadow-sm transition-all ${config.isConnected ? 'border-emerald-200 dark:border-emerald-900 shadow-emerald-50 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}>
                  <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2 flex items-center justify-between">
                      Status do Simulador
                      {config.isConnected ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">
                              <Wifi size={12} /> ONLINE
                          </span>
                      ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                              <WifiOff size={12} /> PAUSADO
                          </span>
                      )}
                  </h3>

                  {!config.isConnected ? (
                      <div className="flex flex-col items-center justify-center py-6 space-y-4">
                          {scanStatus === 'idle' && (
                             <div className="text-center w-full">
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                                    Ative o simulador para testar o comportamento da IA com os dados do seu negócio.
                                    <br/><span className="text-xs text-slate-400 mt-2 block">(Este é um ambiente de testes, não conecta ao WhatsApp real)</span>
                                </p>
                                <button 
                                    onClick={startConnection}
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-emerald-200 dark:shadow-none"
                                >
                                    <Power size={20} /> Ativar Simulação
                                </button>
                             </div>
                          )}
                          {scanStatus !== 'idle' && scanStatus !== 'success' && (
                              <div className="flex flex-col items-center animate-in fade-in">
                                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                                  <p className="text-sm text-slate-500 dark:text-slate-400">Iniciando motor de IA...</p>
                              </div>
                          )}
                          {scanStatus === 'success' && (
                              <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 animate-in zoom-in">
                                  <CheckCircle size={48} className="mb-2" />
                                  <p className="font-bold">Simulador Ativo!</p>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                  <Smartphone size={24} />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800 dark:text-white">Ambiente de Teste</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Pronto para receber mensagens</p>
                              </div>
                          </div>
                          <button 
                            onClick={handleDisconnect}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                          >
                             <Power size={16} /> Parar
                          </button>
                      </div>
                  )}
              </div>

              {/* Business Identity */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Identidade do Bot</h3>
                  
                  <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Bot</label>
                            <input 
                                type="text" 
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={config.botName}
                                onChange={e => setConfig({...config, botName: e.target.value})}
                                placeholder="Ex: Bia"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tom de Voz</label>
                            <select 
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição do Negócio</label>
                          <textarea 
                              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 h-24 resize-none outline-none"
                              value={config.businessDescription}
                              onChange={e => setConfig({...config, businessDescription: e.target.value})}
                              placeholder="Descreva sua empresa, valores e o que faz..."
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Produtos e Preços</label>
                          <textarea 
                              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 h-24 resize-none outline-none"
                              value={config.productsAndPrices}
                              onChange={e => setConfig({...config, productsAndPrices: e.target.value})}
                              placeholder="Liste seus produtos e serviços com preços..."
                          />
                      </div>

                      <button 
                        onClick={handleSave}
                        className="w-full bg-slate-800 dark:bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-900 dark:hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={18} /> Salvar e Atualizar Bot
                      </button>
                  </div>
              </div>
          </div>

          {/* Simulator Phone */}
          <div className="relative pt-6 lg:pt-0">
              <div className="bg-slate-900 rounded-[2.5rem] p-4 border-[8px] border-slate-800 shadow-2xl max-w-sm mx-auto h-[700px] flex flex-col relative overflow-hidden">
                  {/* Phone Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                  
                  {/* WhatsApp Header */}
                  <div className="bg-[#075E54] text-white p-3 pt-8 rounded-t-2xl flex items-center gap-3 shadow-md z-10">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                          {config.botName ? config.botName.charAt(0).toUpperCase() : 'B'}
                      </div>
                      <div className="overflow-hidden">
                          <p className="font-bold text-sm truncate">{config.botName || 'Bot WhatsApp'}</p>
                          <p className="text-[10px] opacity-90 flex items-center gap-1">
                              {config.isConnected ? 'Online' : 'Visto por último hoje'}
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
                                  Ative o simulador para começar a conversar com sua IA.
                              </div>
                          </div>
                      )}

                      {config.isConnected && chatHistory.length === 1 && (
                          <div className="flex justify-center mt-2">
                              <div className="bg-white/90 backdrop-blur text-xs text-slate-500 px-3 py-1 rounded-full shadow-sm border border-slate-100">
                                  Use este chat para testar vendas. Tente dizer "Quero contratar".
                              </div>
                          </div>
                      )}
                      
                      {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${msg.isTool ? 'w-full !items-center my-2' : ''}`}>
                              {msg.isTool ? (
                                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-in zoom-in">
                                      <Zap size={12} className="fill-indigo-600" />
                                      {msg.text}
                                  </div>
                              ) : (
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
                              )}
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
                        className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm outline-none border-none placeholder:text-slate-400 text-slate-800"
                        placeholder={config.isConnected ? "Digite como um cliente..." : "Ative o simulador"}
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
          </div>
      </div>
    </div>
  );
};
