import React, { useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import { Exercise, MuscleGroup, WorkoutTemplate, PlannedExercise, WorkoutSession, SetLog, ExerciseLog, UserSettings, Equipment, PR } from './types';
import { INITIAL_EXERCISES } from './constants';
import { 
    HomeIcon, CalendarIcon, ChartBarIcon, DumbbellIcon, PlusCircleIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon, 
    TrashIcon, PencilIcon, StarIcon, LinkIcon, BackIcon, FilterIcon, ArchiveIcon, CloseIcon, RestoreIcon, PlayIcon,
    ChestIcon, MuscleBackIcon, LegsIcon, ShouldersIcon, ArmsIcon, CoreIcon
} from './components/Icons';
import Stopwatch, { formatTime, StopwatchHandle } from './components/Stopwatch';
import ProgressChart from './components/ProgressChart';

type Page = 'HOME' | 'PLANNER' | 'HISTORY' | 'EXERCISES';

// --- DATA HOOK (LocalStorage) ---
function usePersistentState<T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error("Erreur de lecture du localStorage", error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Erreur d'écriture dans le localStorage", error);
    }
  }, [key, state]);

  return [state, setState];
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('HOME');
  
  const [settings, setSettings] = usePersistentState<UserSettings>('user_settings', { name: 'Matthias', favoriteExerciseIds: ['ex1', 'ex2', 'ex3', 'ex4'] });
  const [exercises, setExercises] = usePersistentState<Exercise[]>('exercises', INITIAL_EXERCISES);
  const [templates, setTemplates] = usePersistentState<WorkoutTemplate[]>('workout_templates', []);
  const [history, setHistory] = usePersistentState<WorkoutSession[]>('workout_history', []);
  
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | { name: string, exercises: PlannedExercise[] } | null>(null);
  
  const getExerciseById = useCallback((id: string): Exercise | undefined => exercises.find(ex => ex.id === id), [exercises]);
  
  const nonArchivedExercises = useMemo(() => exercises.filter(ex => !ex.isArchived), [exercises]);

  const getExercisePR = useCallback((exerciseId: string): PR | undefined => {
    let bestPR: PR = { weight: 0, reps: 0 };
    let found = false;

    history.forEach(session => {
      session.exercises.forEach(log => {
        if (log.exerciseId === exerciseId) {
          log.sets.forEach(set => {
            if (set.weight > bestPR.weight) {
              bestPR = { weight: set.weight, reps: set.reps };
              found = true;
            }
          });
        }
      });
    });
    return found ? bestPR : undefined;
  }, [history]);

  const handleFinishWorkout = (duration: number, logs: ExerciseLog[]) => {
    if (!activeWorkout) return;
    
    const totalVolume = logs.reduce((totalVol, log) => {
      const exerciseVol = log.sets.reduce((vol, set) => vol + (set.reps * set.weight), 0);
      return totalVol + exerciseVol;
    }, 0);
    
    const performedExercises = logs.filter(log => log.sets.length > 0);

    if(performedExercises.length === 0) {
      setActiveWorkout(null);
      return;
    }

    const newSession: WorkoutSession = {
      id: `session_${Date.now()}`,
      name: activeWorkout.name,
      date: Date.now(),
      duration: duration,
      exercises: performedExercises,
      totalVolume,
    };
    setHistory(prev => [...prev, newSession]);
    setActiveWorkout(null);
    setCurrentPage('HISTORY');
  };
  
  const favoriteExercises = useMemo(() => {
     return settings.favoriteExerciseIds
        .map(id => getExerciseById(id))
        .filter((ex): ex is Exercise => ex !== undefined && !ex.isArchived);
  }, [settings.favoriteExerciseIds, getExerciseById]);

  const renderPage = () => {
    switch (currentPage) {
      case 'HOME':
        return <HomeScreen 
          settings={settings}
          setSettings={setSettings}
          exercises={favoriteExercises}
          allExercises={nonArchivedExercises}
          getPR={getExercisePR} 
          onStartWorkout={(template) => setActiveWorkout(template)} 
          onStartFreestyle={() => setActiveWorkout({name: 'Séance Libre', exercises: []})}
          templates={templates} 
          setCurrentPage={setCurrentPage}
        />;
      case 'PLANNER':
        return <PlannerScreen templates={templates} setTemplates={setTemplates} exercises={nonArchivedExercises} />;
      case 'HISTORY':
        return <HistoryScreen history={history} setHistory={setHistory} getExerciseById={getExerciseById} allExercises={nonArchivedExercises} />;
      case 'EXERCISES':
        return <ExercisesScreen 
          exercises={exercises} 
          setExercises={setExercises} 
          settings={settings}
          setSettings={setSettings}
          history={history}
          />;
      default:
        return <HomeScreen
            settings={settings}
            setSettings={setSettings}
            exercises={favoriteExercises} 
            allExercises={nonArchivedExercises}
            getPR={getExercisePR} 
            onStartWorkout={(template) => setActiveWorkout(template)} 
            onStartFreestyle={() => setActiveWorkout({name: 'Séance Libre', exercises: []})}
            templates={templates} 
            setCurrentPage={setCurrentPage}
          />;
    }
  };

  if (activeWorkout) {
    const isFreestyle = !('id' in activeWorkout);
    return <WorkoutScreen 
      key={'id' in activeWorkout ? activeWorkout.id : 'freestyle'}
      workout={activeWorkout} 
      onFinish={handleFinishWorkout} 
      isFreestyle={isFreestyle}
      allExercises={nonArchivedExercises}
      getExerciseById={getExerciseById}
      onExit={() => setActiveWorkout(null)}
      />;
  }

  return (
    <div className="h-screen bg-background flex flex-col font-sans">
      <main className="flex-grow flex-shrink min-h-0 pb-20">
        {renderPage()}
      </main>
      <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
}

