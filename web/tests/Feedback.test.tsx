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
        expect(feedbackElement).toHaveTextContent(feedbackContent[state].title);
    });

    it("gives every state its own title, so none relies on colour alone", () => {
        const titles = FEEDBACKSTATES.map((state) => feedbackContent[state].title);

        expect(new Set(titles).size).toBe(FEEDBACKSTATES.length);
    });

    it("renders extra detail under the title", () => {
        render(<Feedback state="not-yet"><p>More detail</p></Feedback>);

        expect(screen.getByRole("region", { name: "not-yet feedback" })).toHaveTextContent("More detail");
    });

    it("shows the state's own line when the caller adds nothing", () => {
        render(<Feedback state="correct">{false}</Feedback>);

        expect(screen.getByRole("region", { name: "correct feedback" })).toHaveTextContent(
            feedbackContent.correct.detail,
        );
    });

    it("leaves the live region to its caller", () => {
        render(<Feedback state="correct" />);

        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
