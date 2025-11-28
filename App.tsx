import React, { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import PetForm from './components/PetForm';
import PetDetail from './components/PetDetail';
import PetCard from './components/PetCard';
import { getPets, getAllRecords, exportData, importData, seedDatabase } from './db';
import { Pet, MedicalRecord, RecordType } from './types';
import { generateICS, downloadICS } from './utils/ics';

interface UpcomingEvent extends MedicalRecord {
    petName: string;
    petPhoto?: string;
}

// Home Component
const Home: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPets = useCallback(async () => {
    try {
      await seedDatabase(); // Ensure dummy data if empty
      const petsData = await getPets();
      const recordsData = await getAllRecords();
      
      setPets(petsData.sort((a, b) => b.createdAt - a.createdAt));

      // Filter upcoming events
      const today = new Date().toISOString().split('T')[0];
      const future = recordsData
        .filter(r => r.nextDueDate && r.nextDueDate >= today)
        .map(r => {
            const pet = petsData.find(p => p.id === r.petId);
            return { 
                ...r, 
                petName: pet?.name || 'Pet Removido',
                petPhoto: pet?.photoData
            };
        })
        .sort((a, b) => a.nextDueDate!.localeCompare(b.nextDueDate!)); // Sort by date ascending

      setUpcomingEvents(future);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const handleExportCalendar = () => {
    if (upcomingEvents.length === 0) return;

    const calendarEvents = upcomingEvents.map(evt => ({
        id: evt.id,
        title: `${evt.title} - ${evt.petName}`,
        description: `Lembrete de ${evt.type} para ${evt.petName}. ${evt.description || ''}`,
        startDate: evt.nextDueDate!
    }));

    const icsContent = generateICS(calendarEvents);
    downloadICS('Agenda_PetLife', icsContent);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Meus Pets</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie a saúde dos seus amigos</p>
        </div>
        <Link to="/add-pet" className="bg-teal-600 dark:bg-teal-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 dark:hover:bg-teal-600 transition text-2xl pb-1">
          +
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400"></div>
        </div>
      ) : (
        <>
            {/* Upcoming Schedule Section */}
            {upcomingEvents.length > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            📅 Próximos Eventos
                        </h2>
                        <button 
                            onClick={handleExportCalendar}
                            className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-1"
                            title="Adicionar todos à agenda do celular"
                        >
                            <span>📲</span> Add à Agenda
                        </button>
                    </div>
                    <div className="space-y-2">
                        {upcomingEvents.map(event => (
                            <Link 
                                to={`/pet/${event.petId}`} 
                                key={event.id}
                                className="bg-white dark:bg-slate-800 p-3 rounded-xl border-l-4 border-teal-500 shadow-sm flex items-center gap-3 hover:shadow-md transition group"
                            >
                                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700 w-12 h-12 rounded-lg border border-slate-100 dark:border-slate-600 flex-shrink-0">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        {new Date(event.nextDueDate!).toLocaleDateString(undefined, { month: 'short' }).replace('.', '')}
                                    </span>
                                    <span className="text-lg font-bold text-slate-800 dark:text-white leading-none">
                                        {new Date(event.nextDueDate!).getDate()}
                                    </span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600 transition-colors">
                                        {event.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span className={`px-1.5 py-0.5 rounded-sm font-medium ${
                                            event.type === RecordType.Vaccine ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                            event.type === RecordType.Consultation ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                            {event.type}
                                        </span>
                                        <span>•</span>
                                        <span className="font-medium flex items-center gap-1">
                                            {event.petPhoto && (
                                                <img src={event.petPhoto} alt="" className="w-4 h-4 rounded-full object-cover inline-block" />
                                            )}
                                            {event.petName}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-slate-300 dark:text-slate-600">
                                    👉
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {pets.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="text-5xl mb-4">🐶</div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Nenhum pet cadastrado</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Comece adicionando o prontuário do seu primeiro pet.</p>
                <Link to="/add-pet" className="bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 px-6 py-2 rounded-full font-bold hover:bg-teal-200 dark:hover:bg-teal-800 transition">
                    Adicionar Pet
                </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                {pets.map(pet => (
                    <PetCard key={pet.id} pet={pet} />
                ))}
                </div>
            )}
        </>
      )}
    </div>
  );
};

// Settings Component with Backup/Restore
const Settings: React.FC = () => {
    const [msg, setMsg] = useState("");

    const handleBackup = async () => {
        try {
            const data = await exportData();
            const jsonString = JSON.stringify(data, null, 2);
            
            // Generate Filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0,5);
            const fileName = `PetLife_Backup_${dateStr}_${timeStr}.json`;

            const blob = new Blob([jsonString], { type: "application/json" });
            const file = new File([blob], fileName, { type: "application/json" });

            // Update Last Backup timestamp
            localStorage.setItem('petlife_last_backup', now.toISOString());
            window.dispatchEvent(new Event('petlife_data_updated'));

            // Try native sharing first (Mobile)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'PetLife Backup',
                        text: `Backup do prontuário PetLife gerado em ${dateStr} às ${timeStr}`,
                    });
                    setMsg("Backup compartilhado com sucesso!");
                    return;
                } catch (shareError) {
                    if ((shareError as Error).name !== 'AbortError') {
                        console.error('Share failed', shareError);
                    } else {
                        // User cancelled share
                        return; 
                    }
                }
            }
            
            // Fallback to direct download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setMsg("Backup baixado com sucesso!");
            
        } catch (e) {
            console.error(e);
            setMsg("Erro ao criar backup.");
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                await importData(json);
                setMsg("Dados restaurados com sucesso!");
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                setMsg("Erro: Arquivo de backup inválido.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h2>
             
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Backup & Restauração</h3>
                
                <div className="space-y-4">
                    <button 
                        onClick={handleBackup}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 dark:bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-700 dark:hover:bg-teal-600 transition"
                    >
                        <span>📥</span> Salvar Backup (Exportar)
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Gera um arquivo com todos os dados. Compartilhe no Telegram, Drive, Email ou WhatsApp.
                    </p>

                    <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>

                    <label className="block w-full cursor-pointer">
                        <div className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                            <span>📤</span> Restaurar Backup
                        </div>
                        <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Selecione um arquivo .json gerado anteriormente pelo app.
                    </p>
                </div>

                {msg && (
                    <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-sm text-center font-medium">
                        {msg}
                    </div>
                )}
             </div>

             <div className="text-center text-xs text-slate-400 mt-8">
                 PetLife v1.2.0 • Offline PWA
             </div>
        </div>
    );
};

const App: React.FC = () => {
    // Theme Management
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <HashRouter>
            <Layout theme={theme} toggleTheme={toggleTheme}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/add-pet" element={<PetForm />} />
                    <Route path="/edit-pet/:id" element={<PetForm />} />
                    <Route path="/pet/:id" element={<PetDetail />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </Layout>
        </HashRouter>
    );
};

export default App;