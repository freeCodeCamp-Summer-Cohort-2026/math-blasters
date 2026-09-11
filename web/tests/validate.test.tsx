import { makeLesson } from "../src/content";
import { validateLesson } from "../src/content/validate";

describe("validate lesson", () => {
    it("rejects a lab without an outcome", () => {
        const lesson = makeLesson({
            type: "lab",
        });

        expect(() => validateLesson(lesson, "lessons/lab.md")).toThrow();
    });

    it("rejects a tutorial with an outcome", () => {
        const lesson = makeLesson({
            type: "tutorial",
            outcome: "Learn how to count marbles.",
        });

        expect(() => validateLesson(lesson, "lessons/tutorial.md")).toThrow();
    });

    it("accepts a valid lab", () => {
        const lesson = makeLesson({
            type: "lab",
            outcome: "Figure out how many marbles there are in total.",
        });

        expect(() => validateLesson(lesson, "lessons/lab.md")).not.toThrow();
    });

    it("accepts a valid tutorial", () => {
        const lesson = makeLesson({
            type: "tutorial",
        });

        expect(() => validateLesson(lesson, "lessons/tutorial.md")).not.toThrow();
    });

    it("rejects a lab with a whitespace only outcome", () => {
        const lesson = makeLesson({
            type: "lab",
            outcome: "   ",
        });

        expect(() => validateLesson(lesson, "lessons/lab.md")).toThrow();
    });
})
