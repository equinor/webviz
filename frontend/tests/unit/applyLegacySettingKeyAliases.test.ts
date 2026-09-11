import { describe, expect, test } from "vitest";

import { applyLegacySettingKeyAliases } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";

describe("applyLegacySettingKeyAliases", () => {
    test("moves a legacy key's value onto its current key", () => {
        const settings: Record<string, string> = { attribute: '"depth"' };

        applyLegacySettingKeyAliases(settings, { attribute: "surfaceAttribute" });

        expect(settings).toEqual({ surfaceAttribute: '"depth"' });
    });

    test("does not overwrite an existing value already saved under the current key", () => {
        const settings: Record<string, string> = { attribute: '"depth"', surfaceAttribute: '"other"' };

        applyLegacySettingKeyAliases(settings, { attribute: "surfaceAttribute" });

        expect(settings).toEqual({ surfaceAttribute: '"other"' });
    });

    test("is a no-op when the legacy key is not present", () => {
        const settings: Record<string, string> = { surfaceAttribute: '"depth"' };

        applyLegacySettingKeyAliases(settings, { attribute: "surfaceAttribute" });

        expect(settings).toEqual({ surfaceAttribute: '"depth"' });
    });

    test("is a no-op when no aliases are configured", () => {
        const settings: Record<string, string> = { attribute: '"depth"' };

        applyLegacySettingKeyAliases(settings, undefined);

        expect(settings).toEqual({ attribute: '"depth"' });
    });
});
