import { expect, test } from "vitest";

import { makeEnsemblePerRealizationResponse } from "@modules/SensitivityPlot/view/hooks/responseChannelUtils";

test("preserves a response channel's unit", () => {
    const response = makeEnsemblePerRealizationResponse({
        idString: "content",
        displayName: "Net present value",
        dataArray: [{ key: 7, value: 123 }],
        metaData: { ensembleIdentString: "ensemble", unit: "USD" },
    });

    expect(response).toEqual({ realizations: [7], values: [123], name: "Net present value", unit: "USD" });
});
