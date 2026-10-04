import { useEffect, useRef } from "react";
import type { AnswerInputKind } from "../content";

type AnswerInputProps = {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onReset: () => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    errorId?: string;
    /** Id of extra text the field should be described by, such as the checking statement. */
    describedBy?: string;
    /** "text" for expressions and lists, which a number field can't hold. */
    kind?: AnswerInputKind;
};

export const AnswerInput = ({
    id,
    label,
    value,
    onChange,
    onSubmit,
    onReset,
    placeholder,
    invalid,
    disabled,
    errorId,
    describedBy,
    kind = "number"
}: AnswerInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const descriptionIds = [invalid ? errorId ?? `${id}-error` : undefined, describedBy].filter(Boolean).join(" ");

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        // attaching a non passive listener to dom element
        const handleWheel = (e: WheelEvent) => {
            // prevent page scrolling when input is focused
            if (document.activeElement === input) {
                e.preventDefault();
            }
        };

        // options for event listener
        const controller = new AbortController();

        input.addEventListener("wheel", handleWheel, { passive: false, signal: controller.signal });

        // cleaning up
        return () => {
            // tear down event listener
            controller.abort();
        }
    }, [])

    return (
        <label
            htmlFor={id}
            className="answer-field"
        >
            <span className="answer-field__label">{label}</span>
            <input
                ref={inputRef}
                id={id}
                type={kind}
                // decimal, not numeric: a numeric keypad has no decimal point for answers like 3.5.
                inputMode={kind === "number" ? "decimal" : undefined}
                value={value}
                onChange={onChange}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmit();
                    if (e.key === "Escape") onReset();
                }}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={invalid}
                aria-describedby={descriptionIds || undefined}
                className={`answer-field__input`}
            />
        </label>
    );
};
