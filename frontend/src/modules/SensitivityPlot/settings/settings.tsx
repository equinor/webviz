import React from "react";

import { useAtom, useSetAtom } from "jotai";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { KeyKind } from "@framework/types/dataChannnel";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { ContentWarning } from "@modules/_shared/components/ContentMessage";

import { SensitivitySortBy } from "../../_shared/SensitivityProcessing/types";
import type { Interfaces } from "../interfaces";
import { DisplayComponentType, SensitivityScaling } from "../typesAndEnums";
import { ColorBy } from "../view/components/sensitivityChartFigure";

import {
    sensitivitySortByAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
    sensitivityScalingAtom,
    colorByAtom,
} from "./atoms/baseAtoms";

export function Settings({
    initialSettings,
    settingsContext,
    workbenchSession,
}: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const [displayComponentType, setDisplayComponentType] = useAtom(displayComponentTypeAtom);
    const [hideZeroY, setHideZeroY] = useAtom(hideZeroYAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [showRealizationPoints, setShowRealizationPoints] = useAtom(showRealizationPointsAtom);
    const setModuleReferenceSensitivityName = useSetAtom(referenceSensitivityNameAtom);
    const [sensitivitySortBy, setSensitivitySortBy] = useAtom(sensitivitySortByAtom);
    const [sensitivityScaling, setSensitivityScaling] = useAtom(sensitivityScalingAtom);
    const [referenceSensitivityName, setReferenceSensitivityName] = React.useState<string | null>(null);
    const [colorBy, setColorBy] = useAtom(colorByAtom);
    useApplyInitialSettingsToState(initialSettings, "displayComponentType", "string", setDisplayComponentType);

    const ensembleSet = workbenchSession.getEnsembleSet();

    React.useEffect(
        function propagateReferenceSensitivityName() {
            setModuleReferenceSensitivityName(referenceSensitivityName);
        },
        [referenceSensitivityName, setModuleReferenceSensitivityName],
    );

    const responseReceiver = settingsContext.useChannelReceiver({
        receiverIdString: "response",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    const sensitivityNames: string[] = [];
    if (responseReceiver.channel) {
        if (
            responseReceiver.channel.contents.length > 0 &&
            responseReceiver.channel.contents[0].metaData.ensembleIdentString
        ) {
            const ensembleIdentString = responseReceiver.channel.contents[0].metaData.ensembleIdentString;

            const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
            if (!ensemble || ensemble instanceof DeltaEnsemble) {
                const ensembleType = !ensemble ? "Invalid" : "Delta";
                return (
                    <ContentWarning>
                        <p>{ensembleType} ensemble detected in the data channel.</p>
                        <p>Unable to compute parameter correlations.</p>
                    </ContentWarning>
                );
            }

            sensitivityNames.push(
                ...(ensemble
                    .getSensitivities()
                    ?.getSensitivityArr()
                    .map((el) => el.name) ?? []),
            );
        }
    }

    if (
        (!referenceSensitivityName || !sensitivityNames.includes(referenceSensitivityName)) &&
        sensitivityNames.length > 0
    ) {
        if (sensitivityNames.includes("rms_seed")) {
            setReferenceSensitivityName("rms_seed");
        } else if (sensitivityNames.includes("rms")) {
            setReferenceSensitivityName("rms");
        } else {
            setReferenceSensitivityName(sensitivityNames[0]);
        }
    }

    function handleHideZeroYChange(event: React.ChangeEvent<HTMLInputElement>) {
        setHideZeroY(event.target.checked);
    }

    function handleShowLabelsChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowLabels(event.target.checked);
    }

    function handleShowRealizationPointsChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowRealizationPoints(event.target.checked);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Reference sensitivity" expanded>
                <Dropdown
                    value={referenceSensitivityName ?? ""}
                    options={sensitivityNames.map((s) => ({ label: s, value: s }))}
                    onChange={setReferenceSensitivityName}
                />
            </CollapsibleGroup>

            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-4">
                    <Label text="Plot type">
                        <Dropdown
                            value={displayComponentType}
                            options={[
                                {
                                    label: "Sensitivity chart (Tornado)",
                                    value: DisplayComponentType.SENSITIVITY_CHART,
                                },
                                {
                                    label: "Sensitivity Table",
                                    value: DisplayComponentType.SENSITIVITY_TABLE,
                                },
                            ]}
                            onChange={setDisplayComponentType}
                        />
                    </Label>
                    <Label text="Scaling">
                        <Dropdown
                            value={sensitivityScaling}
                            options={[
                                {
                                    label: "Relative",
                                    value: SensitivityScaling.RELATIVE,
                                },
                                {
                                    label: "Relative %",
                                    value: SensitivityScaling.RELATIVE_PERCENTAGE,
                                },
                                {
                                    label: "Absolute",
                                    value: SensitivityScaling.ABSOLUTE,
                                },
                            ]}
                            onChange={setSensitivityScaling}
                        />
                    </Label>
                    <Label text="Sensitivity sort order">
                        <Dropdown
                            value={sensitivitySortBy}
                            options={[
                                {
                                    label: "Impact",
                                    value: SensitivitySortBy.IMPACT,
                                },
                                {
                                    label: "Alphabetical",
                                    value: SensitivitySortBy.ALPHABETICAL,
                                },
                            ]}
                            onChange={setSensitivitySortBy}
                        />
                    </Label>

                    <Checkbox
                        checked={hideZeroY}
                        onChange={handleHideZeroYChange}
                        label="Hide sensitivities without impact"
                    />
                    {displayComponentType === DisplayComponentType.SENSITIVITY_CHART && (
                        <>
                            <Checkbox
                                checked={showRealizationPoints}
                                onChange={handleShowRealizationPointsChange}
                                label="Show realization points"
                            />
                            <Checkbox checked={showLabels} onChange={handleShowLabelsChange} label="Show labels" />
                            <Label text="Color by">
                                <Dropdown
                                    value={colorBy}
                                    options={[
                                        {
                                            label: "Sensitivity",
                                            value: ColorBy.SENSITIVITY,
                                        },
                                        {
                                            label: "Low/High",
                                            value: ColorBy.LOW_HIGH,
                                        },
                                    ]}
                                    onChange={setColorBy}
                                />
                            </Label>
                        </>
                    )}
                </div>
            </CollapsibleGroup>
        </div>
    );
}
