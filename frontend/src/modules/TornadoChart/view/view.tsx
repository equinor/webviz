import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleViewProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage/contentMessage";

import { useSetAtom } from "jotai";

import { selectedSensitivityAtom } from "./atoms/baseAtoms";
import { SensitivityChart } from "./components/sensitivityChart";
import SensitivityTable from "./components/sensitivityTable";
import { SensitivityResponseCalculator, SensitivityResponseDataset } from "./utils/sensitivityResponseCalculator";

import { createSensitivityColorMap } from "../../_shared/sensitivityColors";
import { Interfaces } from "../interfaces";
import { DisplayComponentType } from "../typesAndEnums";

export const View = ({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
    const hideZeroY = viewContext.useSettingsToViewInterfaceValue("hideZeroY");
    const showRealizationPoints = viewContext.useSettingsToViewInterfaceValue("showRealizationPoints");
    const displayComponentType = viewContext.useSettingsToViewInterfaceValue("displayComponentType");
    const referenceSensitivityName = viewContext.useSettingsToViewInterfaceValue("referenceSensitivityName");
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const responseReceiver = viewContext.useChannelReceiver({
        receiverIdString: "response",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    const setSelectedSensitivity = useSetAtom(selectedSensitivityAtom);

    const realizations: number[] = [];
    const values: number[] = [];
    let channelEnsemble: Ensemble | null = null;
    if (responseReceiver.channel && responseReceiver.channel.contents.length > 0) {
        const data = responseReceiver.channel.contents[0].dataArray;
        if (data) {
            data.forEach((el) => {
                realizations.push(el.key as number);
                values.push(el.value as number);
            });
        }
        if (responseReceiver.channel.contents[0].metaData.ensembleIdentString) {
            const ensembleIdentString = responseReceiver.channel.contents[0].metaData.ensembleIdentString;
            if (typeof ensembleIdentString === "string") {
                const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
                channelEnsemble = ensembleSet.findEnsemble(ensembleIdent);
            }
        }
    }

    const sensitivities = channelEnsemble?.getSensitivities();
    const colorSet = workbenchSettings.useColorSet();
    const sensitivitiesColorMap = createSensitivityColorMap(
        sensitivities?.getSensitivityNames().sort() ?? [],
        colorSet
    );

    let computedSensitivityResponseDataset: SensitivityResponseDataset | null = null;
    if (referenceSensitivityName && sensitivities && realizations.length > 0 && values.length > 0) {
        const sensitivityResponseCalculator = new SensitivityResponseCalculator(
            sensitivities,
            {
                realizations,
                values,
                name: responseReceiver.channel?.contents[0].displayName ?? "",
                unit: "",
            },
            referenceSensitivityName
        );
        computedSensitivityResponseDataset = sensitivityResponseCalculator.computeSensitivitiesForResponse();
    }

    function makeContent() {
        viewContext.setInstanceTitle(`Tornado chart`);
        if (!responseReceiver.channel) {
            return (
                <ContentInfo>
                    Connect a data channel to <Tag label="Response" />
                </ContentInfo>
            );
        }

        if (responseReceiver.channel.contents.length === 0) {
            return <ContentInfo>No data received on channel {responseReceiver.channel.displayName}</ContentInfo>;
        }

        if (!computedSensitivityResponseDataset) {
            return <ContentInfo>No sensitivities available</ContentInfo>;
        }

        if (computedSensitivityResponseDataset && displayComponentType === DisplayComponentType.TornadoChart) {
            viewContext.setInstanceTitle(`Tornado chart for ${computedSensitivityResponseDataset.responseName}`);
            return (
                <SensitivityChart
                    sensitivityResponseDataset={computedSensitivityResponseDataset}
                    sensitivityColorMap={sensitivitiesColorMap}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                    showLabels={showLabels}
                    hideZeroY={hideZeroY}
                    showRealizationPoints={showRealizationPoints}
                    onSelectedSensitivity={setSelectedSensitivity}
                />
            );
        }

        if (computedSensitivityResponseDataset && displayComponentType === DisplayComponentType.Table) {
            viewContext.setInstanceTitle(`Sensitivity table for ${computedSensitivityResponseDataset.responseName}`);
            return (
                <div className="text-sm">
                    <SensitivityTable
                        sensitivityResponseDataset={computedSensitivityResponseDataset}
                        onSelectedSensitivity={setSelectedSensitivity}
                        hideZeroY={hideZeroY}
                    />
                </div>
            );
        }
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
