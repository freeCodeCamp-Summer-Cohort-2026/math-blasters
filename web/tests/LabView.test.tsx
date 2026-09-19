import { render, screen } from "@testing-library/react";
import LabView from "../src/pages/LabView";
import { expectNoA11yViolations } from "./helpers/a11y";
import { MemoryRouter, Route, Routes } from "react-router-dom";

function renderLabView(slug = "marbles-in-total") {
    return render(
        <MemoryRouter initialEntries={[`/labs/${slug}`]}>
            <Routes>
                <Route path="/labs/:slug" element={<LabView />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("LabView Route (/labs/:slug)", () => {
    it("renders the lab outcome as the main heading", () => {
        renderLabView();

        expect(
            screen.getByRole("heading", {
                level: 2,
                name: "Combine groups of marbles to find total sums in applied scenarios.",
            }),
        ).toBeInTheDocument();
    });

    it("renders one main landmark", () => {
        renderLabView();

        expect(screen.getAllByRole("main")).toHaveLength(1);
    });

    it("has no accessibility violations", async () => {
        const { container } = renderLabView();

        await expectNoA11yViolations(container);
    });
});