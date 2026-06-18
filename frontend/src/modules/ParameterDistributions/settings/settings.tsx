import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile/ensembleColorTile";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsembleIdent as RegularEnsembleIdentClass } from "@framework/RegularEnsembleIdent";
import { isEnsembleRealizationFilterEffective } from "@framework/utils/realizationFilterUtils";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { Hidden } from "@lib/newComponents/Hidden";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";
import {
    EnsembleMode,
    EnsembleModeEnumToStringMapping,
    HistogramModeEnumToStringMapping,
    ParameterDistributionPlotType,
    ParameterDistributionPlotTypeEnumToStringMapping,
    ParameterDistributionSortingMethodEnumToStringMapping,
    HistogramMode,
} from "../typesAndEnums";
import { ParameterSortMethod } from "../view/utils/parameterSorting";

import {
    histogramModeAtom,
    selectedVisualizationTypeAtom,
    showConstantParametersAtom,
    showIndividualRealizationValuesAtom,
    showLogParametersAtom,
    showNumericDiscreteParametersAtom,
    showPercentilesAndMeanLinesAtom,
    selectedEnsembleModeAtom,
} from "./atoms/baseAtoms";
import { intersectedParameterIdentsAtom } from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
    selectedParameterSortingMethodAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./atoms/persistableFixableAtoms";
