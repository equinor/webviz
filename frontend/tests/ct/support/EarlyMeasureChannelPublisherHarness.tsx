import { useState } from "react";

import { ChannelManager } from "@framework/internal/DataChannels/ChannelManager";
import { useChannelReceiver } from "@framework/internal/DataChannels/hooks/useChannelReceiver";
import {
    usePublishChannelContents,
    type UsePublishChannelContentsOptions,
} from "@framework/internal/DataChannels/hooks/usePublishChannelContents";
import type { ViewContext } from "@framework/ModuleContext";
import { KeyKind } from "@framework/types/dataChannnel";
import { EARLY_MEASURE_CHANNEL_ID_MAP } from "@modules/EconomicScreening/channelDefs";
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
    const [channelManager] = useState(() => {
        const manager = new ChannelManager("economic-screening");
        const channelIdString = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME];
        manager.registerChannels([{ idString: channelIdString, displayName: "Early oil", kindOfKey: KeyKind.REALIZATION }]);
        manager.registerReceivers([
            {
                idString: "consumer",
                displayName: "Consumer",
                supportedKindsOfKeys: [KeyKind.REALIZATION],
            },
        ]);
        manager.getReceiver("consumer")?.connectToChannel(manager.getChannel(channelIdString)!, "all");
        return manager;
    });
    const channelIdString = EARLY_MEASURE_CHANNEL_ID_MAP[EarlyEconomicMeasure.DISCOUNTED_OIL_VOLUME];
    const receiver = channelManager.getReceiver("consumer")!;
    const received = useChannelReceiver(receiver, [KeyKind.REALIZATION]);
    const viewContext = {
        usePublishChannelContents: (options: Omit<UsePublishChannelContentsOptions, "channel">) =>
            usePublishChannelContents({ channel: channelManager.getChannel(channelIdString)!, ...options }),
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
            <output data-testid="received-content-count">{received.channel?.contents.length ?? 0}</output>
            <output data-testid="received-data-count">{received.channel?.contents[0]?.dataArray.length ?? 0}</output>
        </>
    );
}
