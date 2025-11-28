import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
    theme: string;
    toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, theme, toggleTheme }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const updateDates = () => {
    const mod = localStorage.getItem('petlife_last_modified');
    const back = localStorage.getItem('petlife_last_backup');

    const formatDate = (iso: string) => {
        const date = new Date(iso);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    if (mod) setLastModified(formatDate(mod));
    if (back) setLastBackup(formatDate(back));
  };

  useEffect(() => {
      updateDates();
      // Listen for updates from DB operations
      window.addEventListener('petlife_data_updated', updateDates);
      return () => window.removeEventListener('petlife_data_updated', updateDates);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0 transition-colors duration-200">
      <header className="bg-teal-600 dark:bg-teal-700 text-white shadow-lg sticky top-0 z-50 transition-colors">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex flex-col">
             <div className="text-xl font-bold flex items-center gap-2">
                🐾 PetLife
             </div>
             <div className="text-[10px] text-teal-100 font-medium leading-tight opacity-90">
                 {lastModified && <span>Modif: {lastModified}</span>}
                 {lastBackup && <span className="block">Backup: {lastBackup}</span>}
                 {!lastModified && !lastBackup && <span>Prontuário Digital</span>}
             </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link 
                to="/settings"
                className="text-teal-100 hover:text-white transition p-1.5 rounded-full hover:bg-teal-500/20"
                aria-label="Configurações"
                title="Configurações e Backup"
            >
                ⚙️
            </Link>
            <button 
                onClick={toggleTheme} 
                className="text-teal-100 hover:text-white transition p-1.5 rounded-full hover:bg-teal-500/20"
                aria-label="Alternar tema"
                title="Alternar Tema"
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {!isHome && (
                <Link to="/" className="text-teal-100 hover:text-white text-sm font-medium ml-2">
                Voltar
                </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav - Only specific links if needed, or simplified since Settings is now up top */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex justify-around p-3 z-40 transition-colors">
        <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <span className="text-2xl">🏠</span>
          <span className="text-xs">Início</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center ${location.pathname === '/settings' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
           <span className="text-2xl">⚙️</span>
           <span className="text-xs">Config</span>
        </Link>
      </nav>
    </div>
  );
};

export default Layout;