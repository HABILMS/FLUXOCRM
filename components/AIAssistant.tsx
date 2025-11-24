
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, MessageSquare, Volume2, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { ChatMessage } from '../types';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';

// Web Speech API Type shim
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const AIAssistant: React.FC = () => {
  const { user, plans } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Permissions: Allow if plan has feature OR if user is ADMIN
  const planConfig = user ? plans[user.plan] : null;
  const hasAccess = (planConfig?.features.aiAssistant) || (user?.role === 'ADMIN');

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'model',
        text: 'Olá! Sou seu assistente financeiro e operacional. Posso ajudar a registrar despesas ("Gastei 50 no almoço"), criar receitas ("Recebi 500 de consultoria") ou navegar pelo sistema.',
        timestamp: Date.now()
      }]);
    }
  }, [isOpen, messages.length]);

  const handleToolCall = async (call: any) => {
      console.log("Executando Ferramenta:", call.name, call.args);
      
      try {
        if (call.name === 'navigate') {
            const page = call.args.page.toLowerCase();
            if (['dashboard', 'contacts', 'opportunities', 'expenses', 'activities', 'admin'].includes(page)) {
                navigate(`/${page}`);
                return `Navegando para a página ${page}...`;
            }
            return `Página ${page} não encontrada. Tente: dashboard, contatos, financeiro.`;
        }

        if (call.name === 'create_expense') {
            const { description, amount, category } = call.args;
            if (user) {
                await StorageService.saveExpense({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    description: description || 'Despesa sem nome',
                    amount: Number(amount),
                    category: category || 'Geral',
                    date: new Date().toISOString(),
                    type: 'EXPENSE'
                });
                return `✅ Despesa registrada: "${description}" no valor de R$ ${amount}.`;
            }
            return "Erro: Usuário não identificado.";
        }

        if (call.name === 'create_income') {
            const { description, amount, category } = call.args;
            if (user) {
                await StorageService.saveExpense({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    description: description || 'Receita sem nome',
                    amount: Number(amount),
                    category: category || 'Vendas',
                    date: new Date().toISOString(),
                    type: 'INCOME'
                });
                return `💰 Receita registrada: "${description}" no valor de R$ ${amount}.`;
            }
            return "Erro: Usuário não identificado.";
        }
      } catch (error) {
          console.error("Erro na ferramenta:", error);
          return "Ocorreu um erro ao processar essa ação no banco de dados.";
      }

      return "Ferramenta desconhecida.";
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    const history = messages.map(m => ({ role: m.role, text: m.text }));

    const systemInstruction = `
      Você é um assistente de CRM inteligente.
      Data de hoje: ${new Date().toLocaleDateString('pt-BR')}.
      
      SUAS FERRAMENTAS:
      1. 'navigate': Use para ir para telas (dashboard, contacts, expenses, opportunities).
      2. 'create_expense': Use quando o usuário disser "gastei", "paguei", "comprei", "despesa de X".
      3. 'create_income': Use quando o usuário disser "recebi", "ganhei", "vendi", "faturei", "entrada de X".

      REGRAS:
      - Se o usuário falar valores monetários, tente extrair o número e a descrição.
      - Responda de forma curta e prestativa.
      - Se usar uma ferramenta, sua resposta final deve confirmar o que foi feito com base no retorno da ferramenta.
    `;

    const responseText = await geminiService.sendMessage(history, text, systemInstruction, handleToolCall);

    const modelMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsProcessing(false);

    if (planConfig?.features.voiceCommands) {
        speak(responseText);
    }
  };

  const speak = (text: string) => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
      }
  };

  const toggleSpeech = () => {
      if (isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
      }
  };

  const startListening = async () => {
    const w = window as unknown as IWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        alert("É necessário permitir o acesso ao microfone.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
        console.error(event.error);
        setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  if (!user || !hasAccess) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50 flex items-center justify-center"
          title="Assistente Inteligente"
        >
          <MessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in slide-in-from-bottom-10">
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Fluxo AI Assistant</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Beta</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={16} />
                        Pensando...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
             {planConfig?.features.voiceCommands && (
                <button
                onClick={startListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                title="Falar"
                >
                <Mic size={20} />
                </button>
             )}
             {planConfig?.features.voiceCommands && isSpeaking && (
                 <button onClick={toggleSpeech} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 animate-pulse">
                     <Volume2 size={20} />
                 </button>
             )}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Digite ou fale..."
              className="flex-1 bg-slate-100 dark:bg-slate-700 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-300 dark:focus:border-indigo-500 border rounded-full px-4 py-2 text-sm outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isProcessing}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
