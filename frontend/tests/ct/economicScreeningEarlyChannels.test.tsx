import { expect, test } from "@playwright/experimental-ct-react";

import { EarlyMeasureChannelPublisherHarness } from "./support/EarlyMeasureChannelPublisherHarness";

test("withdraws Economic Screening early channel contents when disabled", async ({ mount, page }) => {
    const component = await mount(<EarlyMeasureChannelPublisherHarness enabled />);

    await expect(page.getByTestId("published-content-count")).toHaveText("1");
    await component.update(<EarlyMeasureChannelPublisherHarness enabled={false} />);
    await expect(page.getByTestId("published-content-count")).toHaveText("0");
});
