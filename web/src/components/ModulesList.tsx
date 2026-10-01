import { Link } from "react-router-dom";
import { getModules } from "../content";
import { useProgress } from "../context/ProgressContext";
import { Card } from "./Card";
import { CompletedMark } from "./CompletedMark";
import { Skeleton } from "./Skeleton";

export const ModulesList = () => {
  const modules = getModules();
  const { completedSlugs, loading: progressLoading } = useProgress();
  // Null until a lesson in the module is completed, so an untouched module reads as before.
  const progressText = (lessons: { slug: string }[]) => {
    const done = lessons.filter((lesson) => completedSlugs.includes(lesson.slug)).length;
    return done > 0 ? `${done} of ${lessons.length} completed` : null;
  };

  return modules?.length ? (
    modules.map((module) => {
      const progress = progressText(module.lessons);
      return (
        <Link
          key={module.slug}
          to={`/modules/${encodeURIComponent(module.slug)}`}
          className="module-card-link"
          // Card labels itself with its title, so the progress is added to the link's name here.
          aria-label={progress ? `${module.title}, ${progress}` : undefined}
        >
          <Card title={module.title} titleLevel="h2" className="module-card">
            <p className="module-card-description">
              {module.description || "No description provided"}
            </p>
            <span className="module-card-lessons">
              {module.lessons.length} lessons
            </span>
            {progressLoading ? (
              <Skeleton variant="text" width="6rem" label="Loading progress" />
            ) : (
              progress && <CompletedMark>{progress}</CompletedMark>
            )}
          </Card>
        </Link>
      );
    })
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
