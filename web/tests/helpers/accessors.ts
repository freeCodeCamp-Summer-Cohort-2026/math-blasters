export const expectNoCriteria = (value: unknown) : void => {
    if(Array.isArray(value)) {
        for(const item of value) {
            expectNoCriteria(item);
        }

        return;
    }

    if(value !== null && typeof value === "object") {
        for(const [key, val] of Object.entries(value)) {
            if (key === "criteria" || key === "expected") {
                throw new Error(`Forbidden field found: ${key}`);
            }

            expectNoCriteria(val);
        }
    }
};
