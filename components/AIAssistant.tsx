
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, MessageSquare, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { PlanType } from '../types';
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

  // Check Permissions based on Plan
  const planConfig = user ? plans[user.plan] : null;
  const hasAccess = planConfig?.features.aiAssistant;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'model',
        text: 'Olá! Sou seu assistente virtual. Como posso ajudar hoje? Você pode pedir para navegar, adicionar despesas, receitas ou ver oportunidades.',
        timestamp: Date.now()
      }]);
    }
  }, [isOpen, messages.length]);

  const handleToolCall = async (call: any) => {
      console.log("Tool Call:", call);
      if (call.name === 'navigate') {
          const page = call.args.page.toLowerCase();
          if (['dashboard', 'contacts', 'opportunities', 'expenses', 'activities', 'admin'].includes(page)) {
              navigate(`/${page}`);
              return `Navigated to ${page}`;
          }
          return `Page ${page} not found`;
      }
      if (call.name === 'create_expense') {
          const { description, amount, category } = call.args;
          if (user) {
              StorageService.saveExpense({
                  id: crypto.randomUUID(),
                  userId: user.id,
                  description,
                  amount: Number(amount),
                  category: category || 'Geral',
                  date: new Date().toISOString(),
                  type: 'EXPENSE'
              });
              return `Expense created: ${description} for ${amount}`;
          }
          return "User not logged in";
      }
      if (call.name === 'create_income') {
          const { description, amount, category } = call.args;
          if (user) {
              StorageService.saveExpense({
                  id: crypto.randomUUID(),
                  userId: user.id,
                  description,
                  amount: Number(amount),
                  category: category || 'Vendas',
                  date: new Date().toISOString(),
                  type: 'INCOME'
              });
              return `Income created: ${description} for ${amount}`;
          }
          return "User not logged in";
      }
      return "Unknown tool";
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

    // Build history context excluding current message
    const history = messages.map(m => ({ role: m.role, text: m.text }));

    // System instruction
    const systemInstruction = `
      Você é um assistente de CRM útil e eficiente. O usuário é um consultor ou vendedor.
      Responda de forma concisa em Português.
      Você tem acesso a ferramentas para navegar no app, criar despesas e REGISTRAR RECEITAS (ganhos).
      Hoje é ${new Date().toLocaleDateString('pt-BR')}.
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

    // Text to Speech if enabled/available
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

  const startListening = () => {
    const w = window as unknown as IWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
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
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Fluxo AI Assistant</span>
              <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full">Gemini 2.5</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 rounded-lg rounded-bl-none shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={20} />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
             {planConfig.features.voiceCommands && (
                <button
                onClick={startListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Falar"
                >
                <Mic size={20} />
                </button>
             )}
             {planConfig.features.voiceCommands && isSpeaking && (
                 <button onClick={toggleSpeech} className="p-2 rounded-full hover:bg-slate-100 text-indigo-600 animate-pulse">
                     <Volume2 size={20} />
                 </button>
             )}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Digite ou fale..."
              className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isProcessing}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
