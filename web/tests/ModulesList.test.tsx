import { render, screen, within } from "@testing-library/react";
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

    it("lists modules in authored order, like the module page's lessons", () => {
        render(
            <MemoryRouter>
                <Providers><ModulesList /></Providers>
            </MemoryRouter>
        );
        const modules = content.getModules();

        const list = screen.getByRole("list");
        expect(list.tagName).toBe("OL");
        const titles = within(list)
            .getAllByRole("heading", { level: 2 })
            .map((heading) => heading.textContent);
        expect(titles).toEqual(modules.map((module) => module.title));
    })

    it("makes each module one link carrying its lesson count", () => {
        render(
            <MemoryRouter>
                <Providers><ModulesList /></Providers>
            </MemoryRouter>
        );
        const modules = content.getModules();

        screen.getAllByRole("listitem").forEach((item, index) => {
            const module = modules[index];
            const links = within(item).getAllByRole("link");
            expect(links).toHaveLength(1);
            expect(links[0]).toHaveAttribute("href", `/modules/${module.slug}`);
            const count = module.lessons.length;
            expect(links[0]).toHaveTextContent(`${count} ${count === 1 ? "lesson" : "lessons"}`);
        });
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