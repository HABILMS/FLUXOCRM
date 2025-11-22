
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        if (isSignUp) {
            // 1. Criar usuário no Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (signUpError) throw signUpError;

            // 2. Criar perfil na tabela pública (Manual fallback se não houver Trigger no banco)
            if (data.user) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    name: name,
                    email: email,
                    role: 'USER',
                    plan: 'BASIC',
                    is_active: true
                });

                // Ignoramos erro de duplicidade caso já exista um trigger no banco fazendo isso
                if (profileError && !profileError.message.includes('duplicate')) {
                    console.error("Erro ao criar perfil:", profileError);
                }
            }

            alert("Conta criada com sucesso! \n\nIMPORTANTE: Se o login falhar, verifique seu email para confirmar a conta.");
            setIsSignUp(false);
        } else {
            const success = await login(email, password);
            if (success) {
                navigate('/dashboard');
            } else {
                // Se chegou aqui e não lançou erro, é um fallback genérico
                setError('Não foi possível entrar. Verifique suas credenciais.');
            }
        }
    } catch (err: any) {
        console.error("Login Error Full:", err);
        
        let msg = err.message || "Erro desconhecido";
        
        // Tradução de erros comuns do Supabase
        if (msg.toLowerCase().includes("email not confirmed")) {
            msg = "Seu email ainda não foi confirmado. O Supabase enviou um link para sua caixa de entrada (verifique o Spam).";
        } else if (msg.includes("Invalid login credentials")) {
            msg = "Email ou senha incorretos.";
        } else if (msg.includes("Failed to fetch")) {
            msg = "Falha na conexão. Verifique sua internet.";
        } else if (msg.includes("already registered")) {
            msg = "Este email já está cadastrado.";
        }
        
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">FluxoCRM</h1>
          <p className="text-slate-500 mt-2">{isSignUp ? 'Crie sua conta gratuita' : 'Faça login para continuar'}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                placeholder="Seu nome completo"
                required
                />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
              placeholder="******"
              required
            />
          </div>
          
          {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center font-medium">
                  {error}
              </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200"
          >
            {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
                {isSignUp ? 'Já tem uma conta? Fazer Login' : 'Não tem conta? Cadastre-se Grátis'}
            </button>
        </div>
      </div>
    </div>
  );
};
