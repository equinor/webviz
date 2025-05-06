import React from "react";

import { useAtom } from "jotai";

import { KeyKind } from "@framework/DataChannelTypes";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { getContinuousAndNonConstantParameterIdentsInEnsembles } from "@modules/_shared/parameterUnions";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { parameterIdentStringAtom, plotTypeAtom, showTrendlineAtom } from "./atoms/baseAtoms";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";

const plotTypes = [{ value: PlotType.ParameterResponseCrossPlot, label: "Parameter correlation" }];

//-----------------------------------------------------------------------------------------------------------
export function Settings({
    initialSettings,
    settingsContext,
    workbenchSession,
    workbenchServices,
}: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [parameterIdentString, setParameterIdentString] = useAtom(parameterIdentStringAtom);
    const [showTrendline, setShowTrendline] = useAtom(showTrendlineAtom);

    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "parameterIdentString", "string", setParameterIdentString);

    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const globalSyncedParameter = syncHelper.useValue(SyncSettingKey.PARAMETER, "global.syncValue.parameter");

    // Need to get the ensemble idents from the channel to get relevant parameters
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    let ensembleIdentStringsFromChannels: string[] = [];
    if (!receiverResponse.channel || !receiverResponse.channel.contents) {
        ensembleIdentStringsFromChannels = [];
    } else {
        ensembleIdentStringsFromChannels = receiverResponse.channel.contents.map((content) => {
            return content.metaData.ensembleIdentString;
        });
    }

    const ensembleSet = workbenchSession.getEnsembleSet();

    // The channel could have non-regular ensembles (?)
    const regularEnsembleIdentsFromChannels: RegularEnsembleIdent[] = ensembleIdentStringsFromChannels.flatMap((id) => {
        const ensemble = ensembleSet.findEnsembleByIdentString(id);
        return ensemble instanceof RegularEnsemble ? [RegularEnsembleIdent.fromString(id)] : [];
    });

    const parameterIdents = getContinuousAndNonConstantParameterIdentsInEnsembles(
        ensembleSet,
        regularEnsembleIdentsFromChannels,
    );

    // Check if the parameterIdentString/globalSyncedParameter is valid
    // If not, set it to the first valid parameterIdent
    React.useEffect(() => {
        const newParameterIdentString = fixupParameterIdent(parameterIdents, parameterIdentString);
        if (newParameterIdentString !== parameterIdentString) {
            setParameterIdentString(newParameterIdentString);
        }
        if (globalSyncedParameter !== null && globalSyncedParameter !== parameterIdentString) {
            if (fixupParameterIdent(parameterIdents, globalSyncedParameter) === globalSyncedParameter) {
                setParameterIdentString(globalSyncedParameter);
            }
        }
    }, [parameterIdents, globalSyncedParameter]);

    if (ensembleIdentStringsFromChannels.length === 0) {
        return;
    }
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
    const parameterOptions = parameterIdents.map((parameterIdent) => ({
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
                    value={parameterIdentString ? [parameterIdentString] : [""]}
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

Settings.displayName = "Settings";

function fixupParameterIdent(parameterIdents: ParameterIdent[], parameterIdentString: string | null) {
    if (parameterIdents.length > 0) {
        const currentParamIdent = parameterIdentString ? ParameterIdent.fromString(parameterIdentString) : null;
        const isCurrentParamValid = currentParamIdent
            ? parameterIdents.some((availableParam) =>
                  currentParamIdent.equals(
                      ParameterIdent.fromNameAndGroup(availableParam.name, availableParam.groupName),
                  ),
              )
            : false;

        if (!parameterIdentString || !isCurrentParamValid) {
            return parameterIdents[0].toString();
        }
        return parameterIdentString;
    }
    return null;
}
