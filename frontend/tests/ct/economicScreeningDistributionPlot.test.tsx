import { expect, test } from "@playwright/experimental-ct-react";

import { DistributionPlotType, EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import { MeasureDistributionPlot } from "@modules/EconomicScreening/view/components/measureDistributionPlot";

test("renders a visible marker for a single-value exceedance distribution", async ({ mount, page }) => {
    await mount(
        <MeasureDistributionPlot
            measure={EconomicMeasure.DISCOUNTED_OIL_VOLUME}
            measureValues={{ realizations: [1], values: [42] }}
            unit="Sm3"
            plotType={DistributionPlotType.EXCEEDANCE}
            color="#1f77b4"
            width={640}
            height={360}
            isDelta={false}
        />,
    );

    await expect(page.locator(".scatterlayer .point")).toHaveCount(1);
    await expect(page.locator(".scatterlayer .point")).toBeVisible();
});