// --- Reusable Components ---

const Header: React.FC<{title: string; children?: React.ReactNode}> = ({ title, children }) => (
    <header className="flex-shrink-0 sticky top-0 bg-background z-20 p-4 shadow-md">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        <div className="flex items-center space-x-2">{children}</div>
      </div>
    </header>
)

const Modal: React.FC<{ children: ReactNode, onClose: () => void, title: string, footer?: ReactNode }> = ({ children, onClose, title, footer }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4"
        onClick={onClose}
    >
        <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-surface rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col" 
            onClick={(e) => e.stopPropagation()}
        >
            <header className="flex justify-between items-center p-4 border-b border-surface">
                <h2 className="text-xl font-bold">{title}</h2>
                <button onClick={onClose}><CloseIcon /></button>
            </header>
            <div className="p-4 overflow-y-auto flex-grow no-scrollbar">
                {children}
            </div>
            {footer && <div className="p-2 text-center text-xs text-gray-500">{footer}</div>}
        </motion.div>
    </motion.div>
);

const MuscleGroupIcon: React.FC<{ muscleGroup: MuscleGroup, className?: string }> = ({ muscleGroup, className = 'w-10 h-10' }) => {
    switch (muscleGroup) {
        case MuscleGroup.CHEST: return <ChestIcon className={className} />;
        case MuscleGroup.BACK: return <MuscleBackIcon className={className} />;
        case MuscleGroup.LEGS: return <LegsIcon className={className} />;
        case MuscleGroup.SHOULDERS: return <ShouldersIcon className={className} />;
        case MuscleGroup.ARMS: return <ArmsIcon className={className} />;
        case MuscleGroup.CORE: return <CoreIcon className={className} />;
        default: return <DumbbellIcon className={className} />;
    }
};

const SwipeableListItem: React.FC<{
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ children, onEdit, onDelete }) => {
  const controls = useAnimation();

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 250;
    
    if (info.offset.x < -swipeThreshold && onDelete) {
      onDelete();
    } else if (info.offset.x > swipeThreshold && onEdit) {
      onEdit();
    }

    controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
  };
  
  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <div className="absolute top-0 left-0 h-full flex items-center z-0">
        {onEdit && <div className="bg-blue-600 h-full w-24 flex items-center justify-center text-white"><PencilIcon /></div>}
      </div>
       <div className="absolute top-0 right-0 h-full flex items-center z-0">
        {onDelete && <div className="bg-red-600 h-full w-24 flex items-center justify-center text-white"><TrashIcon /></div>}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        className="relative bg-surface z-10 rounded-lg"
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        {children}
      </motion.div>
    </div>
  );
};


// --- Screen Components ---

