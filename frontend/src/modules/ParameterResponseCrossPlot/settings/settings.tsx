import React from "react";

import { useAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { parameterIdentStringAtom, plotTypeAtom } from "./atoms/baseAtoms";
import { Checkbox } from "@lib/components/Checkbox";
import { KeyKind } from "@framework/DataChannelTypes";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { set } from "lodash";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { Tag } from "@lib/components/Tag";
import { Input } from "@mui/icons-material";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { Select } from "@lib/components/Select";

const plotTypes = [{ value: PlotType.ParameterResponseCrossPlot, label: "Parameter correlation" }];

//-----------------------------------------------------------------------------------------------------------
export function Settings({ initialSettings, settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [parameterIdentString, setParameterIdentString] = useAtom(parameterIdentStringAtom);
    const [revNumberResponse, setRevNumberResponse] = React.useState<number>(0);
    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "parameterIdentString", "string", setParameterIdentString);

    const ensembleSet = workbenchSession.getEnsembleSet();
    const receiverResponse = settingsContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });
    if (receiverResponse.revisionNumber !== revNumberResponse && !receiverResponse.isPending) {
        setRevNumberResponse(receiverResponse.revisionNumber);
    }
    function handlePlotTypeChanged(value: string) {
        setPlotType(value as PlotType);
    }

    if (!receiverResponse.channel) {
        return (
            <ContentInfo>
                <span>
                    Data channel required for use. Add a main module to the workbench and use the data channels icon
                    <Input />
                </span>
                <Tag label="Response" />
            </ContentInfo>
        );
    }

    if (receiverResponse.channel.contents.length === 0) {
        return (
            <ContentInfo>
                No data on <Tag label={receiverResponse.displayName} />
            </ContentInfo>
        );
    }
    // Create a map with parameters for each ensemble

    const ensembleIdentStrings = receiverResponse.channel.contents.map((content) => {
        return content.metaData.ensembleIdentString;
    });
    // Check if the ensemble idents are of type RegularEnsembleIdent
    const ensembles = ensembleIdentStrings.map((ensembleIdentString) => {
        const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
        if (!ensemble) {
            return null;
        }
        if (ensemble instanceof RegularEnsemble) {
            return ensemble;
        }
        return null;
    });
    const selectedEnsembles = ensembles.filter((ensemble) => ensemble !== null);

    const continuousAndNonConstantParametersUnion: Parameter[] = [];
    for (const ensemble of selectedEnsembles) {
        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        // Add non-duplicate parameters to list - verified by ParameterIdent
        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterInUnion = continuousAndNonConstantParametersUnion.some((elm) =>
                parameterIdent.equals(ParameterIdent.fromNameAndGroup(elm.name, elm.groupName)),
            );

            if (isParameterInUnion) continue;
            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }
    function handleParameterChanged(value: string[]) {
        if (value.length > 0) {
            const parameterIdent = ParameterIdent.fromString(value[0]);
            setParameterIdentString(parameterIdent.toString());
        } else {
            setParameterIdentString(null);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot settings" expanded>
                <Label text="Parameter" key="parameter-ident">
                    <Select
                        value={parameterIdentString ? [parameterIdentString] : [""]}
                        onChange={handleParameterChanged}
                        options={continuousAndNonConstantParametersUnion.map((parameter) => ({
                            value: new ParameterIdent(parameter.name, parameter.groupName).toString(),
                            label: `${parameter.name} (${parameter.groupName})`,
                        }))}
                        multiple={false}
                        size={100}
                    />
                </Label>
            </CollapsibleGroup>
        </div>
    );
}

Settings.displayName = "Settings";
