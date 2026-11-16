import { describe, expect, test } from "vitest";

import { createTimestampedFilename, createZipFilename } from "@lib/utils/downloadUtils";

describe("createTimestampedFilename", () => {
    test("matches expected pattern", () => {
        expect(createTimestampedFilename("Foo", "csv")).toMatch(/^Foo_\d{8}_\d{6}\.csv$/);
    });
});

describe("createZipFilename", () => {
    test("matches expected pattern (regression lock for existing behaviour)", () => {
        expect(createZipFilename("Foo")).toMatch(/^Foo_\d{8}_\d{6}\.zip$/);
    });
});
