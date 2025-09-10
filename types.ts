export enum MuscleGroup {
  CHEST = 'Pectoraux',
  BACK = 'Dos',
  LEGS = 'Jambes',
  SHOULDERS = 'Epaules',
  ARMS = 'Bras',
  CORE = 'Abdos',
}

export type Equipment = 'Barre' | 'Haltère' | 'Machine';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom?: boolean;
  isArchived?: boolean;
}

export interface SetLog {
  reps: number;
  weight: number;
  isDropset?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: number; // Unix timestamp
  duration: number; // in seconds
  exercises: ExerciseLog[];
  totalVolume: number;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string; // e.g., "8-12"
  isSuperset: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface UserSettings {
  name: string;
  favoriteExerciseIds: string[];
}

export interface PR {
  weight: number;
  reps: number;
}