import { Exercise, MuscleGroup, Equipment } from './types';

export const INITIAL_EXERCISES: Exercise[] = [
  { id: 'ex1', name: 'Développé couché', muscleGroup: MuscleGroup.CHEST, equipment: 'Barre' },
  { id: 'ex2', name: 'Squat', muscleGroup: MuscleGroup.LEGS, equipment: 'Barre' },
  { id: 'ex3', name: 'Soulevé de terre', muscleGroup: MuscleGroup.BACK, equipment: 'Barre' },
  { id: 'ex4', name: 'Développé militaire', muscleGroup: MuscleGroup.SHOULDERS, equipment: 'Barre' },
  { id: 'ex5', name: 'Curl Biceps', muscleGroup: MuscleGroup.ARMS, equipment: 'Haltère' },
  { id: 'ex6', name: 'Planche', muscleGroup: MuscleGroup.CORE, equipment: 'Machine' },
  { id: 'ex7', name: 'Tractions', muscleGroup: MuscleGroup.BACK, equipment: 'Machine' },
  { id: 'ex8', name: 'Presse à cuisses', muscleGroup: MuscleGroup.LEGS, equipment: 'Machine' },
  { id: 'ex9', name: 'Écarté avec haltères', muscleGroup: MuscleGroup.CHEST, equipment: 'Haltère' },
  { id: 'ex10', name: 'Extension Triceps', muscleGroup: MuscleGroup.ARMS, equipment: 'Machine' }
];

export const MUSCLE_GROUP_COLORS: { [key in MuscleGroup]: string } = {
  [MuscleGroup.CHEST]: 'bg-red-500',
  [MuscleGroup.BACK]: 'bg-blue-500',
  [MuscleGroup.LEGS]: 'bg-green-500',
  [MuscleGroup.SHOULDERS]: 'bg-yellow-500',
  [MuscleGroup.ARMS]: 'bg-purple-500',
  [MuscleGroup.CORE]: 'bg-pink-500',
};