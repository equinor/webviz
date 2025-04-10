import { describe, expect, test } from "vitest";

import { UUID_REGEX_STRING } from "@framework/utils/uuidUtils";


describe("UUID utility functions", () => {
    test("should return a valid UUID regex pattern", () => {
        const regexString = UUID_REGEX_STRING;
        const regex = new RegExp(`^${regexString}$`);

        const validUuids = [
            "123e4567-e89b-12d3-a456-426614174000",
            "987f6543-e21b-45d3-b456-426614174001",
            "11111111-2222-3333-a444-555555555555",
            "00000000-0000-0000-0000-000000000000",
            "ffffffff-ffff-ffff-ffff-ffffffffffff",
        ];

        validUuids.forEach((uuid) => {
            expect(regex.test(uuid)).toBe(true);
        });
    });

    test("should not match invalid UUIDs", () => {
        const regexString = UUID_REGEX_STRING;
        const regex = new RegExp(`^${regexString}$`);

        const invalidUuids = [
            "123e4567-e89b-12d3-a456-42661417400", // too short (missing last digit)
            "123e4567-e89b-12d3-a456-4266141740001", // too long (extra digit)
            "123e4567-e89b-12d3-a456-42661417400z", // invalid character (last character is z)
            "g23e4567-e89b-12d3-a456-426614174000", // invalid character (first character is g)
        ];

        invalidUuids.forEach((uuid) => {
            expect(regex.test(uuid)).toBe(false);
        });
    });
});
