
import React, { useMemo } from 'react';
import { Quote } from 'lucide-react';

export const Footer: React.FC = () => {
  const verses = [
    { text: "Mas em todas estas coisas somos mais que vencedores, por aquele que nos amou.", ref: "Romanos 8:37" },
    { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
    { text: "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", ref: "Josué 1:9" },
    { text: "Mil cairão ao teu lado, e dez mil à tua direita, mas tu não serás atingido.", ref: "Salmos 91:7" },
    { text: "No mundo tereis aflições, mas tende bom ânimo, eu venci o mundo.", ref: "João 16:33" },
    { text: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?", ref: "Salmos 27:1" },
    { text: "Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.", ref: "Isaías 40:31" },
    { text: "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar-lhes esperança e um futuro.", ref: "Jeremias 29:11" },
    { text: "Operando eu, quem impedirá?", ref: "Isaías 43:13" },
    { text: "Se Deus é por nós, quem será contra nós?", ref: "Romanos 8:31" }
  ];

  // Seleciona um versículo aleatório apenas na montagem do componente
  const verse = useMemo(() => verses[Math.floor(Math.random() * verses.length)], []);

  return (
    <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center text-center opacity-80 hover:opacity-100 transition-opacity">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full mb-3 text-indigo-400">
        <Quote size={16} />
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-400 italic max-w-2xl text-sm md:text-base leading-relaxed">
        "{verse.text}"
      </p>
      <p className="text-xs mt-2 font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
        {verse.ref}
      </p>
      <div className="mt-6 text-[10px] text-slate-400 dark:text-slate-500">
        FluxoCRM © {new Date().getFullYear()} - Fé e Prosperidade
      </div>
    </footer>
  );
};
