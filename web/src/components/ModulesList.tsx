import { Link } from "react-router-dom";
import { getModules } from "../content";
import type { PageModule } from "../content";
import { Card } from "./Card";

// Laid out like the module page's lesson list, so both lists read the same.
export const ModulesList = () => {
  const modules = getModules();

  return modules?.length ? (
    // An ordered list: modules are authored in order, like lessons.
    <ol className="module-list">
      {modules.map((module, index) => (
        <li key={module.slug}>
          <ModuleCard module={module} position={index + 1} />
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

function ModuleCard({ module, position }: { module: PageModule; position: number }) {
  const lessonCount = module.lessons.length;

  return (
    // The whole card is one link, as on the module page.
    <Link
      to={`/modules/${encodeURIComponent(module.slug)}`}
      className="module-card-link"
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
        <span className="module-card__count">
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </span>
      </Card>
    </Link>
  );
}
