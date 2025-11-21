
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image, Sparkles, Download, AlertCircle, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { StorageService } from '../services/storage';

// Helper interface for local usage to avoid global type conflicts
interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

export const ImageGenerator: React.FC = () => {
  const { user } = useApp();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  
  // Settings
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');

  useEffect(() => {
      checkKey();
  }, [user]);

  const getAIStudio = (): AIStudioClient | undefined => {
    return (window as any).aistudio;
  }

  const getCustomKey = () => {
      if (!user) return '';
      return StorageService.getUserSettings(user.id).googleApiKey || '';
  }

  const checkKey = async () => {
      // Check if custom key exists or AI Studio key is selected
      const custom = getCustomKey();
      if (custom) {
          setHasKey(true);
          return;
      }

      const aiStudio = getAIStudio();
      if (aiStudio) {
          const selected = await aiStudio.hasSelectedApiKey();
          setHasKey(selected);
      }
  };

  const handleSelectKey = async () => {
      const aiStudio = getAIStudio();
      if (aiStudio) {
          await aiStudio.openSelectKey();
          checkKey();
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setError(null);
    setUsedFallback(false);

    const apiKey = getCustomKey() || process.env.API_KEY;

    try {
      // Create instance right before call to ensure key is fresh
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      
      let response;
      try {
        response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
            parts: [{ text: prompt }],
            },
            config: {
            imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: imageSize,
            },
            },
        });
      } catch (e: any) {
        const errStr = JSON.stringify(e);
        const isQuotaError = e.status === 429 || 
                             e.message?.includes('429') || 
                             e.message?.includes('quota') || 
                             e.message?.includes('RESOURCE_EXHAUSTED') ||
                             errStr.includes('RESOURCE_EXHAUSTED');

        if (isQuotaError) {
             console.warn("Pro model quota exceeded, falling back to Flash.");
             setUsedFallback(true);
             response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                  parts: [{ text: prompt }],
                },
                config: {
                  imageConfig: {
                    aspectRatio: aspectRatio,
                    // imageSize is not supported on flash-image
                  },
                },
             });
        } else {
            throw e;
        }
      }

      // Iterate to find image part
      let found = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64 = part.inlineData.data;
          const url = `data:image/png;base64,${base64}`;
          setGeneratedImage(url);
          found = true;
          break;
        }
      }
      if (!found) throw new Error("A API não retornou uma imagem válida.");
      
    } catch (error: any) {
      console.error("Image Generation Error:", error);
      const msg = error.message || JSON.stringify(error);
      setError(`Erro ao gerar imagem: ${msg.slice(0, 100)}... Verifique sua chave API.`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  if (!hasKey && !process.env.API_KEY) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
              <div className="bg-indigo-50 p-6 rounded-full">
                  <Sparkles size={48} className="text-indigo-600" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Gerador de Imagens IA</h2>
                  <p className="text-slate-500 mt-2 max-w-md">
                      Para usar o modelo avançado <strong>Gemini 3 Pro Image Preview</strong>, você precisa conectar sua chave de API nas Configurações.
                  </p>
              </div>
              <div className="flex gap-3">
                <button 
                    onClick={handleSelectKey}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                >
                    Conectar Chave Rápida
                </button>
                <a href="#/settings" className="px-6 py-3 rounded-xl font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
                    Ir para Configurações
                </a>
              </div>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">
                  Saiba mais sobre cobrança e chaves API
              </a>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Image size={24} />
          </div>
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Studio de Criação</h2>
              <p className="text-slate-500 text-sm">Crie imagens ultra-realistas para suas campanhas de marketing.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Prompt Criativo</label>
                  <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Descreva a imagem que você deseja criar com detalhes..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 resize-none focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                  />
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Proporção</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['1:1', '16:9', '9:16'].map(r => (
                                  <button 
                                    key={r}
                                    onClick={() => setAspectRatio(r)}
                                    className={`py-2 text-sm rounded-lg border ${aspectRatio === r ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {r}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Resolução</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['1K', '2K', '4K'].map(s => (
                                  <button 
                                    key={s}
                                    onClick={() => setImageSize(s)}
                                    className={`py-2 text-sm rounded-lg border ${imageSize === s ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {s}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                      {isGenerating ? (
                          <>Generating...</>
                      ) : (
                          <><Sparkles size={18} /> Gerar Imagem</>
                      )}
                  </button>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-xl text-xs text-indigo-800 border border-indigo-100">
                  <strong>Dica Pro:</strong> Descreva a iluminação (ex: cinematic lighting), estilo (ex: photorealistic) e câmera (ex: 85mm lens) para melhores resultados.
              </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2">
              <div className="bg-slate-100 rounded-2xl border border-slate-200 min-h-[500px] flex items-center justify-center relative overflow-hidden group">
                  {error ? (
                      <div className="text-center text-red-500 p-6 max-w-md">
                          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                             <AlertCircle size={32} className="text-red-600" />
                          </div>
                          <p className="font-medium">{error}</p>
                      </div>
                  ) : generatedImage ? (
                      <>
                          <img src={generatedImage} alt="Generated" className="max-w-full max-h-[600px] shadow-2xl rounded-lg" />
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={generatedImage} download={`fluxo-ai-${Date.now()}.png`} className="bg-white text-slate-800 px-4 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2 hover:bg-slate-50">
                                  <Download size={18} /> Download
                              </a>
                          </div>
                          {usedFallback && (
                              <div className="absolute top-4 left-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 shadow-sm flex items-center gap-1">
                                  <Zap size={12} /> Modelo Flash (Cota Pro excedida)
                              </div>
                          )}
                      </>
                  ) : (
                      <div className="text-center text-slate-400">
                          {isGenerating ? (
                              <div className="animate-pulse flex flex-col items-center">
                                  <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
                                  <p>Criando sua obra de arte...</p>
                              </div>
                          ) : (
                              <>
                                <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <Image size={32} className="opacity-50" />
                                </div>
                                <p>Sua imagem aparecerá aqui</p>
                              </>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
