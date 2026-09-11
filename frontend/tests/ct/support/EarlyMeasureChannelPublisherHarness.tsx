import { useRef, useState } from "react";

import type { Channel } from "@framework/internal/DataChannels/Channel";
import {
    usePublishChannelContents,
    type UsePublishChannelContentsOptions,
} from "@framework/internal/DataChannels/hooks/usePublishChannelContents";
import type { ViewContext } from "@framework/ModuleContext";
import type { Interfaces } from "@modules/EconomicScreening/interfaces";
import { EarlyEconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { RealizationEconomicResult } from "@modules/EconomicScreening/utils/economicCalculations";
import { EarlyMeasureChannelPublisher } from "@modules/EconomicScreening/view/components/earlyMeasureChannelPublisher";

const RESULTS: RealizationEconomicResult[] = [
    {
        realization: 1,
        valuationYear: 2020,
        years: [2020],
        oilVolumes: [100],
        salesGasVolumes: [0],
        hasOilData: true,
        hasSalesGasData: true,
        gasToOilEquivalentDivisor: 1000,
        discountedOilVolume: 90,
        discountedSalesGasVolume: 0,
        discountedOilEquivalents: 90,
        undiscountedOilVolume: 100,
        undiscountedSalesGasVolume: 0,
        npv: 90,
        irr: null,
        breakEvenOilPrice: null,
        netCashFlow: [100],
        discountFactors: [0.9],
    },
];

export function EarlyMeasureChannelPublisherHarness({ enabled }: { enabled: boolean }) {
    const [publishedContentCount, setPublishedContentCount] = useState(0);
    const channel = useRef({ replaceContents: (contents: unknown[]) => setPublishedContentCount(contents.length) });
    const viewContext = {
        usePublishChannelContents: (options: Omit<UsePublishChannelContentsOptions, "channel">) =>
            usePublishChannelContents({ channel: channel.current as Channel, ...options }),
    } as unknown as ViewContext<Interfaces>;

    return (
        <>
            <EarlyMeasureChannelPublisher
                viewContext={viewContext}
                measure={EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME}
                results={RESULTS}
                endYear={2020}
                unit="Sm3"
                ensembleIdentString="ensemble"
                ensembleDisplayName="Ensemble"
                color="#000000"
                enabled={enabled}
                assumptionContext=""
            />
            <output data-testid="published-content-count">{publishedContentCount}</output>
        </>
    );
}
