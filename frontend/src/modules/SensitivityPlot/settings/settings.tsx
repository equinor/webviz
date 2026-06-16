import React from "react";

import { useAtom, useSetAtom } from "jotai";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ModuleSettingsProps } from "@framework/Module";
import { KeyKind } from "@framework/types/dataChannnel";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { Hidden } from "@lib/newComponents/Hidden";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { ContentWarning } from "@modules/_shared/components/ContentMessage";
import { SensitivitySortBy } from "@modules/_shared/SensitivityProcessing";

import type { Interfaces } from "../interfaces";
import { DisplayComponentType, SensitivityScaling } from "../typesAndEnums";
import { ColorBy } from "../view/components/sensitivityChartFigure";

import {
    sensitivitySortByAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    showLabelsAtom,
    showSensitivityMeanPointsAtom,
    showRealizationPointsAtom,
    sensitivityScalingAtom,
    colorByAtom,
} from "./atoms/baseAtoms";

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const [displayComponentType, setDisplayComponentType] = useAtom(displayComponentTypeAtom);
    const [hideZeroY, setHideZeroY] = useAtom(hideZeroYAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    const [showSensitivityMeanPoints, setShowSensitivityMeanPoints] = useAtom(showSensitivityMeanPointsAtom);
    const [showRealizationPoints, setShowRealizationPoints] = useAtom(showRealizationPointsAtom);
    const setModuleReferenceSensitivityName = useSetAtom(referenceSensitivityNameAtom);
    const [sensitivitySortBy, setSensitivitySortBy] = useAtom(sensitivitySortByAtom);
    const [sensitivityScaling, setSensitivityScaling] = useAtom(sensitivityScalingAtom);
    const [referenceSensitivityName, setReferenceSensitivityName] = React.useState<string | null>(null);
    const [colorBy, setColorBy] = useAtom(colorByAtom);

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

    function handleDisplayComponentTypeChange(value: DisplayComponentType | null) {
        if (value !== null) {
            setDisplayComponentType(value);
        }
    }

    function handleScalingChange(value: SensitivityScaling | null) {
        if (value !== null) {
            setSensitivityScaling(value);
        }
    }

    function handleSortByChange(value: SensitivitySortBy | null) {
        if (value !== null) {
            setSensitivitySortBy(value);
        }
    }

    function handleColorByChange(value: ColorBy | null) {
        if (value !== null) {
            setColorBy(value);
        }
    }

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Plot settings" defaultOpen>
                    <SettingWrapper label="Reference sensitivity">
                        <Combobox<string>
                            items={sensitivityNames.map((s) => ({ label: s, value: s }))}
                            value={referenceSensitivityName}
                            onValueChange={setReferenceSensitivityName}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Plot type">
                        <Combobox<DisplayComponentType>
                            items={[
                                {
                                    label: "Sensitivity chart (Tornado)",
                                    value: DisplayComponentType.SENSITIVITY_CHART,
                                },
                                {
                                    label: "Sensitivity Table",
                                    value: DisplayComponentType.SENSITIVITY_TABLE,
                                },
                            ]}
                            value={displayComponentType}
                            onValueChange={handleDisplayComponentTypeChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Scaling">
                        <Combobox<SensitivityScaling>
                            items={[
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
                            value={sensitivityScaling}
                            onValueChange={handleScalingChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Sensitivity sort order">
                        <Combobox<SensitivitySortBy>
                            items={[
                                {
                                    label: "Impact",
                                    value: SensitivitySortBy.IMPACT,
                                },
                                {
                                    label: "Alphabetical",
                                    value: SensitivitySortBy.ALPHABETICAL,
                                },
                            ]}
                            value={sensitivitySortBy}
                            onValueChange={handleSortByChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Color by">
                        <Combobox<ColorBy>
                            disabled={displayComponentType !== DisplayComponentType.SENSITIVITY_CHART}
                            items={[
                                {
                                    label: "Sensitivity",
                                    value: ColorBy.SENSITIVITY,
                                },
                                {
                                    label: "Low/High",
                                    value: ColorBy.LOW_HIGH,
                                },
                            ]}
                            value={colorBy}
                            onValueChange={handleColorByChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper>
                        <CheckboxCompositions.WithLabel
                            label="Hide sensitivities without impact"
                            checked={hideZeroY}
                            onCheckedChange={setHideZeroY}
                            size="small"
                        />
                    </SettingWrapper>
                    <SettingWrapper>
                        <CheckboxCompositions.WithLabel
                            disabled={displayComponentType !== DisplayComponentType.SENSITIVITY_CHART}
                            label="Show realization points"
                            checked={showRealizationPoints}
                            onCheckedChange={setShowRealizationPoints}
                            size="small"
                        />
                    </SettingWrapper>
                    <SettingWrapper>
                        <CheckboxCompositions.WithLabel
                            disabled={displayComponentType !== DisplayComponentType.SENSITIVITY_CHART}
                            label="Show labels"
                            checked={showLabels}
                            onCheckedChange={setShowLabels}
                            size="small"
                        />
                    </SettingWrapper>
                    {displayComponentType !== DisplayComponentType.SENSITIVITY_CHART ? null : (
                        <SettingWrapper
                            help={{
                                title: "Show mean points",
                                content: (
                                    <>
                                        Shows one marker per Monte Carlo sensitivity at the mean response value across
                                        all realizations in the sensitivity. Scenario sensitivities do not get mean
                                        points because their low and high case averages are shown separately.
                                    </>
                                ),
                            }}
                        >
                            <CheckboxCompositions.WithLabel
                                label="Show mean points"
                                checked={showSensitivityMeanPoints}
                                onCheckedChange={setShowSensitivityMeanPoints}
                                size="small"
                            />
                        </SettingWrapper>
                    )}
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
