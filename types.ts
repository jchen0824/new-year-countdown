export interface HandLandmarkerResult {
  landmarks: Array<Array<{ x: number; y: number; z: number }>>;
  worldLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
}

export interface HandData {
  x: number; // Normalized 0-1 (screen space)
  y: number; // Normalized 0-1 (screen space)
  isFist: boolean;
  isPresent: boolean;
}

export type GameState = 'intro' | 'playing' | 'celebration';

export enum ParticleShape {
  FIVE = '5',
  FOUR = '4',
  THREE = '3',
  TWO = '2',
  ONE = '1',
  ZERO = '0',
  HAPPY = 'Happy 2026'
}
