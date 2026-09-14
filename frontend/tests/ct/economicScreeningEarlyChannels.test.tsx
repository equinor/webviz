import { expect, test } from "@playwright/experimental-ct-react";

import { EarlyMeasureChannelPublisherHarness } from "./support/EarlyMeasureChannelPublisherHarness";

test("connected consumer clears and recovers Economic Screening early contents", async ({ mount, page }) => {
    const component = await mount(<EarlyMeasureChannelPublisherHarness enabled />);

    await expect(page.getByTestId("received-content-count")).toHaveText("1");
    await expect(page.getByTestId("received-data-count")).toHaveText("1");
    await component.update(<EarlyMeasureChannelPublisherHarness enabled={false} />);
    await expect(page.getByTestId("received-content-count")).toHaveText("0");
    await expect(page.getByTestId("received-data-count")).toHaveText("0");
    await component.update(<EarlyMeasureChannelPublisherHarness enabled />);
    await expect(page.getByTestId("received-content-count")).toHaveText("1");
    await expect(page.getByTestId("received-data-count")).toHaveText("1");
});
