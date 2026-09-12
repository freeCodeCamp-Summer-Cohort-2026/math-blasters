export const expectNoCriteria = (value: unknown) : void => {
    if(Array.isArray(value)) {
        for(const item of value) {
            expectNoCriteria(item);
        }

        return;
    }

    if(value !== null && typeof value === "object") {
        for(const [key, val] of Object.entries(value)) {
            expect(key).not.toBe("criteria");
            expect(key).not.toBe("expected");

            expectNoCriteria(val);
        }
    }
};