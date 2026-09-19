import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";
import { getLesson } from "../content";
import { NotFoundPage } from "./NotFoundPage";
import LabView from "./LabView";

/**
 * Route view for /lessons/:slug.
 * Synchronously retrieves lesson from the content bundle.
 * Falls back to NotFoundPage if slug is unknown.
 */
export function LessonView() {
  const { slug } = useParams<{ slug: string }>();
  const lesson = slug ? getLesson(slug) : undefined;

  if (!lesson) {
    return <NotFoundPage />;
  }

  if (lesson.type === "lab") {
    return (
      <Card as="section" title={lesson.title} titleLevel="h1">
        <LabView />
      </Card>
    );
  }

  return (
    <Card as="section" title={lesson.title}>
      <LessonStepper lesson={lesson} />
    </Card>
  );
}