// HomeScreen
const HomeScreen: React.FC<{
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  exercises: Exercise[];
  allExercises: Exercise[];
  getPR: (id: string) => PR | undefined;
  templates: WorkoutTemplate[];
  onStartWorkout: (template: WorkoutTemplate) => void;
  onStartFreestyle: () => void;
  setCurrentPage: (page: Page) => void;
}> = ({ settings, setSettings, exercises, allExercises, getPR, templates, onStartWorkout, onStartFreestyle, setCurrentPage }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templates.length > 0 ? templates[0].id : null);
  const [isFavModalOpen, setFavModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const addFavorite = (exerciseId: string) => {
    if (settings.favoriteExerciseIds.length < 4 && !settings.favoriteExerciseIds.includes(exerciseId)) {
        setSettings(s => ({ ...s, favoriteExerciseIds: [...s.favoriteExerciseIds, exerciseId] }));
    }
    setFavModalOpen(false);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h1 className="text-3xl font-bold text-text-primary">Bonjour {settings.name}!</h1>
          <button onClick={() => setSettingsModalOpen(true)} className="text-text-secondary p-2">
              <SettingsIcon />
          </button>
      </div>
      
      <div className="bg-surface p-4 rounded-lg shadow-lg mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold mb-3 text-text-secondary">Démarrer une séance</h2>
        {templates.length > 0 && (
          <div className="space-y-3">
             <select 
               value={selectedTemplate ?? ''}
               onChange={(e) => setSelectedTemplate(e.target.value)}
               className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"
             >
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
             <button
               onClick={() => {
                 const template = templates.find(t => t.id === selectedTemplate);
                 if (template) onStartWorkout(template);
               }}
               className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center text-lg"
             >
               Démarrer le Programme
             </button>
          </div>
        )}
         <button
           onClick={onStartFreestyle}
           className={`w-full ${templates.length > 0 ? 'mt-3' : ''} bg-secondary hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center text-lg`}
         >
           Séance Libre
         </button>
      </div>

      <div className="flex-grow min-h-0">
        <h2 className="text-xl font-semibold mb-3 text-text-primary">Exercices favoris</h2>
        <div className="grid grid-cols-2 gap-4">
          {exercises.map(ex => {
            const pr = getPR(ex.id);
            return (
                <div key={ex.id} className="bg-surface rounded-lg shadow-md p-3 flex flex-col items-center justify-center text-center">
                    <MuscleGroupIcon muscleGroup={ex.muscleGroup} className="w-10 h-10 mb-2 text-primary" />
                    <h3 className="font-bold text-md text-text-primary leading-tight">{ex.name}</h3>
                    {pr && <p className="text-text-secondary text-sm mt-1">{pr.weight} kg x {pr.reps}</p>}
                </div>
            )
          })}
          {Array(4 - exercises.length).fill(0).map((_, i) => (
             <button key={i} onClick={() => setFavModalOpen(true)} className="bg-surface/50 rounded-lg shadow-md p-3 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-600 hover:bg-surface/80">
                <PlusCircleIcon className="w-8 h-8 text-gray-500 mb-2"/>
                <p className="text-text-secondary text-sm">Ajouter un favori</p>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {isSettingsModalOpen && (
            <Modal 
                title="Paramètres" 
                onClose={() => setSettingsModalOpen(false)}
                footer={<p>From Patate Corp</p>}
            >
                <label className="block">
                    <span className="text-text-secondary">Votre prénom</span>
                    <input 
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({...settings, name: e.target.value})}
                      className="mt-1 block w-full bg-background rounded-md border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3"
                      placeholder="Entrez votre prénom"
                    />
                </label>
            </Modal>
        )}
        {isFavModalOpen && (
            <Modal title="Choisir un favori" onClose={() => setFavModalOpen(false)}>
                <div className="space-y-2">
                    {allExercises.filter(ex => !settings.favoriteExerciseIds.includes(ex.id))
                        .map(ex => (
                            <button key={ex.id} onClick={() => addFavorite(ex.id)} className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center space-x-3">
                                <MuscleGroupIcon muscleGroup={ex.muscleGroup} className="w-6 h-6 text-text-secondary"/>
                                <span>{ex.name}</span>
                            </button>
                        ))
                    }
                </div>
            </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};


// PlannerScreen
const PlannerScreen: React.FC<{
  templates: WorkoutTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<WorkoutTemplate[]>>;
  exercises: Exercise[];
}> = ({ templates, setTemplates, exercises }) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);

  const handleSaveTemplate = (template: WorkoutTemplate) => {
    if (templates.find(t => t.id === template.id)) {
      setTemplates(templates.map(t => t.id === template.id ? template : t));
    } else {
      setTemplates([...templates, template]);
    }
    setEditingTemplate(null);
  };
  
  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  }

  if (editingTemplate) {
    return <TemplateEditor 
              template={editingTemplate} 
              onSave={handleSaveTemplate} 
              onCancel={() => setEditingTemplate(null)}
              allExercises={exercises} 
            />;
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Planificateur">
        <button
          onClick={() => {
              if (templates.length < 10) {
                 setEditingTemplate({ id: `template_${Date.now()}`, name: 'Nouveau Programme', exercises: [] });
              }
            }
          }
          disabled={templates.length >= 10}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors disabled:bg-gray-500"
        >
          <PlusCircleIcon className="w-5 h-5 mr-2" /> Ajouter
        </button>
      </Header>
      <div className="p-4 space-y-3 overflow-y-auto flex-grow no-scrollbar">
      {templates.length === 0 && <p className="text-text-secondary text-center mt-8">Créez votre premier programme d'entraînement.</p>}
        {templates.map(template => (
          <SwipeableListItem
            key={template.id}
            onEdit={() => setEditingTemplate(template)}
            onDelete={() => handleDelete(template.id)}
          >
            <div className="p-4 flex justify-between items-center bg-surface">
              <div>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-sm text-text-secondary">{template.exercises.length} exercices</p>
              </div>
            </div>
          </SwipeableListItem>
        ))}
      </div>
    </div>
  );
};


// TemplateEditor
const TemplateEditor: React.FC<{
    template: WorkoutTemplate;
    onSave: (template: WorkoutTemplate) => void;
    onCancel: () => void;
    allExercises: Exercise[];
}> = ({ template, onSave, onCancel, allExercises }) => {
    const [currentTemplate, setCurrentTemplate] = useState<WorkoutTemplate>(template);
    const [isAddExoModalOpen, setAddExoModalOpen] = useState(false);

    const addExercise = (exerciseId: string) => {
        const newExercise: PlannedExercise = { exerciseId, sets: 3, reps: '8-12', isSuperset: false };
        setCurrentTemplate({ ...currentTemplate, exercises: [...currentTemplate.exercises, newExercise]});
        setAddExoModalOpen(false);
    };
    
    const handleUpdateExercise = (index: number, field: keyof PlannedExercise, value: any) => {
        const newExercises = [...currentTemplate.exercises];
        (newExercises[index] as any)[field] = value;
        setCurrentTemplate({ ...currentTemplate, exercises: newExercises });
    };

    const handleRemoveExercise = (index: number) => {
      const newExercises = currentTemplate.exercises.filter((_, i) => i !== index);
      setCurrentTemplate({ ...currentTemplate, exercises: newExercises });
    }

    const exercisesByGroup = useMemo(() => {
        return allExercises.reduce((acc, ex) => {
            if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
            acc[ex.muscleGroup].push(ex);
            return acc;
        }, {} as Record<MuscleGroup, Exercise[]>);
    }, [allExercises]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-background z-20 p-4 border-b border-surface">
              <input 
                  type="text" 
                  value={currentTemplate.name}
                  onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                  placeholder="Nom du programme"
                  className="text-2xl font-bold bg-transparent focus:border-primary w-full outline-none text-white p-2 border-b-2 border-gray-700 focus:border-primary transition-colors"
              />
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-grow no-scrollbar">
            
            {currentTemplate.exercises.map((plannedEx, index) => {
                const ex = allExercises.find(e => e.id === plannedEx.exerciseId);
                const isSupersetWithPrev = index > 0 && currentTemplate.exercises[index - 1].isSuperset;
                const uniqueKey = `${plannedEx.exerciseId}-${index}`;

                return (
                    <div key={uniqueKey} className={`transition-all duration-300 ${isSupersetWithPrev ? 'ml-4' : ''}`}>
                      <SwipeableListItem
                        onDelete={() => handleRemoveExercise(index)}
                      >
                        <div className="bg-surface p-3">
                            <div className="font-semibold mb-2">{ex?.name || 'Exercice Inconnu'}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center bg-gray-700 rounded-md px-2">
                                    <span className="text-text-secondary font-bold text-lg">S</span>
                                    <input type="number" value={plannedEx.sets} onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value))} className="w-full bg-transparent p-2 text-white text-center outline-none" placeholder="Séries" />
                                </div>
                                <div className="flex items-center bg-gray-700 rounded-md px-2">
                                    <span className="text-text-secondary font-bold">R</span>
                                    <input type="text" value={plannedEx.reps} onChange={(e) => handleUpdateExercise(index, 'reps', e.target.value)} className="w-full bg-transparent p-2 text-white text-center outline-none" placeholder="Reps" />
                                </div>
                            </div>
                            <div className="mt-2">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="checkbox" checked={plannedEx.isSuperset} onChange={(e) => handleUpdateExercise(index, 'isSuperset', e.target.checked)} className="form-checkbox h-5 w-5 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"/>
                                  <LinkIcon className="w-5 h-5 text-text-secondary"/>
                                  <span className="text-text-secondary text-sm">Superset avec le suivant</span>
                              </label>
                            </div>
                        </div>
                      </SwipeableListItem>
                    </div>
                );
            })}
            
            <button onClick={() => setAddExoModalOpen(true)} className="w-full text-primary border-2 border-primary rounded-lg py-2 mt-2">Ajouter un exercice</button>
            </div>
            
            <div className="flex-shrink-0 bg-background z-20 p-4 border-t border-surface">
              <div className="flex space-x-2">
                  <button onClick={() => onSave(currentTemplate)} className="flex-1 bg-primary text-white py-3 rounded-lg">Enregistrer</button>
                  <button onClick={onCancel} className="flex-1 bg-surface text-white py-3 rounded-lg">Annuler</button>
              </div>
            </div>
            <AnimatePresence>
            {isAddExoModalOpen && (
                <Modal title="Ajouter un Exercice" onClose={() => setAddExoModalOpen(false)}>
                    {Object.entries(exercisesByGroup).map(([group, exs]) => (
                        <div key={group}>
                            <h3 className="font-bold text-lg text-primary mt-3 mb-1">{group}</h3>
                            {exs.map(ex => (
                                <button key={ex.id} onClick={() => addExercise(ex.id)} className="w-full text-left p-3 my-1 bg-background hover:bg-primary/20 border-b border-gray-700 rounded-lg transition-colors">
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    ))}
                </Modal>
            )}
            </AnimatePresence>
        </div>
    );
};


// HistoryScreen
const HistoryScreen: React.FC<{
  history: WorkoutSession[];
  setHistory: React.Dispatch<React.SetStateAction<WorkoutSession[]>>;
  getExerciseById: (id: string) => Exercise | undefined;
  allExercises: Exercise[];
}> = ({ history, setHistory, getExerciseById, allExercises }) => {
    const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
    const [isFilterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState<{ exerciseId?: string; date?: number }>({});
    
    const handleDelete = (id: string) => {
        setHistory(history.filter(s => s.id !== id));
    }
    
    const filteredHistory = useMemo(() => {
        let sorted = [...history].reverse();
        if (filter.exerciseId) {
            sorted = sorted.filter(s => s.exercises.some(e => e.exerciseId === filter.exerciseId));
        }
        if (filter.date) {
            const filterDayStart = new Date(filter.date);
            filterDayStart.setHours(0,0,0,0);
            const filterDayEnd = new Date(filter.date);
            filterDayEnd.setHours(23,59,59,999);
            sorted = sorted.filter(s => s.date >= filterDayStart.getTime() && s.date <= filterDayEnd.getTime());
        }
        return sorted;
    }, [history, filter]);
    
    const isFilterActive = Object.keys(filter).length > 0;
    
    return (
    <div className="flex flex-col h-full">
        <Header title="Historique">
            {isFilterActive && <button onClick={() => setFilter({})} className="text-sm bg-red-500/50 text-white py-1 px-2 rounded-md">Effacer</button>}
            <button onClick={() => setFilterOpen(true)}><FilterIcon/></button>
        </Header>
        <div className="p-4 space-y-3 overflow-y-auto flex-grow no-scrollbar">
            {filteredHistory.length === 0 && <p className="text-text-secondary text-center mt-8">{isFilterActive ? "Aucun résultat pour ce filtre." : "Aucune séance terminée pour le moment."}</p>}
            {filteredHistory.map(session => (
              <SwipeableListItem
                key={session.id}
                onDelete={() => handleDelete(session.id)}
              >
                <div className="p-4 bg-surface" onClick={() => setSelectedSession(session)}>
                    <h3 className="font-bold text-lg text-text-primary">{session.name}</h3>
                    <p className="text-sm text-text-secondary">{new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="flex space-x-4 text-sm text-text-secondary mt-1">
                      <span>Durée: {formatTime(session.duration)}</span>
                      <span>Volume: {session.totalVolume} kg</span>
                    </div>
                </div>
              </SwipeableListItem>
            ))}
        </div>

        <AnimatePresence>
            {selectedSession && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background z-40 flex flex-col"
                >
                    <Header title={selectedSession.name}>
                        <button onClick={() => setSelectedSession(null)}><BackIcon /></button>
                    </Header>
                    <div className="p-4 space-y-4 overflow-y-auto flex-grow no-scrollbar">
                        {selectedSession.exercises.map((log, index) => {
                            const exercise = getExerciseById(log.exerciseId);
                            const progressData = history
                                .map(s => {
                                    const exLog = s.exercises.find(e => e.exerciseId === log.exerciseId);
                                    if (!exLog) return null;
                                    const maxWeight = Math.max(...exLog.sets.map(set => set.weight), 0);
                                    return { date: s.date, maxWeight };
                                })
                                .filter(d => d !== null)
                                .sort((a, b) => a!.date - b!.date);

                            return (
                                <div key={index} className="bg-surface p-3 rounded-lg">
                                    <h4 className="font-semibold text-primary text-lg">{exercise?.name}</h4>
                                    <div className="flex flex-wrap text-text-secondary text-sm mt-2">
                                        {log.sets.map((set, i) => (
                                          <div key={i} className="w-1/4 p-1 text-center">
                                            <span className="font-mono">{set.reps}x{set.weight}kg</span>
                                          </div>
                                        ))}
                                    </div>
                                    <div className="mt-2">
                                      <ProgressChart data={progressData as any} dataKey="maxWeight" title="" height={Math.round(window.innerHeight / 5)} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}
            {isFilterOpen && (
                <Modal title="Filtrer l'historique" onClose={() => setFilterOpen(false)}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Par exercice</label>
                            <select 
                                value={filter.exerciseId || ''}
                                onChange={(e) => setFilter(f => ({ ...f, exerciseId: e.target.value || undefined }))}
                                className="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-2"
                            >
                                <option value="">Tous les exercices</option>
                                {allExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Par date</label>
                            <input 
                                type="date"
                                onChange={(e) => setFilter(f => ({...f, date: e.target.valueAsNumber ? e.target.valueAsNumber + new Date().getTimezoneOffset() * 60000 : undefined }))}
                                className="mt-1 block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm p-2"
                            />
                        </div>
                        <button onClick={() => setFilterOpen(false)} className="w-full bg-primary text-white py-2 rounded-lg">Appliquer</button>
                    </div>
                </Modal>
            )}
        </AnimatePresence>
    </div>
  );
};


// ExercisesScreen
const ExercisesScreen: React.FC<{
    exercises: Exercise[];
    setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
    history: WorkoutSession[];
}> = ({ exercises, setExercises, settings, setSettings, history }) => {
    const [editingExercise, setEditingExercise] = useState<Partial<Exercise> | null>(null);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Exercise | null>(null);
    const [isArchiveOpen, setArchiveOpen] = useState(false);

    const toggleFavorite = (id: string) => {
      setSettings(s => {
        const isFav = s.favoriteExerciseIds.includes(id);
        if (isFav) {
          return { ...s, favoriteExerciseIds: s.favoriteExerciseIds.filter(favId => favId !== id) };
        }
        if (s.favoriteExerciseIds.length < 4) {
          return { ...s, favoriteExerciseIds: [...s.favoriteExerciseIds, id] };
        }
        return s; // Limit reached
      });
    };

    const saveExercise = (exerciseToSave: Partial<Exercise>) => {
      if (exerciseToSave.id) { // Editing
        setExercises(exs => exs.map(ex => ex.id === exerciseToSave.id ? { ...ex, ...exerciseToSave } as Exercise : ex));
      } else { // Creating
        const newExercise: Exercise = {
          id: `ex_custom_${Date.now()}`, isCustom: true, ...exerciseToSave
        } as Exercise;
        setExercises(exs => [...exs, newExercise]);
      }
      setEditingExercise(null);
    };
    
    const archiveExercise = (id: string) => {
      setExercises(exs => exs.map(ex => ex.id === id ? { ...ex, isArchived: true } : ex));
    };

    const restoreExercise = (id: string) => {
      setExercises(exs => exs.map(ex => ex.id === id ? { ...ex, isArchived: false } : ex));
    };

    const exerciseProgress = useMemo(() => {
        if (!viewingHistoryFor) return [];
        const progress: { date: number; maxWeight: number; totalVolume: number }[] = [];
        history.forEach(session => {
            session.exercises.forEach(log => {
                if (log.exerciseId === viewingHistoryFor.id) {
                    let maxWeight = 0, exerciseVolume = 0;
                    log.sets.forEach(set => {
                        if (set.weight > maxWeight) maxWeight = set.weight;
                        exerciseVolume += set.reps * set.weight;
                    });
                    progress.push({ date: session.date, maxWeight, totalVolume: exerciseVolume });
                }
            });
        });
        return progress.sort((a, b) => a.date - b.date);
    }, [history, viewingHistoryFor]);
    
    const exercisesByGroup = useMemo(() => {
        return exercises.filter(e => !e.isArchived).reduce((acc, ex) => {
            if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
            acc[ex.muscleGroup].push(ex);
            return acc;
        }, {} as Record<MuscleGroup, Exercise[]>);
    }, [exercises]);
    
    const archivedExercises = useMemo(() => exercises.filter(e => e.isArchived), [exercises]);

    return (
        <div className="flex flex-col h-full">
            <Header title="Exercices">
                <button onClick={() => setArchiveOpen(true)}><ArchiveIcon /></button>
                <button
                    onClick={() => setEditingExercise({ name: '', muscleGroup: MuscleGroup.CHEST, equipment: 'Barre' })}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2" /> Ajouter
                </button>
            </Header>
            <div className="overflow-y-auto flex-grow no-scrollbar">
                {Object.entries(exercisesByGroup).map(([group, exs]) => (
                    <div key={group}>
                        <h2 className="text-xl font-semibold p-4 pb-2 sticky top-0 bg-background z-10">{group}</h2>
                        <div className="space-y-2 px-4 pb-4">
                            {exs.map(ex => (
                                <SwipeableListItem
                                key={ex.id}
                                onEdit={ex.isCustom ? () => setEditingExercise(ex) : undefined}
                                onDelete={ex.isCustom ? () => archiveExercise(ex.id) : undefined}
                                >
                                <div className="p-3 flex items-center justify-between bg-surface" onClick={() => setViewingHistoryFor(ex)}>
                                    <div className="flex items-center space-x-3">
                                        <MuscleGroupIcon muscleGroup={ex.muscleGroup} className="w-8 h-8 text-primary"/>
                                        <span className="font-semibold">{ex.name}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ex.id); }} className={`${settings.favoriteExerciseIds.includes(ex.id) ? 'text-yellow-400' : 'text-gray-600'}`}>
                                        <StarIcon filled={settings.favoriteExerciseIds.includes(ex.id)} />
                                    </button>
                                </div>
                                </SwipeableListItem>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            <AnimatePresence>
            {(editingExercise) && (
                 <Modal title={editingExercise.id ? 'Modifier' : 'Créer'} onClose={() => setEditingExercise(null)}>
                    <div className="space-y-4">
                        <input type="text" placeholder="Nom de l'exercice" value={editingExercise.name || ''} onChange={(e) => setEditingExercise({...editingExercise, name: e.target.value})} className="w-full bg-gray-800 p-2 rounded-md text-white" />
                        <select value={editingExercise.muscleGroup} onChange={(e) => setEditingExercise({...editingExercise, muscleGroup: e.target.value as MuscleGroup})} className="w-full bg-gray-800 p-2 rounded-md text-white">
                            {Object.values(MuscleGroup).map(mg => <option key={mg} value={mg}>{mg}</option>)}
                        </select>
                        <select value={editingExercise.equipment} onChange={(e) => setEditingExercise({...editingExercise, equipment: e.target.value as Equipment})} className="w-full bg-gray-800 p-2 rounded-md text-white">
                           {(['Barre', 'Haltère', 'Machine'] as Equipment[]).map(eq => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        <div className="flex space-x-2 pt-2">
                           <button onClick={() => saveExercise(editingExercise)} className="flex-1 bg-primary text-white py-3 rounded-lg">Enregistrer</button>
                           <button onClick={() => setEditingExercise(null)} className="flex-1 bg-gray-600 text-white py-3 rounded-lg">Annuler</button>
                        </div>
                    </div>
                 </Modal>
            )}
            {viewingHistoryFor && (
                 <Modal title={viewingHistoryFor.name} onClose={() => setViewingHistoryFor(null)}>
                    <div className="space-y-4">
                        <ProgressChart data={exerciseProgress} dataKey="maxWeight" title="Progression de la Charge (kg)" height={200} />
                        <ProgressChart data={exerciseProgress} dataKey="totalVolume" title="Progression du Volume (kg)" height={200} />
                    </div>
                </Modal>
            )}
             {isArchiveOpen && (
                 <Modal title="Exercices Archivés" onClose={() => setArchiveOpen(null)}>
                    <div className="space-y-2">
                        {archivedExercises.length === 0 && <p className="text-text-secondary">Aucun exercice archivé.</p>}
                        {archivedExercises.map(ex => (
                            <div key={ex.id} className="flex justify-between items-center p-2 bg-gray-800 rounded-lg">
                                <span>{ex.name}</span>
                                <button onClick={() => restoreExercise(ex.id)} className="flex items-center space-x-1 text-secondary">
                                    <RestoreIcon className="w-5 h-5"/> <span>Restaurer</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
            </AnimatePresence>
        </div>
    );
};


// WorkoutScreen
const WorkoutScreen: React.FC<{
  workout: WorkoutTemplate | { name: string, exercises: PlannedExercise[] };
  onFinish: (duration: number, logs: ExerciseLog[]) => void;
  isFreestyle: boolean;
  allExercises: Exercise[];
  getExerciseById: (id: string) => Exercise | undefined;
  onExit: () => void;
}> = ({ workout, onFinish, isFreestyle, allExercises, getExerciseById, onExit }) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [liveWorkout, setLiveWorkout] = useState(workout);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => liveWorkout.exercises.map(ex => ({ exerciseId: ex.exerciseId, sets: [] })));
  const stopwatchRef = useRef<StopwatchHandle>(null);

  const currentPlannedExercise = liveWorkout.exercises[currentExerciseIndex];

  useEffect(() => {
    setLogs(currentLiveLogs => liveWorkout.exercises.map(plannedEx => 
        currentLiveLogs.find(l => l.exerciseId === plannedEx.exerciseId) || { exerciseId: plannedEx.exerciseId, sets: [] }
    ));
  }, [liveWorkout.exercises]);
  
  const currentLog = logs.find(l => l.exerciseId === currentPlannedExercise?.exerciseId);

  const updateLogs = (newSets: SetLog[]) => {
    setLogs(prevLogs => prevLogs.map(log => 
        log.exerciseId === currentLog?.exerciseId ? { ...log, sets: newSets } : log
    ));
  };
  
  const addSet = (isDropset = false) => {
    if (!currentLog) return;
    const lastSet = currentLog.sets[currentLog.sets.length - 1] || { reps: 8, weight: 20 };
    const newSets = [...currentLog.sets, { ...lastSet, isDropset }];
    updateLogs(newSets);
  };
  
  const handleSetChange = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    if (!currentLog) return;
    const newSets = [...currentLog.sets];
    newSets[setIndex][field] = value;
    updateLogs(newSets);
  };

  const addFreestyleExercise = (exerciseId: string) => {
    const newPlannedExercise: PlannedExercise = { exerciseId, sets: 3, reps: "8-12", isSuperset: false };
    setLiveWorkout(w => ({ ...w, exercises: [...w.exercises, newPlannedExercise] }));
    if(liveWorkout.exercises.length === 0) setCurrentExerciseIndex(0);
  };
  
  const finishWorkout = () => {
    const duration = stopwatchRef.current?.getTime() ?? 0;
    onFinish(duration, logs);
  }

  const changeFreestyleExercise = () => {
    const placeholderExercise: PlannedExercise = { exerciseId: 'placeholder', sets: 0, reps: '', isSuperset: false };
    setLiveWorkout(w => ({...w, exercises: [...w.exercises, placeholderExercise]}));
    setCurrentExerciseIndex(w => w + 1);
  }

  if ((!currentPlannedExercise || currentPlannedExercise.exerciseId === 'placeholder') && isFreestyle) {
      return (
        <div className="h-screen flex flex-col">
            <Stopwatch ref={stopwatchRef} onFinish={finishWorkout} />
            <div className="p-4 flex-grow overflow-y-auto no-scrollbar">
                <h2 className="text-2xl font-bold text-center mb-4">Choisir un exercice</h2>
                <div className="space-y-2">
                    {allExercises.map(ex => (
                        <button key={ex.id} onClick={() => {
                           const newExercises = [...liveWorkout.exercises];
                           newExercises[currentExerciseIndex] = { exerciseId: ex.id, sets: 3, reps: '8-12', isSuperset: false };
                           setLiveWorkout(w => ({...w, exercises: newExercises}));
                        }} className="w-full text-left p-3 bg-surface rounded-lg flex items-center space-x-3">
                           <MuscleGroupIcon muscleGroup={ex.muscleGroup} className="w-6 h-6 text-primary" />
                           <span>{ex.name}</span>
                        </button>
                    ))}
                </div>
            </div>
             <div className="flex-shrink-0 p-4 border-t border-surface"><button onClick={finishWorkout} className="w-full bg-red-600 text-white py-3 rounded-lg">Terminer la séance</button></div>
        </div>
      )
  }

  const exercise = currentPlannedExercise ? getExerciseById(currentPlannedExercise.exerciseId) : null;
  const isLastExercise = currentExerciseIndex >= liveWorkout.exercises.length - 1;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Stopwatch ref={stopwatchRef} onFinish={finishWorkout} />
      <div className="p-4 flex-grow overflow-y-auto no-scrollbar">
        {exercise ? <>
            <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary">{exercise.name}</h2>
                  {!isFreestyle && <p className="text-text-secondary">{currentExerciseIndex + 1} / {liveWorkout.exercises.length}</p>}
                </div>
                <MuscleGroupIcon muscleGroup={exercise.muscleGroup} className="w-10 h-10 text-text-secondary"/>
            </div>
            <div className="space-y-3">
              {currentLog?.sets.map((set, index) => (
                <div key={index} className={`flex items-center space-x-2 p-2 rounded-lg ${set.isDropset ? 'bg-indigo-900/50 ml-4' : 'bg-surface'}`}>
                    <span className="font-bold text-lg text-primary w-8 text-center">{index + 1}</span>
                    <input type="number" value={set.reps} onChange={e => handleSetChange(index, 'reps', parseInt(e.target.value) || 0)} className="w-full bg-gray-700 p-2 rounded-md text-white text-center" />
                    <span className="text-text-secondary">reps</span>
                    <input type="number" value={set.weight} step="0.5" onChange={e => handleSetChange(index, 'weight', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 p-2 rounded-md text-white text-center" />
                    <span className="text-text-secondary">kg</span>
                </div>
              ))}
            </div>
        </> : <div className="text-center p-8">Séance terminée !</div>
        }
      </div>
      <div className="flex-shrink-0 p-4 space-y-2 border-t border-surface">
          {exercise ? (
             <>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addSet(false)} className="w-full text-primary border-2 border-primary rounded-lg py-3">Ajouter série</button>
                    <button onClick={() => addSet(true)} className="w-full text-indigo-400 border-2 border-indigo-400 rounded-lg py-3">Série dégressive</button>
                </div>
                {isFreestyle ? (
                     <div className="grid grid-cols-2 gap-2">
                         <button onClick={changeFreestyleExercise} className="w-full bg-surface text-white py-3 rounded-lg">Changer d'exercice</button>
                         <button onClick={finishWorkout} className="w-full bg-red-600 text-white py-3 rounded-lg">Fin de séance</button>
                     </div>
                 ) : !isLastExercise ? (
                    <button onClick={() => setCurrentExerciseIndex(i => i + 1)} className="w-full bg-primary text-white font-bold py-4 rounded-lg text-lg">Exercice Suivant</button>
                 ) : (
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={changeFreestyleExercise} className="w-full bg-secondary text-white py-3 rounded-lg">Ajouter un exercice</button>
                         <button onClick={finishWorkout} className="w-full bg-red-600 text-white py-3 rounded-lg">Fin de séance</button>
                    </div>
                 )
                }
             </>
          ) : (
             <button onClick={onExit} className="w-full bg-primary text-white font-bold py-4 rounded-lg text-lg">Retour à l'accueil</button>
          )
          }
      </div>
    </div>
  );
};


// Navigation
const BottomNav: React.FC<{ currentPage: Page, setCurrentPage: (page: Page) => void }> = ({ currentPage, setCurrentPage }) => {
  const navItems: { page: Page, label: string, icon: React.ReactElement<{ className?: string }> }[] = [
    { page: 'HOME', label: 'Accueil', icon: <HomeIcon /> },
    { page: 'PLANNER', label: 'Planificateur', icon: <CalendarIcon /> },
    { page: 'HISTORY', label: 'Historique', icon: <ChartBarIcon /> },
    { page: 'EXERCISES', label: 'Exercices', icon: <DumbbellIcon/> },
  ];

  return (
    <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 shadow-lg z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map(item => (
          <button
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors ${currentPage === item.page ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
          >
            {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
