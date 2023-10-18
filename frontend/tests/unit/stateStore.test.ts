import { StateStore } from "@framework/StateStore";

import { describe, expect, test } from "vitest";

type TestState = {
    value: string;
    count: number;
    object: {
        test: string;
        count: number;
    };
    array: string[];
    objectArray: {
        test: string;
        count: number;
    }[];
};

describe("StateStore", () => {
    test("Can set and get value", () => {
        const store = new StateStore<TestState>({
            value: "first",
            count: 0,
            object: { test: "test", count: 0 },
            array: [],
            objectArray: [],
        });
        expect(store.getValue("value")).toBe("first");
        expect(store.getValue("count")).toBe(0);
        expect(store.getValue("object")).toEqual({ test: "test", count: 0 });
        expect(store.getValue("array")).toEqual([]);

        store.setValue("value", "second");
        expect(store.getValue("value")).toBe("second");

        store.setValue("count", 1);
        expect(store.getValue("count")).toBe(1);

        store.setValue("object", { test: "test2", count: 1 });
        expect(store.getValue("object")).toEqual({ test: "test2", count: 1 });

        store.setValue("array", ["test"]);
        expect(store.getValue("array")).toEqual(["test"]);

        store.setValue("objectArray", [{ test: "test", count: 0 }]);
        expect(store.getValue("objectArray")).toEqual([{ test: "test", count: 0 }]);
    });
});
