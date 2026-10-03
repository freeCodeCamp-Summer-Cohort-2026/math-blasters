import { Link, useParams } from "react-router-dom";

import { Card } from "../components/Card";
import { CompletedMark } from "../components/CompletedMark";
import { PageLayout } from "../components/PageLayout";
import { SignInPrompt } from "../components/SignInPrompt/SignInPrompt";
import { Skeleton } from "../components/Skeleton";
import { getModule } from "../content";
import type { LessonType, PageLesson, lockReason } from "../content";
import { useProgress } from "../context/ProgressContext";
import { NotFoundPage } from "./NotFoundPage";

// The route between the module list and the lesson player.
// Content ships in the bundle; only progress comes over the network, so only the ticks load.

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  tutorial: "Tutorial",
  lab: "Lab",
};

// The shape the content index's `lockReason` returns, so it is never declared twice.
type LockReason = ReturnType<typeof lockReason>;

export function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const module = slug ? getModule(slug) : undefined;
  const { completedSlugs, loading: progressLoading } = useProgress();

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
      <SignInPrompt surface="module" />
      {/* An ordered list: lesson order is meaning, not styling. */}
      <ol className="lesson-list">
        {module.lessons.map((lesson, index) => (
          <li key={lesson.slug}>
            <LessonCard
              lesson={lesson}
              position={index + 1}
              completed={completedSlugs.includes(lesson.slug)}
              progressLoading={progressLoading}
              // #119 computes this from progress; until then every lab renders unlocked.
              lockReason={null}
            />
          </li>
        ))}
      </ol>
    </PageLayout>
  );
}

interface LessonCardProps {
  lesson: PageLesson;
  position: number;
  completed: boolean;
  progressLoading: boolean;
  lockReason: LockReason;
}

// Locked when lockReason is set; this renders it, #119 decides it.
export function LessonCard({
  lesson,
  position,
  completed,
  progressLoading,
  lockReason,
}: LessonCardProps) {
  const typeLabel = LESSON_TYPE_LABEL[lesson.type];
  const name = `${typeLabel}: ${lesson.title}${completed ? ", completed" : ""}${lockReason ? ", locked" : ""}`;

  const card = (
    <Card
      title={lesson.title}
      titleLevel="h3"
      titleVariant="heading"
      className={`lesson-card lesson-card--${lesson.type}${lockReason ? " lesson-card--locked" : ""}`}
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
        {lockReason && <LockedMark />}
        {progressLoading ? (
          <Skeleton variant="text" width="6rem" label="Loading progress" />
        ) : (
          completed && <CompletedMark />
        )}
      </div>
      {lockReason && (
        <p className="lesson-card__lock-reason">
          Finish{" "}
          <Link to={`/lessons/${encodeURIComponent(lockReason.tutorialSlug)}`}>
            {lockReason.title}
          </Link>{" "}
          first.
        </p>
      )}
    </Card>
  );

  // Not a link and not focusable: the only way on is the reason's link to the tutorial.
  if (lockReason) {
    return (
      <div className="lesson-card-locked" role="group" aria-label={name}>
        {card}
      </div>
    );
  }

  // Card labels itself with its title, which would drop the type from the link name.
  return (
    // The whole card is one link, never a nested pile of them.
    <Link
      to={`/lessons/${encodeURIComponent(lesson.slug)}`}
      className="lesson-card-link"
      aria-label={name}
    >
      {card}
    </Link>
  );
}

// Text plus a padlock, so the locked state never rests on colour alone.
function LockedMark() {
  return (
    <span className="locked-mark">
      <svg
        className="locked-mark__glyph"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      </svg>
      Locked
    </span>
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
