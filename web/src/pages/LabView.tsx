import type { PageLesson } from "../content";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";

// The lab variant of the lesson player: the outcome is the task, so it leads.
export function LabView({ lab }: { lab: PageLesson }) {
  return (
    <Card
      as="section"
      title={lab.outcome ?? lab.title}
      titleLevel="h1"
      titleVariant="heading"
      className="lab-view"
    >
      {/* Secondary by design: naming the lab must not compete with the outcome. */}
      <p className="lab-view__name">{lab.title}</p>
      {lab.description && (
        <p className="lab-view__description">{lab.description}</p>
      )}

      <LessonStepper lesson={lab} headingLevel="h2" />
    </Card>
  );
}
