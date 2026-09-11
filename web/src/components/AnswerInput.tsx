import { useEffect, useRef } from "react";

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
    errorId
}: AnswerInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

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
                type="number"
                inputMode="numeric"
                value={value}
                onChange={onChange}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmit();
                    if (e.key === "Escape") onReset();
                }}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={invalid}
                aria-describedby={invalid ? `${errorId ?? `${id}-error`}` : undefined}
                className={`answer-field__input`}
            />
        </label>
    );
};