import { ParameterSortingInfoContent } from "./components/ParameterSortingInfoContent";

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [selectedParameterIdents, setSelectedParameterIdents] = useAtom(selectedParameterIdentsAtom);
    const [showConstantParameters, setShowConstantParameters] = useAtom(showConstantParametersAtom);
    const [showLogParameters, setShowLogParameters] = useAtom(showLogParametersAtom);
    const [showNumericDiscreteParameters, setShowNumericDiscreteParameters] = useAtom(
        showNumericDiscreteParametersAtom,
    );
    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(selectedVisualizationTypeAtom);
    const [selectedEnsembleMode, setSelectedEnsembleMode] = useAtom(selectedEnsembleModeAtom);
    const [showIndividualRealizationValues, setShowIndividualRealizationValues] = useAtom(
        showIndividualRealizationValuesAtom,
    );
    const [selectedParameterSortingMethod, setSelectedParameterSortingMethod] = useAtom(
        selectedParameterSortingMethodAtom,
    );

    const [showPercentilesAndMeanLines, setShowPercentilesAndMeanLines] = useAtom(showPercentilesAndMeanLinesAtom);
    const [histogramMode, setHistogramMode] = useAtom(histogramModeAtom);
    const [selectedPriorEnsembleIdent, setSelectedPriorEnsembleIdent] = useAtom(selectedPriorEnsembleIdentAtom);
    const [selectedPosteriorEnsembleIdent, setSelectedPosteriorEnsembleIdent] = useAtom(
        selectedPosteriorEnsembleIdentAtom,
    );
    const intersectedParameterIdents = useAtomValue(intersectedParameterIdentsAtom);

    const regularEnsembleArray = ensembleSet.getRegularEnsembleArray();

    function renderEnsembleAdornment(identStr: string) {
        const ensemble = regularEnsembleArray.find((ens) => ens.getIdent().toString() === identStr) ?? null;
        if (!ensemble) {
            return null;
        }
        return (
            <EnsembleColorTile
                ensemble={ensemble}
                isRealizationFilterEffective={isEnsembleRealizationFilterEffective(
                    ensemble,
                    filterEnsembleRealizationsFunc,
                )}
            />
        );
    }

    const hasMultipleRegularEnsembles = regularEnsembleArray.length > 1;

    const ensembleComboItems = regularEnsembleArray.map((ens) => ({
        value: ens.getIdent().toString(),
        label: ens.getDisplayName(),
    }));

    const selectedParameterSortingMethodAnnotation = useMakePersistableFixableAtomAnnotations(
        selectedParameterSortingMethodAtom,
    );
    const selectedEnsembleIdentsAnnotation = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentsAtom);
    const selectedPriorEnsembleIdentAnnotation =
        useMakePersistableFixableAtomAnnotations(selectedPriorEnsembleIdentAtom);
    const selectedPosteriorEnsembleIdentAnnotation = useMakePersistableFixableAtomAnnotations(
        selectedPosteriorEnsembleIdentAtom,
    );
    const selectedParameterIdentsAnnotation = useMakePersistableFixableAtomAnnotations(selectedParameterIdentsAtom);

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Data" defaultOpen>
                    <SettingWrapper label="Analysis mode">
                        <Combobox
                            items={Object.values(EnsembleMode).map((type: EnsembleMode) => ({
                                value: type,
                                label: EnsembleModeEnumToStringMapping[type],
                                disabled: !hasMultipleRegularEnsembles && type === EnsembleMode.PRIOR_POSTERIOR,
                            }))}
                            value={selectedEnsembleMode}
                            onValueChange={(v) => v && setSelectedEnsembleMode(v)}
                        />
                    </SettingWrapper>
                    <Hidden hidden={selectedEnsembleMode !== EnsembleMode.INDEPENDENT}>
                        <SettingWrapper
                            label="Selected ensembles"
                            annotations={selectedEnsembleIdentsAnnotation}
                            stacked
                        >
                            <EnsemblePicker
                                ensembles={regularEnsembleArray}
                                ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                value={selectedEnsembleIdents.value ?? []}
                                onValueChange={setSelectedEnsembleIdents}
                            />
                        </SettingWrapper>
                    </Hidden>
                    <Hidden hidden={selectedEnsembleMode !== EnsembleMode.PRIOR_POSTERIOR}>
                        <SettingWrapper label="Prior ensemble" annotations={selectedPriorEnsembleIdentAnnotation}>
                            <Combobox
                                items={ensembleComboItems}
                                value={selectedPriorEnsembleIdent.value?.toString() ?? null}
                                placeholder="Select prior ensemble"
                                renderItemAdornment={renderEnsembleAdornment}
                                onValueChange={(identStr) =>
                                    setSelectedPriorEnsembleIdent(
                                        identStr ? RegularEnsembleIdentClass.fromString(identStr) : null,
                                    )
                                }
                            />
                        </SettingWrapper>
                    </Hidden>
                    <Hidden hidden={selectedEnsembleMode !== EnsembleMode.PRIOR_POSTERIOR}>
                        <SettingWrapper
                            label="Posterior ensemble"
                            annotations={selectedPosteriorEnsembleIdentAnnotation}
                        >
                            <Combobox
                                items={ensembleComboItems}
                                value={selectedPosteriorEnsembleIdent.value?.toString() ?? null}
                                placeholder="Select posterior ensemble"
                                renderItemAdornment={renderEnsembleAdornment}
                                onValueChange={(identStr) =>
                                    setSelectedPosteriorEnsembleIdent(
                                        identStr ? RegularEnsembleIdentClass.fromString(identStr) : null,
                                    )
                                }
                            />
                        </SettingWrapper>
                    </Hidden>
                    <SettingWrapper
                        label="Parameter sort method"
                        annotations={selectedParameterSortingMethodAnnotation}
                        help={{
                            title: "Parameter Sorting Methods",
                            content: <ParameterSortingInfoContent />,
                        }}
                    >
                        <Combobox
                            items={Object.values(ParameterSortMethod).map((type: ParameterSortMethod) => ({
                                value: type,
                                label: ParameterDistributionSortingMethodEnumToStringMapping[type],
                                disabled:
                                    selectedEnsembleMode === EnsembleMode.INDEPENDENT &&
                                    type !== ParameterSortMethod.ALPHABETICAL,
                            }))}
                            value={selectedParameterSortingMethod.value}
                            onValueChange={(v) => v && setSelectedParameterSortingMethod(v)}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Selections" defaultOpen>
                    <SettingWrapper
                        label="Parameter options"
                        stacked
                        help={{
                            title: "Show discrete parameters",
                            content: (
                                <>
                                    Includes parameters tagged as discrete in the available parameter list.
                                    <br />A parameter is tagged as discrete when it comes from a non-continuous ERT
                                    distribution such as <b>DUNIF</b>, <b>DERRF</b>, or <b>RAW</b>.
                                    <br />
                                    See{" "}
                                    <a
                                        href="https://ert.readthedocs.io/en/latest/reference/configuration/data_types.html"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 underline"
                                    >
                                        the ERT data types documentation
                                    </a>
                                    .
                                    <br />
                                    In this plot, only numeric discrete parameters are included. String-based discrete
                                    parameters are still excluded.
                                </>
                            ),
                        }}
                    >
                        <React.Fragment>
                            <CheckboxCompositions.WithLabel
                                label="Show nonvarying parameters"
                                checked={showConstantParameters}
                                onCheckedChange={setShowConstantParameters}
                                size="small"
                            />

                            <CheckboxCompositions.WithLabel
                                label="Show LOG parameters"
                                checked={showLogParameters}
                                onCheckedChange={setShowLogParameters}
                                size="small"
                            />

                            <CheckboxCompositions.WithLabel
                                label="Show discrete parameters"
                                checked={showNumericDiscreteParameters}
                                onCheckedChange={setShowNumericDiscreteParameters}
                                size="small"
                            />
                        </React.Fragment>
                    </SettingWrapper>

                    <SettingWrapper annotations={selectedParameterIdentsAnnotation} stacked>
                        <ParametersSelector
                            allParameterIdents={intersectedParameterIdents}
                            selectedParameterIdents={selectedParameterIdents.value ?? []}
                            onChange={setSelectedParameterIdents}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Plot" defaultOpen>
                    <SettingWrapper label="Plot type">
                        <Combobox
                            items={Object.values(ParameterDistributionPlotType).map(
                                (type: ParameterDistributionPlotType) => ({
                                    value: type,
                                    label: ParameterDistributionPlotTypeEnumToStringMapping[type],
                                }),
                            )}
                            value={selectedVisualizationType}
                            onValueChange={(v) => v && setSelectedVisualizationType(v)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Histogram mode">
                        <Combobox
                            items={Object.values(HistogramMode).map((mode: HistogramMode) => ({
                                value: mode,
                                label: HistogramModeEnumToStringMapping[mode],
                            }))}
                            value={histogramMode}
                            disabled={selectedVisualizationType !== ParameterDistributionPlotType.HISTOGRAM}
                            onValueChange={(v) => v && setHistogramMode(v)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Additional markers" stacked>
                        <CheckboxCompositions.WithLabel
                            label="Show individual realization values"
                            disabled={selectedVisualizationType === ParameterDistributionPlotType.HISTOGRAM}
                            checked={showIndividualRealizationValues}
                            onCheckedChange={setShowIndividualRealizationValues}
                            size="small"
                        />
                        <CheckboxCompositions.WithLabel
                            label="Show markers for P10, Mean, P90"
                            checked={showPercentilesAndMeanLines}
                            onCheckedChange={setShowPercentilesAndMeanLines}
                            size="small"
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
