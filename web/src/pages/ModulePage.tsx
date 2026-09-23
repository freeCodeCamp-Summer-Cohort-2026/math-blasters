import { Link, useParams } from "react-router-dom";

import { Card } from "../components/Card";
import { PageLayout } from "../components/PageLayout";
import { getModule } from "../content";
import type { LessonType, PageLesson } from "../content";
import { NotFoundPage } from "./NotFoundPage";

// The route between the module list and the lesson player.
// Content ships in the bundle, so there is no loading state and no error state.

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  tutorial: "Tutorial",
  lab: "Lab",
};

export function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const module = slug ? getModule(slug) : undefined;

  if (!module) {
    return <NotFoundPage />;
  }

  const lessonCount = module.lessons.length;

  const heading = (
    <div className="module-page__heading">
      <Link to="/" className="module-page__back">
        <span aria-hidden="true">&larr;</span> All modules
      </Link>
      {/* h2: the root Layout owns the page's h1. */}
      <h2 className="module-page__title">{module.title}</h2>
      {module.description && (
        <p className="module-page__description">{module.description}</p>
      )}
      <p className="module-page__count muted">
        {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
      </p>
    </div>
  );

  return (
    <PageLayout className="module-page" heading={heading}>
      {/* An ordered list: lesson order is meaning, not styling. */}
      <ol className="lesson-list">
        {module.lessons.map((lesson, index) => (
          <li key={lesson.slug}>
            <LessonCard lesson={lesson} position={index + 1} />
          </li>
        ))}
      </ol>
    </PageLayout>
  );
}

interface LessonCardProps {
  lesson: PageLesson;
  position: number;
}

// Week 3 adds two things here, both absent for now and both due in the link's name.
// A per-lesson completion tick goes in `.lesson-card__marks`.
// Labs gain a locked state, from `lesson.requires` and a `completedSlugs` prop.
function LessonCard({ lesson, position }: LessonCardProps) {
  const typeLabel = LESSON_TYPE_LABEL[lesson.type];

  // Card labels itself with its title, which would drop the type from the link name.
  return (
    // The whole card is one link, never a nested pile of them.
    <Link
      to={`/lessons/${encodeURIComponent(lesson.slug)}`}
      className="lesson-card-link"
      aria-label={`${typeLabel}: ${lesson.title}`}
    >
      <Card
        title={lesson.title}
        titleLevel="h3"
        titleVariant="heading"
        className={`lesson-card lesson-card--${lesson.type}`}
      >
        <span className="lesson-card__position" aria-hidden="true">
          {position}
        </span>
        {lesson.description && (
          <p className="lesson-card__description">{lesson.description}</p>
        )}
        <div className="lesson-card__marks">
          {/* The type is carried by its own text, not by the badge colour. */}
          <span className={`lesson-badge lesson-badge--${lesson.type}`}>
            <TypeGlyph type={lesson.type} />
            {typeLabel}
          </span>
        </div>
      </Card>
    </Link>
  );
}

// Decorative shape backing up the type label, so colour is never the only signal.
function TypeGlyph({ type }: { type: LessonType }) {
  return (
    <svg
      className="lesson-badge__glyph"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      {type === "tutorial" ? (
        // Play triangle: a tutorial is something you are walked through.
        <path d="M5 3.5 12.5 8 5 12.5Z" fill="currentColor" />
      ) : (
        // Flask: a lab is something you experiment in.
        <path
          d="M6.5 2v4.2L3.2 12a1.4 1.4 0 0 0 1.2 2.1h7.2a1.4 1.4 0 0 0 1.2-2.1L9.5 6.2V2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
