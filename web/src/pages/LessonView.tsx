import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { LessonStepper } from "../components/LessonStepper";
import type { ContinueTarget } from "../components/LessonStepper";
import { getLesson, getModule, getModuleForLesson } from "../content";
import type { PageModule } from "../content";
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

  // Looked up once for both kinds, so a lab's Back and ending link the same way a tutorial's do.
  const moduleSlug = getModuleForLesson(lesson.slug);
  const module = moduleSlug ? getModule(moduleSlug) : undefined;
  const backHref = moduleSlug ? `/modules/${encodeURIComponent(moduleSlug)}` : undefined;
  const continueTo = module && backHref ? continueTarget(lesson.slug, module, backHref) : undefined;

  if (lesson.type === "lab") {
    return (
      <LabView lab={lesson} backHref={backHref} continueTo={continueTo} onPassed={handlePassed} />
    );
  }

  return (
    <Card as="section" title={lesson.title} titleVariant="heading">
      <LessonStepper
        lesson={lesson}
        backHref={backHref}
        continueTo={continueTo}
        onPassed={handlePassed}
      />
    </Card>
  );
}

/** Where a passed lesson leads: the next lesson in its module (the lab comes last), or the module page after that. */
function continueTarget(lessonSlug: string, module: PageModule, moduleHref: string): ContinueTarget {
  const next = module.lessons[module.lessons.findIndex((lesson) => lesson.slug === lessonSlug) + 1];
  if (!next) return { href: moduleHref, label: `Back to ${module.title}` };

  const label = next.type === "lab" ? "On to the lab" : "Next lesson";
  return {
    href: `/lessons/${encodeURIComponent(next.slug)}`,
    label,
    accessibleName: `${label}: ${next.title}`,
  };
}
