import React from "react";

import { useAtom, useSetAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import { KeyKind } from "@framework/types/dataChannnel";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { Select } from "@lib/newComponents/Select";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { useSyncSetting } from "@modules/_shared/hooks/useSyncSetting";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { plotTypeAtom, receivedChannelAtom, showTrendlineAtom } from "./atoms/baseAtoms";
import { availableParameterIdentsAtom } from "./atoms/derivedAtoms";
import { parameterIdentStringAtom } from "./atoms/persistedAtoms";
const plotTypes = [{ value: PlotType.ParameterResponseCrossPlot, label: "Parameter correlation" }];

//-----------------------------------------------------------------------------------------------------------
export function Settings(props: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [parameterIdentString, setParameterIdentString] = useAtom(parameterIdentStringAtom);
    const [showTrendline, setShowTrendline] = useAtom(showTrendlineAtom);
    const setReceivedChannel = useSetAtom(receivedChannelAtom);
    const [availableParameterIdents] = useAtom(availableParameterIdentsAtom);
    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
    });
    const globalSyncedParameter = syncHelper.useValue(SyncSettingKey.PARAMETER, "global.syncValue.parameter");

    // Need to get the ensemble idents from the channel to get relevant parameters
    const receiverResponse = props.settingsContext.useChannelReceiver({
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

    useSyncSetting({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
        syncSettingKey: SyncSettingKey.PARAMETER,
        topic: "global.syncValue.parameter",
        value: parameterIdentString.value,
        setValue: setParameterIdentString,
    });

    function handlePlotTypeChanged(value: PlotType | null) {
        if (value === null) {
            return;
        }
        setPlotType(value);
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
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Plot settings" defaultOpen>
                    <SettingWrapper label="Plot type">
                        <Combobox<PlotType> items={plotTypes} value={plotType} onValueChange={handlePlotTypeChanged} />
                    </SettingWrapper>
                    <SettingWrapper>
                        <CheckboxCompositions.WithLabel
                            label="Show trendline"
                            checked={showTrendline}
                            onCheckedChange={setShowTrendline}
                            size="small"
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Parameter selection" defaultOpen>
                    <SettingWrapper label="Parameter" stacked>
                        <Select
                            value={parameterIdentString.value ? [parameterIdentString.value] : []}
                            onValueChange={handleParameterChanged}
                            options={parameterOptions}
                            multiple={false}
                            size={20}
                            filter
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
