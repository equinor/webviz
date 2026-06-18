import React from "react";

import { useAtom, useSetAtom } from "jotai";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ModuleSettingsProps } from "@framework/Module";
import { KeyKind } from "@framework/types/dataChannnel";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { ContentWarning } from "@modules/_shared/components/ContentMessage";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
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

    const isChartSettingsDisabled = displayComponentType !== DisplayComponentType.SENSITIVITY_CHART;
    const chartSettingsInfoAnnotation = isChartSettingsDisabled
        ? "Only available when the plot type is sensitivity chart."
        : undefined;

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
                            onValueChange={(value) => value && setDisplayComponentType(value)}
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
                            onValueChange={(value) => value && setSensitivityScaling(value)}
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
                            onValueChange={(value) => value && setSensitivitySortBy(value)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Data filtering">
                        <CheckboxCompositions.WithLabel
                            label="Hide sensitivities without impact"
                            checked={hideZeroY}
                            onCheckedChange={setHideZeroY}
                            size="small"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Color by" infoAnnotation={chartSettingsInfoAnnotation}>
                        <Combobox<ColorBy>
                            disabled={isChartSettingsDisabled}
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
                            onValueChange={(value) => value && setColorBy(value)}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Chart options"
                        stacked
                        infoAnnotation={chartSettingsInfoAnnotation}
                        help={{
                            title: "Show mean points",
                            content: (
                                <>
                                    Shows one marker per Monte Carlo sensitivity at the mean response value across all
                                    realizations in the sensitivity. Scenario sensitivities do not get mean points
                                    because their low and high case averages are shown separately.
                                </>
                            ),
                        }}
                    >
                        <div className="gap-vertical-xs flex flex-col">
                            <CheckboxCompositions.WithLabel
                                disabled={isChartSettingsDisabled}
                                label="Show realization points"
                                checked={showRealizationPoints}
                                onCheckedChange={setShowRealizationPoints}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                disabled={isChartSettingsDisabled}
                                label="Show labels"
                                checked={showLabels}
                                onCheckedChange={setShowLabels}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                disabled={isChartSettingsDisabled}
                                label="Show mean points"
                                checked={showSensitivityMeanPoints}
                                onCheckedChange={setShowSensitivityMeanPoints}
                                size="small"
                            />
                        </div>
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
