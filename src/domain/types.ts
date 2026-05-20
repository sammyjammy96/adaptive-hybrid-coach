export type SessionType = 'crossfit' | 'easy-run' | 'quality-run' | 'long-run' | 'rest' | 'recovery';
export type Intensity = 'low' | 'moderate' | 'high';
export type ReviewState = 'needs-review' | 'approved';
export type CompletionState = 'planned' | 'completed' | 'modified' | 'skipped' | 'moved';

export interface AthleteProfile {
  name: string;
  age: number;
  heightCm: number;
  trainingAgeYears: number;
  runningBaseline: string;
  currentGoal: string;
  weeklyAvailability: AvailabilityWindow[];
  prs: PersonalRecord[];
  injuryFlags: string[];
  preferredUnits: 'metric' | 'imperial';
}

export interface AvailabilityWindow {
  day: string;
  available: boolean;
  minutes: number;
}

export interface PersonalRecord {
  lift: string;
  value: string;
}

export interface WorkoutTag {
  label: string;
  level: Intensity;
}

export interface ImportedWorkout {
  id: string;
  day: string;
  source: 'pushpress-screenshot' | 'manual';
  title: string;
  extractedText: string;
  confidence: number;
  reviewState: ReviewState;
  tags: WorkoutTag[];
  lowerBodyLoad: Intensity;
  metconIntensity: Intensity;
  fatigueImpact: Intensity;
}

export interface PlannedSession {
  id: string;
  day: string;
  type: SessionType;
  title: string;
  purpose: string;
  durationMinutes: number;
  intensity: Intensity;
  status: CompletionState;
  warning?: string;
}

export interface WeeklyPlan {
  weekLabel: string;
  sessions: PlannedSession[];
}

export interface TrainingLog {
  sessionId: string;
  completion: CompletionState;
  rpe: number;
  durationMinutes: number;
  notes: string;
}

export interface ReadinessCheckIn {
  soreness: number;
  energy: number;
  sleepQuality: number;
  mood: number;
  painFlag: boolean;
}

export interface CoachRecommendation {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'caution' | 'recovery';
  actionLabel: string;
}
