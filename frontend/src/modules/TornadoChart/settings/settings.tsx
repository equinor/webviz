import React from "react";

import { useAtom, useSetAtom } from "jotai";

import { KeyKind } from "@framework/DataChannelTypes";
import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { SensitivitySortOrder } from "../../_shared/SensitivityProcessing/types";
import type { Interfaces } from "../interfaces";
import { DisplayComponentType, XAxisBarScaling } from "../typesAndEnums";
import { ColorBy } from "../view/components/sensitivityChartFigure";

import {
    barSortOrderAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
    xAxisBarScalingAtom,
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
    const [barSortOrder, setBarSortOrder] = useAtom(barSortOrderAtom);
    const [xAxisBarScaling, setXAxisBarScaling] = useAtom(xAxisBarScalingAtom);
    const [referenceSensitivityName, setReferenceSensitivityName] = React.useState<string | null>(null);
    const [colorBy, setColorBy] = useAtom(colorByAtom);
    useApplyInitialSettingsToState(initialSettings, "displayComponentType", "string", setDisplayComponentType);

    const ensembleSet = workbenchSession.getEnsembleSet();

    React.useEffect(
        function propogateReferenceSensitivityName() {
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
            if (typeof ensembleIdentString === "string") {
                try {
                    const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
                    const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                    if (ensemble) {
                        sensitivityNames.push(
                            ...(ensemble
                                .getSensitivities()
                                ?.getSensitivityArr()
                                .map((el) => el.name) ?? []),
                        );
                    }
                } catch (e) {
                    console.error(e);
                }
            }
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

    function handleDisplayComponentChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setDisplayComponentType(value as DisplayComponentType);
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

    function handleBarSortOrderChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setBarSortOrder(value as SensitivitySortOrder);
    }
    function handleXAxisBarScalingChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setXAxisBarScaling(value as XAxisBarScaling);
    }
    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setColorBy(value as ColorBy);
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
            <CollapsibleGroup title="View component" expanded>
                <RadioGroup
                    value={displayComponentType}
                    options={[
                        {
                            label: "Tornado chart",
                            value: DisplayComponentType.TornadoChart,
                        },
                        {
                            label: "Table",
                            value: DisplayComponentType.Table,
                        },
                    ]}
                    onChange={handleDisplayComponentChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="View settings" expanded>
                <div className="flex flex-col gap-4">
                    <Label text="Scaling">
                        <RadioGroup
                            value={xAxisBarScaling}
                            options={[
                                {
                                    label: "Relative",
                                    value: XAxisBarScaling.RELATIVE,
                                },
                                {
                                    label: "Relative %",
                                    value: XAxisBarScaling.RELATIVE_PERCENTAGE,
                                },
                                {
                                    label: "Absolute",
                                    value: XAxisBarScaling.ABSOLUTE,
                                },
                            ]}
                            onChange={handleXAxisBarScalingChange}
                        />
                    </Label>
                    <Label text="Color by">
                        <RadioGroup
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
                            onChange={handleColorByChange}
                        />
                    </Label>

                    <Label text="Bar sort order">
                        <RadioGroup
                            value={barSortOrder}
                            options={[
                                {
                                    label: "Impact",
                                    value: SensitivitySortOrder.IMPACT,
                                },
                                {
                                    label: "Alphabetical",
                                    value: SensitivitySortOrder.ALPHABETICAL,
                                },
                            ]}
                            onChange={handleBarSortOrderChange}
                        />
                    </Label>
                    <Checkbox
                        checked={hideZeroY}
                        onChange={handleHideZeroYChange}
                        label="Show sensitivities without impact"
                    />
                    <Checkbox
                        checked={showLabels}
                        onChange={handleShowLabelsChange}
                        disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        label="Show labels"
                    />
                    <Checkbox
                        checked={showRealizationPoints}
                        onChange={handleShowRealizationPointsChange}
                        disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        label="Show realization points"
                    />
                </div>
            </CollapsibleGroup>
        </div>
    );
}
