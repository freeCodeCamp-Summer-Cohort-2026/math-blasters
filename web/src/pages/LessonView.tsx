import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";
import { getLesson, getModuleForLesson } from "../content";
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

  if (!lesson) {
    return <NotFoundPage />;
  }

  if (lesson.type === "lab") {
    return <LabView lab={lesson} />;
  }

  const moduleSlug = getModuleForLesson(lesson.slug);
  const backHref = moduleSlug ? `/modules/${encodeURIComponent(moduleSlug)}` : undefined;

  return (
    <Card as="section" title={lesson.title}>
      <LessonStepper lesson={lesson} backHref={backHref} />
    </Card>
  );
}
