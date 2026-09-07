import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { fireEvent, screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

import { AnswerInput } from '../src/components/AnswerInput';

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

    it("updates value when user types", async () => {
        const onChange = vi.fn();

        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value=""
                onChange={onChange}
                onSubmit={() => { }}
                onReset={() => { }}
            />
        );

        fireEvent.change(screen.getByLabelText("How many?"), { target: { value: '42' } });
        expect(onChange).toHaveBeenCalledWith("42");
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

    it("announces invalid state and describes it with supplied message", () => {
        render(
            <AnswerInput
                id="answer"
                label="How many?"
                value="0"
                onChange={() => { }}
                onSubmit={() => { }}
                onReset={() => { }}
                invalid
                errorId="answer-error"
                errorMessage="Enter a number greater than zero."
            />
        );

        const input = screen.getByLabelText("How many?");

        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAttribute("aria-describedby", "answer-error");
        expect(
            screen.getByText("Enter a number greater than zero.")
        ).toHaveAttribute("id", "answer-error");
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

});