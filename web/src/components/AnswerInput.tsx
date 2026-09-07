type AnswerInputProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onReset: () => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    errorId?: string;
    errorMessage?: string
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
    errorMessage
}: AnswerInputProps) => {
    return (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
            <label
                htmlFor={id}
                className="answer-field__label"
            >
                {label}
            </label>

            <div className="relative w-full">
                <input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSubmit();
                    }}
                    onWheel={(event) => {
                        if (document.activeElement == event.currentTarget) {
                            event.preventDefault();
                        }
                    }}
                    onReset={onReset}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? `${errorId}` : undefined}
                    className={`answer-field__input` + (invalid ? " border-[var(--danger)]" : "")}
                />
            </div>

            {invalid && errorMessage ? (
                <p id={errorId} role="alert" className="text-[var(--danger)] text-sm font-bold animate-bounce">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
};
