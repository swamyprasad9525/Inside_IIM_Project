import { Annotation } from "@langchain/langgraph";
import type {
  EntityResolution,
  SourceItem,
  CategoryFindings,
  FollowUpQuery,
  RubricResult,
  CaseArgument,
  FinalDecision,
  SelfReview,
} from "@/lib/types";

export const GraphState = Annotation.Root({
  companyInput: Annotation<string>,
  entity: Annotation<EntityResolution | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  sources: Annotation<SourceItem[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  findings: Annotation<CategoryFindings[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  researchRound: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  followUpQueries: Annotation<FollowUpQuery[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  rubric: Annotation<RubricResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  bullCase: Annotation<CaseArgument | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  bearCase: Annotation<CaseArgument | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  decision: Annotation<FinalDecision | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  selfReview: Annotation<SelfReview>({
    reducer: (_prev, next) => next,
    default: () => ({ wasRevised: false, note: null }),
  }),
  trace: Annotation<string[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
});

export type GraphStateType = typeof GraphState.State;
