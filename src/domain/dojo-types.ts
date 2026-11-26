/**
 * StopBucks Dojo Pure Domain Types
 * Completely independent of React, Next.js, Supabase, or browser APIs.
 */

export type DojoWorldId = "world-1" | "world-2" | "world-3";

export type DojoLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type DojoBadgeId =
  | "planners_shield"
  | "pain_master"
  | "friction_architect"
  | "bracket_architect"
  | "system2_strategist"
  | "bucket_master"
  | "campus_resilience"
  | "domino_breaker"
  | "golden_egg_crown";

export type DojoBelt =
  | "White Belt"
  | "Yellow Belt"
  | "Green Belt"
  | "Blue Belt"
  | "Black Belt";

export type DojoRankTitle =
  | "Impulse Rookie"
  | "Bias Spotter"
  | "Friction Architect"
  | "Bucket Strategist"
  | "Golden Egg Master";

export type DojoLevelStatus = "completed" | "active" | "locked";

export interface DojoWorld {
  id: DojoWorldId;
  worldNumber: 1 | 2 | 3;
  title: string;
  subtitle: string;
  themeAccent: string;
}

export interface DojoCitation {
  authors: string;
  year: number;
  title: string;
  journal: string;
  sampleSummary: string;
  keyFinding: string;
}

export interface MythBetComparisonBar {
  label: string;
  value: number;
  displayValue: string;
  highlight?: boolean;
}

export interface MythBetStep {
  prompt: string;
  options: string[];
  correctIndex: number;
  comparisonBars: MythBetComparisonBar[];
  revealExplanation: string;
}

export interface ImpulseDuelChoice {
  label: string;
  isDeliberative: boolean;
  feedback: string;
}

export interface ImpulseDuelRound {
  scenario: string;
  system1Excuse: string;
  choices: ImpulseDuelChoice[];
}

export interface ImpulseDuelMechanicStep {
  kind: "impulse_duel";
  scenario: string;
  system1Excuse: string;
  choices: ImpulseDuelChoice[];
  rounds?: ImpulseDuelRound[];
}

export type DojoSliderPresetKey =
  | "coupling_meter"
  | "broad_bracket_zoom"
  | "hyperbolic_beta";

export interface InteractiveSliderTargetRange {
  min: number;
  max: number;
}

export interface InteractiveSliderMechanicStep {
  kind: "interactive_slider";
  sliderLabel: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  presetKey: DojoSliderPresetKey;
  challengePrompt: string;
  targetRange: InteractiveSliderTargetRange;
  insightText: string;
}

export interface BucketSortCategory {
  id: string;
  label: string;
}

export interface BucketSortItem {
  id: string;
  title: string;
  subtitle: string;
  correctCategoryId: string;
  feedback: string;
}

export interface BucketSortMechanicStep {
  kind: "bucket_sort";
  categories: BucketSortCategory[];
  items: BucketSortItem[];
}

export interface FeedbackLoopOption {
  label: string;
  isOptimal: boolean;
  feedback: string;
}

export interface FeedbackLoopStepItem {
  prompt: string;
  options: FeedbackLoopOption[];
}

export interface FeedbackLoopMechanicStep {
  kind: "feedback_loop";
  shockTitle: string;
  shockDescription: string;
  steps: FeedbackLoopStepItem[];
}

export type DojoMechanicStep =
  | ImpulseDuelMechanicStep
  | InteractiveSliderMechanicStep
  | BucketSortMechanicStep
  | FeedbackLoopMechanicStep;

export interface MasteryQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DojoLevel {
  id: DojoLevelId;
  worldId: DojoWorldId;
  slug: string;
  title: string;
  subtitle: string;
  isBoss: boolean;
  estimatedSeconds: number;
  baseXp: number;
  perfectBonusXp: number;
  badgeId: DojoBadgeId;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  citation: DojoCitation;
  secondaryCitation?: DojoCitation;
  wager: MythBetStep;
  mechanic: DojoMechanicStep;
  masteryQuestions: MasteryQuestion[];
}

export interface DojoLevelCompletion {
  levelId: DojoLevelId;
  bestAccuracyPct: number;
  earnedXp: number;
  completedAt: string; // ISO 8601 UTC
  replayCount: number;
}

export interface DojoProgress {
  completedLevels: DojoLevelCompletion[];
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // Local YYYY-MM-DD
  unlockedBadges: string[];
  soundMuted: boolean;
  updatedAt: string; // ISO 8601 UTC
}

export interface DojoRankInfo {
  belt: DojoBelt;
  title: DojoRankTitle;
  currentXp: number;
  nextBeltXp: number | null;
  progressPct: number;
}

export interface DojoLevelCompletionInput {
  levelId: DojoLevelId;
  correctCount: number;
  totalQuestions: number;
  localDateKey: string; // Local YYYY-MM-DD
  nowIso: string; // ISO 8601 UTC
}

export interface DojoLevelCompletionResult {
  nextProgress: DojoProgress;
  xpAwarded: number;
  newlyUnlockedBadgeId: string | null;
  accuracyPct: number;
  isFirstCompletion: boolean;
  rankUpTo: DojoRankInfo | null;
}

export interface PrelecCouplingEvaluation {
  modeIndex: 0 | 1 | 2;
  modeLabel: string;
  couplingLevel: "high" | "moderate" | "low";
  couplingStrengthPct: number;
  painSaliencePct: number;
  isIllustrativeScale: true;
  scaleDisclaimer: string;
  behavioralExplanation: string;
  comparisonSummary: string;
}

export interface LaibsonCurvePoint {
  period: number;
  exponential: number;
  hyperbolic: number;
}

export interface LaibsonWelfareEvaluation {
  beta: number;
  welfareLossPct: number;
  exponentialDelta: number;
  exponentialDiscountAtPeriod1: number;
  hyperbolicDiscountAtPeriod1: number;
  interpolationMethod: "piecewise_linear_laibson_1997_table_ii";
  curvePoints: LaibsonCurvePoint[];
  insight: string;
}

export interface BroadBracketEvaluation {
  dailyMinor: number;
  weeklyMinor: number;
  monthlyMinor: number;
  annualMinor: number;
  compounded4YearMinor: number;
}

export type DojoMirrorMetricValueType = "money_minor" | "percent" | "count" | "text";
export type DojoMirrorMetricTone = "positive" | "neutral" | "caution";
export type DojoMirrorActionHref = "/runway" | "/log" | "/radar" | "/vault";

export interface DojoPersonalMirrorMetric {
  label: string;
  valueType: DojoMirrorMetricValueType;
  numericValue: number | null;
  textValue?: string;
  tone: DojoMirrorMetricTone;
}

export interface DojoPersonalMirrorActionLink {
  label: string;
  href: DojoMirrorActionHref;
}

export interface DojoPersonalMirror {
  headline: string;
  insight: string;
  metrics: DojoPersonalMirrorMetric[];
  hasLiveSignal: boolean;
  actionLink: DojoPersonalMirrorActionLink;
}
