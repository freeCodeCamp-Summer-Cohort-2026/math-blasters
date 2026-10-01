import { Link } from "react-router-dom";
import { getModules } from "../content";
import type { PageModule } from "../content";
import { useProgress } from "../context/ProgressContext";
import { Card } from "./Card";
import { CompletedMark } from "./CompletedMark";
import { Skeleton } from "./Skeleton";

// Laid out like the module page's lesson list, so both lists read the same.
export const ModulesList = () => {
  const modules = getModules();
  const { completedSlugs, loading: progressLoading } = useProgress();
  // Null until a lesson in the module is completed, so an untouched module reads as before.
  const progressText = (lessons: { slug: string }[]) => {
    const done = lessons.filter((lesson) => completedSlugs.includes(lesson.slug)).length;
    return done > 0 ? `${done} of ${lessons.length} completed` : null;
  };

  return modules?.length ? (
    // An ordered list: modules are authored in order, like lessons.
    <ol className="module-list">
      {modules.map((module, index) => (
        <li key={module.slug}>
          <ModuleCard
            module={module}
            position={index + 1}
            progress={progressText(module.lessons)}
            progressLoading={progressLoading}
          />
        </li>
      ))}
    </ol>
  ) : (
    <Card title="No modules found." titleLevel="h2" className="empty-state">
      <a
        target="_blank"
        href="https://github.com/freeCodeCamp-Summer-Cohort-2026/math-blasters/blob/main/CONTRIBUTING.md#adding-a-lesson"
      >
        Learn how to add a lesson
      </a>
    </Card>
  );
};

interface ModuleCardProps {
  module: PageModule;
  position: number;
  progress: string | null;
  progressLoading: boolean;
}

function ModuleCard({ module, position, progress, progressLoading }: ModuleCardProps) {
  const lessonCount = module.lessons.length;

  return (
    // The whole card is one link, as on the module page.
    <Link
      to={`/modules/${encodeURIComponent(module.slug)}`}
      className="module-card-link"
      // Card labels itself with its title, so the progress is added to the link's name here.
      aria-label={progress ? `${module.title}, ${progress}` : undefined}
    >
      <Card
        title={module.title}
        titleLevel="h2"
        titleVariant="heading"
        className="module-card"
      >
        <span className="module-card__position" aria-hidden="true">
          {position}
        </span>
        {module.description && (
          <p className="module-card__description">{module.description}</p>
        )}
        <div className="module-card__marks">
          <span className="module-card__count">
            {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          {progressLoading ? (
            <Skeleton variant="text" width="6rem" label="Loading progress" />
          ) : (
            progress && <CompletedMark>{progress}</CompletedMark>
          )}
        </div>
      </Card>
    </Link>
  );
}
