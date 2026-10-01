import { render, screen } from "@testing-library/react";
import { ModulesList } from "../src/components/ModulesList";
import * as content from '../src/content';
import { expectNoA11yViolations } from "./helpers/a11y";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { vi, afterEach } from "vitest";
import { AuthProvider } from "../src/context/AuthContext";
import { ProgressProvider } from "../src/context/ProgressContext";

// Signed out and settled, so no progress is fetched.
const Providers = ({ children }: { children: ReactNode }) => (
    <AuthProvider initialLoading={false}>
        <ProgressProvider>{children}</ProgressProvider>
    </AuthProvider>
);

describe("ModulesList checks", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("test list view", () => {
        const { container } = render(
        <MemoryRouter>
            <Providers><ModulesList /></Providers>
        </MemoryRouter>
    );
        expect(container).toBeInTheDocument();

        expect(screen.getByText("Arithmetic Addition")).toBeInTheDocument();
    })

    it("test empty state", () => {
        // Mock getModules to return an empty array
        vi.spyOn(content, 'getModules').mockReturnValue([]);

        render(
            <MemoryRouter>
                <Providers><ModulesList /></Providers>
            </MemoryRouter>
        );
        expect(screen.getByText("No modules found.")).toBeInTheDocument();
    })

    it("check a11y on list view", async () => {
        const { container } = render(
            <MemoryRouter>
                <Providers><ModulesList /></Providers>
            </MemoryRouter>
        );
        await expectNoA11yViolations(container);
    })
})