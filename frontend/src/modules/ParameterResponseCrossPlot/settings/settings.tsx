import React from "react";

import { useAtom, useSetAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { KeyKind } from "@framework/types/dataChannnel";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { plotTypeAtom, receivedChannelAtom, showTrendlineAtom } from "./atoms/baseAtoms";
import { availableParameterIdentsAtom } from "./atoms/derivedAtoms";
import { parameterIdentStringAtom } from "./atoms/persistedAtoms";
const plotTypes = [{ value: PlotType.ParameterResponseCrossPlot, label: "Parameter correlation" }];

//-----------------------------------------------------------------------------------------------------------
export function Settings({ settingsContext, workbenchServices }: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [parameterIdentString, setParameterIdentString] = useAtom(parameterIdentStringAtom);
    const [showTrendline, setShowTrendline] = useAtom(showTrendlineAtom);
    const setReceivedChannel = useSetAtom(receivedChannelAtom);
    const [availableParameterIdents] = useAtom(availableParameterIdentsAtom);
    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const globalSyncedParameter = syncHelper.useValue(SyncSettingKey.PARAMETER, "global.syncValue.parameter");

    // Need to get the ensemble idents from the channel to get relevant parameters
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    React.useEffect(
        () => {
            setReceivedChannel(receiverResponse);
        }, // We only want to listen to revision number changes, but we need the whole channel response to set it
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [receiverResponse.revisionNumber, setReceivedChannel],
    );

    // Check if the parameterIdentString/globalSyncedParameter is valid
    // If not, set it to the first valid parameterIdent

    React.useEffect(
        function updateParameterIdentString() {
            if (globalSyncedParameter !== null && globalSyncedParameter !== parameterIdentString.value) {
                setParameterIdentString(globalSyncedParameter);
            }
        },
        [globalSyncedParameter, parameterIdentString, setParameterIdentString],
    );

    function handlePlotTypeChanged(value: string) {
        setPlotType(value as PlotType);
    }

    function handleParameterChanged(value: string[]) {
        const selectedValue = value.length > 0 ? value[0] : null;
        setParameterIdentString(selectedValue);
        if (selectedValue && selectedValue !== globalSyncedParameter) {
            syncHelper.publishValue(SyncSettingKey.PARAMETER, "global.syncValue.parameter", selectedValue);
        }
    }
    const parameterOptions = availableParameterIdents.map((parameterIdent) => ({
        value: parameterIdent.toString(),
        label: `${parameterIdent.name} (${parameterIdent.groupName})`,
    }));

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot settings" expanded>
                <Label text="Show trendline" position="left" key="show-trendline">
                    <Checkbox checked={showTrendline} onChange={(e) => setShowTrendline(e.target.checked)} />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
                <Select
                    value={parameterIdentString.value ? [parameterIdentString.value] : [""]}
                    onChange={handleParameterChanged}
                    options={parameterOptions}
                    multiple={false}
                    size={40}
                    filter
                />
            </CollapsibleGroup>
        </div>
    );
}
