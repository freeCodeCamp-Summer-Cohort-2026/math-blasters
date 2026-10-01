// Text plus a check, so completion never rests on colour alone.
export function CompletedMark({ children = "Completed" }: { children?: string }) {
  return (
    <span className="completed-mark">
      <svg
        className="completed-mark__glyph"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M3 8.5 6.5 12 13 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </span>
  );
}
