import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { fireEvent, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

import { AnswerInput } from '../src/components/AnswerInput';
import { useState } from 'react';

describe('AnswerInput', () => {
    it('should render successfully', () => {
        const { baseElement } = render(
            <AnswerInput
                id="answer"
                label="Answer"
                value=""
                onChange={() => { }}
                onSubmit={() => { }}
                onReset={() => { }}
            />
        );
        expect(baseElement).toBeTruthy();
    });

    it("submits when Enter is pressed", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();

        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value="42"
                onChange={() => { }}
                onSubmit={onSubmit}
                onReset={() => { }}
            />
        );

        await user.type(screen.getByLabelText("How many?"), "{Enter}");

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not change value when wheel-scrolled while focused", async () => {
        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value="42"
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onReset={vi.fn()}
            />
        );

        const input = screen.getByLabelText("How many?");
        input.focus();

        fireEvent.wheel(input, { deltaY: 100 });

        expect(input).toHaveValue(42);
    });

    it("show onchange value is set", async () => {
        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value="42"
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onReset={vi.fn()}
            />
        );

        const input = screen.getByLabelText("How many?");
        expect(input).toHaveValue(42);
    });

    it("after onchange value is updated", async () => {
        // 1. Create a tiny wrapper component to manage the state live
        const TestWrapper = () => {
            const [val, setVal] = useState("42");
            return (
                <AnswerInput
                    id="answer"
                    label="How many?"
                    value={val}
                    onChange={(e) => setVal(e.target.value)} // updates state
                    onSubmit={vi.fn()}
                    onReset={vi.fn()}
                />
            );
        };

        render(<TestWrapper />);

        const input = screen.getByLabelText("How many?");

        // Initial verification
        expect(input).toHaveValue(42);

        // Simulate typing changes
        fireEvent.change(input, { target: { value: "43" } });

        // Now it passes!
        expect(input).toHaveValue(43);
    });

    it("announces invalid state and error message", async () => {
        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value="42"
                onChange={vi.fn()}
                onSubmit={vi.fn()}
                onReset={vi.fn()}
                invalid
                errorId="answer-error"
            />
        );

        const input = screen.getByLabelText("How many?");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAttribute("aria-describedby", "answer-error");
    });

});