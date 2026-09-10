import { expect, test } from "@playwright/experimental-ct-react";

import { PublishChannelContentsHarness } from "./support/PublishChannelContentsHarness";

test("withdraws published contents when disabled", async ({ mount }) => {
    const component = await mount(<PublishChannelContentsHarness enabled />);

    await expect(component).toHaveText("1");
    await component.update(<PublishChannelContentsHarness enabled={false} />);
    await expect(component).toHaveText("0");
});