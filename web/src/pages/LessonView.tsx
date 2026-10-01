import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";
import { getLesson, getModuleForLesson } from "../content";
import { useProgress } from "../context/ProgressContext";
import { NotFoundPage } from "./NotFoundPage";
import { LabView } from "./LabView";

/**
 * Route view for /lessons/:slug.
 * Synchronously retrieves lesson from the content bundle.
 * Falls back to NotFoundPage if slug is unknown.
 */
export function LessonView() {
  const { slug } = useParams<{ slug: string }>();
  const lesson = slug ? getLesson(slug) : undefined;
  const { recordCompletion } = useProgress();

  if (!lesson) {
    return <NotFoundPage />;
  }

  const handlePassed = () => recordCompletion(lesson.slug);

  if (lesson.type === "lab") {
    return <LabView lab={lesson} onPassed={handlePassed} />;
  }

  const moduleSlug = getModuleForLesson(lesson.slug);
  const backHref = moduleSlug ? `/modules/${encodeURIComponent(moduleSlug)}` : undefined;

  return (
    <Card as="section" title={lesson.title} titleVariant="heading">
      <LessonStepper lesson={lesson} backHref={backHref} onPassed={handlePassed} />
    </Card>
  );
}
