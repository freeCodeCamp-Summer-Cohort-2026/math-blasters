import { contentIndex, getLesson, getModule, getModules } from "../src/content/accessors";
import { expectNoCriteria } from "./helpers/accessors";

describe("content accessors", () => {
    it("returns all modules", () => {
        const modules = getModules();

        expect(modules).toHaveLength(contentIndex.length);
        expect(modules[0].slug).toBe(contentIndex[0].slug);
    });

    it("returns a module by slug", () => {
        const expected = contentIndex[0];

        const result = getModule(expected.slug);

        expect(result?.slug).toBe(expected.slug);
    });

    it("returns undefined for an unknown module slug", () => {
        expect(getModule("does-not-exist")).toBeUndefined();
    });

    it("returns a lesson by slug", () => {
        const expected = contentIndex[0].lessons[0];

        const result = getLesson(expected.slug);

        expect(result?.slug).toBe(expected.slug);
    });

    it("returns undefined for an unknown lesson slug", () => {
        expect(getLesson("does-not-exist")).toBeUndefined();
    });

    it("does not expose criteria from getModules", () => {
        const pageModules = getModules();

        expectNoCriteria(pageModules);
    })

    it("does not expose criteria from getLesson", () => {
        const fixtureLesson = contentIndex[0].lessons[0];
        const lessonSlug = fixtureLesson.slug;

        expect(getLesson(lessonSlug)).toBeDefined();
        expectNoCriteria(getLesson(lessonSlug));
    })

    it("does not expose criteria from getModule", () => {
        const fixtureModule = contentIndex[0];
        const pageModule = getModule(fixtureModule.slug);

        expect(pageModule).toBeDefined();
        expectNoCriteria(pageModule);
    });
});
