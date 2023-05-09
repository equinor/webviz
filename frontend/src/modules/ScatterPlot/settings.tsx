import React from "react";

import { EnsembleParameterDescription, VectorDescription } from "@api";
import { BroadcastChannelDataTypes, broadcaster, useChannelData } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { ChannelSelect } from "@lib/components/ChannelSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const [channelNameX, setChannelNameX] = moduleContext.useStoreState("channelNameX");
    const [channelNameY, setChannelNameY] = moduleContext.useStoreState("channelNameY");
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);

    const [timeStep, setTimeStep] = moduleContext.useStoreState("timeStep");

    const channelX = broadcaster.getChannel(channelNameX ?? "");
    const channelY = broadcaster.getChannel(channelNameY ?? "");

    React.useEffect(() => {
        if (channelX) {
            const handleChannelXChanged = (data: any) => {
                setDataX(data);
            };

            const unsubscribeFunc = channelX.subscribe(handleChannelXChanged);

            return unsubscribeFunc;
        }
    }, [channelX]);

    React.useEffect(() => {
        if (channelY) {
            const handleChannelYChanged = (data: any) => {
                setDataY(data);
            };

            const unsubscribeFunc = channelY.subscribe(handleChannelYChanged);

            return unsubscribeFunc;
        }
    }, [channelY]);

    const handleChannelXChanged = (channelName: string) => {
        setChannelNameX(channelName);
    };

    const handleChannelYChanged = (channelName: string) => {
        setChannelNameY(channelName);
    };

    let timeSteps: number[] | null = null;
    if (dataX && dataY) {
        const set = [...new Set(dataX.map((el: any) => el.datetime))];
        timeSteps = [...set] as number[];
        timeSteps = timeSteps.filter((el) => dataY.find((el2: any) => el2.datetime === el) !== undefined);
    }

    return (
        <>
            <Label text="Data channel X axis">
                <ChannelSelect
                    onChange={handleChannelXChanged}
                    channelFilter={{
                        datetime: BroadcastChannelDataTypes.datetime,
                        realization: BroadcastChannelDataTypes.realization,
                        value: BroadcastChannelDataTypes.value,
                    }}
                />
            </Label>
            <Label text="Data channel Y axis">
                <ChannelSelect
                    disabled={channelNameX === null}
                    onChange={handleChannelYChanged}
                    channelFilter={channelX?.getDataDef()}
                />
            </Label>
            <Label text="Timestep">
                <Dropdown
                    options={makeTimeStepsOptions(timeSteps)}
                    value={timeStep ? timeStep : undefined}
                    onChange={setTimeStep}
                />
            </Label>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function fixupEnsemble(currEnsemble: Ensemble | null, availableEnsemblesArr: Ensemble[] | null): Ensemble | null {
    if (!availableEnsemblesArr || availableEnsemblesArr.length === 0) {
        return null;
    }

    if (currEnsemble) {
        const foundItem = availableEnsemblesArr.find(
            (item) => item.caseUuid === currEnsemble.caseUuid && item.ensembleName == currEnsemble.ensembleName
        );
        if (foundItem) {
            return foundItem;
        }
    }

    return availableEnsemblesArr[0];
}

function encodeEnsembleAsIdStr(ensemble: Ensemble): string {
    return `${ensemble.caseUuid}::${ensemble.ensembleName}`;
}

function makeEnsembleOptionItems(ensemblesArr: Ensemble[] | null): DropdownOption[] {
    const itemArr: DropdownOption[] = [];
    if (ensemblesArr) {
        for (const ens of ensemblesArr) {
            itemArr.push({ value: encodeEnsembleAsIdStr(ens), label: `${ens.ensembleName} (${ens.caseName})` });
        }
    }
    return itemArr;
}

function isValidVectorName(vectorName: string, vectorDescriptionsArr: VectorDescription[] | undefined): boolean {
    if (!vectorName || !vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return false;
    }

    if (vectorDescriptionsArr.find((item) => item.name === vectorName)) {
        return true;
    }

    return false;
}

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (isValidVectorName(currVectorName, vectorDescriptionsArr)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
        }
    }
    return itemArr;
}

function makeParameterNamesOptionItems(parameters: EnsembleParameterDescription[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (parameters) {
        for (const parameter of parameters) {
            itemArr.push({ value: parameter.name, label: parameter.name });
        }
    }
    return itemArr;
}

function makeTimeStepsOptions(timesteps: number[] | null): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (timesteps) {
        for (const timestep of timesteps) {
            itemArr.push({ value: `${timestep}`, label: new Date(timestep).toUTCString() });
        }
    }
    return itemArr;
}
