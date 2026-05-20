import type {
  AthleteProfile,
  CoachRecommendation,
  ImportedWorkout,
  ReadinessCheckIn,
  TrainingLog,
  WeeklyPlan
} from './types';

export const demoProfile: AthleteProfile = {
  name: 'Kai',
  age: 32,
  heightCm: 176,
  trainingAgeYears: 5,
  runningBaseline: 'Comfortable 5K, rebuilding consistent weekly mileage',
  currentGoal: 'Improve running while keeping CrossFit performance sharp',
  preferredUnits: 'metric',
  injuryFlags: ['Watch left calf tightness after intervals'],
  weeklyAvailability: [
    { day: 'Mon', available: true, minutes: 75 },
    { day: 'Tue', available: true, minutes: 60 },
    { day: 'Wed', available: true, minutes: 60 },
    { day: 'Thu', available: true, minutes: 45 },
    { day: 'Fri', available: true, minutes: 60 },
    { day: 'Sat', available: true, minutes: 90 },
    { day: 'Sun', available: false, minutes: 0 }
  ],
  prs: [
    { lift: 'Back squat', value: '150 kg' },
    { lift: 'Deadlift', value: '185 kg' },
    { lift: 'Clean and jerk', value: '105 kg' },
    { lift: 'Snatch', value: '82.5 kg' }
  ]
};

export const demoImportedWorkouts: ImportedWorkout[] = [
  {
    id: 'cf-mon',
    day: 'Mon',
    source: 'pushpress-screenshot',
    title: 'Back squat + short metcon',
    extractedText: '5x3 back squat, then 10 min AMRAP: wall balls, box jumps, burpees',
    confidence: 0.86,
    reviewState: 'approved',
    lowerBodyLoad: 'high',
    metconIntensity: 'high',
    fatigueImpact: 'high',
    tags: [
      { label: 'lower body', level: 'high' },
      { label: 'metcon', level: 'high' },
      { label: 'jumping', level: 'moderate' }
    ]
  },
  {
    id: 'cf-wed',
    day: 'Wed',
    source: 'pushpress-screenshot',
    title: 'Gymnastics skill + engine',
    extractedText: 'Pull-up skill work, then intervals on rower and dumbbell snatches',
    confidence: 0.72,
    reviewState: 'needs-review',
    lowerBodyLoad: 'moderate',
    metconIntensity: 'moderate',
    fatigueImpact: 'moderate',
    tags: [
      { label: 'upper pull', level: 'moderate' },
      { label: 'engine', level: 'moderate' }
    ]
  }
];

export const demoWeeklyPlan: WeeklyPlan = {
  weekLabel: 'May 20-26',
  sessions: [
    {
      id: 'mon-cf',
      day: 'Mon',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Strength and metcon anchor',
      durationMinutes: 60,
      intensity: 'high',
      status: 'planned',
      warning: 'Avoid hard running after this lower-body load.'
    },
    {
      id: 'tue-run',
      day: 'Tue',
      type: 'easy-run',
      title: 'Easy aerobic run',
      purpose: 'Build durability without adding intensity',
      durationMinutes: 35,
      intensity: 'low',
      status: 'planned'
    },
    {
      id: 'wed-cf',
      day: 'Wed',
      type: 'crossfit',
      title: 'CrossFit class',
      purpose: 'Skill and moderate engine work',
      durationMinutes: 60,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'thu-quality',
      day: 'Thu',
      type: 'quality-run',
      title: 'Controlled intervals',
      purpose: 'Improve running speed with capped fatigue',
      durationMinutes: 42,
      intensity: 'moderate',
      status: 'planned'
    },
    {
      id: 'sat-long',
      day: 'Sat',
      type: 'long-run',
      title: 'Long easy run',
      purpose: 'Extend aerobic base',
      durationMinutes: 55,
      intensity: 'low',
      status: 'planned'
    }
  ]
};

export const demoReadiness: ReadinessCheckIn = {
  soreness: 6,
  energy: 7,
  sleepQuality: 6,
  mood: 7,
  painFlag: false
};

export const demoLogs: TrainingLog[] = [
  {
    sessionId: 'mon-cf',
    completion: 'completed',
    rpe: 8,
    durationMinutes: 62,
    notes: 'Squats felt heavy but clean. Legs cooked after box jumps.'
  }
];

export const demoRecommendations: CoachRecommendation[] = [
  {
    id: 'protect-tue',
    title: 'Keep Tuesday easy',
    body: 'Monday had high lower-body load and high metcon intensity. Keep the run aerobic and skip strides.',
    severity: 'caution',
    actionLabel: 'Apply easy version'
  }
];
