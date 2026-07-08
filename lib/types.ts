export type ResearchCategory =
  | "overview"
  | "news"
  | "financials"
  | "competition"
  | "risks";

export interface SourceItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
  category: ResearchCategory;
}

export interface EntityResolution {
  resolvedName: string;
  sector: string;
  isPublic: boolean;
  tickerGuess: string | null;
  notes: string;
}

export interface FindingItem {
  claim: string;
  sourceIds: string[];
}

export interface CategoryFindings {
  category: string;
  summary: string;
  items: FindingItem[];
}

export interface FollowUpQuery {
  query: string;
  category: string;
}

export interface RubricFactorScore {
  factor: string;
  score: number;
  justification: string;
  sourceIds: string[];
}

export interface RubricResult {
  factors: RubricFactorScore[];
  overallWeightedScore: number;
}

export interface CaseArgument {
  stance: "bull" | "bear";
  summary: string;
  points: FindingItem[];
}

export interface FinalDecision {
  verdict: "INVEST" | "PASS";
  confidence: "Low" | "Medium" | "High";
  thesis: string;
  topReasonsFor: string[];
  topReasonsAgainst: string[];
  keyRisks: string[];
}

export interface SelfReview {
  wasRevised: boolean;
  note: string | null;
}

export interface ResearchReport {
  company: string;
  entity: EntityResolution;
  findings: CategoryFindings[];
  rubric: RubricResult;
  bullCase: CaseArgument;
  bearCase: CaseArgument;
  decision: FinalDecision;
  selfReview: SelfReview;
  sources: SourceItem[];
  trace: string[];
}

export interface StreamEvent {
  type: "progress" | "final" | "error";
  message?: string;
  report?: ResearchReport;
}
