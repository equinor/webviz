import { Ajv } from "ajv/dist/jtd";
import { describe, expect, test } from "vitest";

import { migrateLegacyRealizationFilterSetLocation } from "@framework/internal/WorkbenchSession/utils/deserialization";
import { WORKBENCH_SESSION_CONTENT_STATE_SCHEMA } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession.schema";
import { IncludeExcludeFilter, RealizationFilterType } from "@framework/types/realizationFilterTypes";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";

const ajv = new Ajv();
const validateContent = ajv.compile(WORKBENCH_SESSION_CONTENT_STATE_SCHEMA);

function makeLegacyDashboard() {
    return {
        id: "dashboard-1",
        name: "New Dashboard",
        activeModuleInstanceId: null,
        moduleInstances: [],
    };
}

function makeBaseContent(dashboards: unknown[]) {
    return {
        activeDashboardId: dashboards.length > 0 ? "dashboard-1" : null,
        dashboards,
        ensembleSet: { regularEnsembles: [], deltaEnsembles: [] },
        settings: {
            selectedColorPalettes: {
                [ColorPaletteType.Categorical]: "",
                [ColorPaletteType.ContinuousDiverging]: "",
                [ColorPaletteType.ContinuousSequential]: "",
            },
            discreteColorScaleSteps: {
                [ColorScaleDiscreteSteps.Sequential]: 0,
                [ColorScaleDiscreteSteps.Diverging]: 0,
            },
        },
        userCreatedItems: { intersectionPolylines: { intersectionPolylines: [] } },
    };
}

describe("migrateLegacyRealizationFilterSetLocation", () => {
    test("moves session-level ensembleRealizationFilterSet onto dashboards[0]", () => {
        const legacyFilterSet = [
            {
                ensembleIdentString: "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::case1::ens1",
                realizationFilter: {
                    assignedEnsembleIdentString: "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::case1::ens1",
                    includeExcludeFilter: IncludeExcludeFilter.INCLUDE_FILTER,
                    filterType: RealizationFilterType.BY_REALIZATION_NUMBER,
                    realizationNumberSelections: [],
                    parameterIdentStringToValueSelectionMap: [],
                },
            },
        ];

        const content = {
            ...makeBaseContent([makeLegacyDashboard()]),
            ensembleRealizationFilterSet: legacyFilterSet,
        };

        const migrated = migrateLegacyRealizationFilterSetLocation(content);

        expect(migrated).not.toHaveProperty("ensembleRealizationFilterSet");
        expect((migrated.dashboards[0] as any).realizationFilterSet).toEqual(legacyFilterSet);
        const isValid = validateContent(migrated);
        if (!isValid) {
            console.log(JSON.stringify(validateContent.errors, null, 2));
        }
        expect(isValid).toBe(true);
    });

    test("drops the filter data when there are zero dashboards", () => {
        const content = {
            ...makeBaseContent([]),
            ensembleRealizationFilterSet: [],
        };

        expect(() => migrateLegacyRealizationFilterSetLocation(content)).not.toThrow();

        const migrated = migrateLegacyRealizationFilterSetLocation(content);
        expect(migrated).not.toHaveProperty("ensembleRealizationFilterSet");
        expect(migrated.dashboards).toHaveLength(0);
    });

    test("is a no-op for already-migrated content", () => {
        const dashboard = { ...makeLegacyDashboard(), realizationFilterSet: [] };
        const content = makeBaseContent([dashboard]);

        const migrated = migrateLegacyRealizationFilterSetLocation(content);

        expect(migrated).toBe(content);
        expect(validateContent(migrated)).toBe(true);
    });
});
