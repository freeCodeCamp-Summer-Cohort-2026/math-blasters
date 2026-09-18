import type { ExplainStep as ExplainStepData } from "../../content/types";
import { RenderMarkdown } from "../Markdown";

export interface ExplainStepProps {
  step: ExplainStepData;
}

/** Renders an explain step's prose; driven entirely by props, so the lab route can reuse it exactly as the lesson player does. */
export function ExplainStep({ step }: ExplainStepProps) {
  return <RenderMarkdown content={step.content} />;
}
