import { render, screen } from "@testing-library/react";
import { Feedback } from "../src/components/Feedback";
import { FEEDBACKSTATES } from "../src/components/Feedback/types";
import { feedbackContent } from "../src/components/Feedback/content";

describe("Feedback component", () => {
    it.each(FEEDBACKSTATES)("should render the %s state", (state) => {
        render(<Feedback state={state} />);

        const feedbackElement = screen.getByRole("region", {
            name: `${state} feedback`,
        });

        expect(feedbackElement).toHaveAttribute("data-state", state);
        
        expect(
            screen.getByRole("heading", {
                name: feedbackContent[state].title,
            }),
        ).toBeInTheDocument();

        expect(screen.getByRole("status")).toHaveTextContent(
            feedbackContent[state].announcement,
        );
    });
});