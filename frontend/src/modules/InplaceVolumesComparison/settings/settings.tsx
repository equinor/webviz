import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Banner } from "@lib/components/Banner";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { Select } from "@lib/components/Select";
import type { SettingAnnotation } from "@lib/components/Setting";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";
import { FLUID_INDEX_COLUMN } from "../view/utils/computeVolumeChangeDecomposition";

import { showTableAtom } from "./atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    availableComparisonTableNamesAtom,
    availableIndicesWithValuesAtom,
    availableReferenceTableNamesAtom,
    availableResultNamesAtom,
    isCrossTableComparisonAtom,
    isSingleEnsembleComparisonAtom,
    waterfallFactorSpecAtom,
} from "./atoms/derivedAtoms";
import {
    selectedComparisonEnsembleIdentAtom,
    selectedComparisonTableNameAtom,
    selectedIndicesWithValuesAtom,
    selectedReferenceEnsembleIdentAtom,
    selectedReferenceTableNameAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
} from "./atoms/persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

const NO_SUBPLOT_VALUE = "__none__";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const tableDefinitionsQuery = useAtomValue(tableDefinitionsQueryAtom);

    const [referenceEnsembleIdent, setReferenceEnsembleIdent] = useAtom(selectedReferenceEnsembleIdentAtom);
    const [comparisonEnsembleIdent, setComparisonEnsembleIdent] = useAtom(selectedComparisonEnsembleIdentAtom);
    const [selectedReferenceTableName, setSelectedReferenceTableName] = useAtom(selectedReferenceTableNameAtom);
    const [selectedComparisonTableName, setSelectedComparisonTableName] = useAtom(selectedComparisonTableNameAtom);
    const [selectedResultName, setSelectedResultName] = useAtom(selectedResultNameAtom);
    const [selectedSubplotBy, setSelectedSubplotBy] = useAtom(selectedSubplotByAtom);
    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);
    const [showTable, setShowTable] = useAtom(showTableAtom);

    const availableReferenceTableNames = useAtomValue(availableReferenceTableNamesAtom);
    const availableComparisonTableNames = useAtomValue(availableComparisonTableNamesAtom);
    const availableResultNames = useAtomValue(availableResultNamesAtom);
    const availableIndicesWithValues = useAtomValue(availableIndicesWithValuesAtom);
    const areSourcesDistinct = useAtomValue(areSourcesDistinctAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const waterfallFactorSpec = useAtomValue(waterfallFactorSpecAtom);
    const isSingleEnsembleComparison = useAtomValue(isSingleEnsembleComparisonAtom);
    const isCrossTableComparison = useAtomValue(isCrossTableComparisonAtom);

    const persistedReferenceEnsembleAnnotations = useMakePersistableFixableAtomAnnotations(
        selectedReferenceEnsembleIdentAtom,
    );
    const comparisonEnsembleAnnotations = useMakePersistableFixableAtomAnnotations(selectedComparisonEnsembleIdentAtom);
    const referenceTableNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedReferenceTableNameAtom);
    const comparisonTableNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedComparisonTableNameAtom);
    const resultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedResultNameAtom);
    const subplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);

    const isSameSourceSelectedTwice = Boolean(
        referenceEnsembleIdent.value && comparisonEnsembleIdent.value && !areSourcesDistinct,
    );

    const referenceEnsembleAnnotations: SettingAnnotation[] = isSameSourceSelectedTwice
        ? [...persistedReferenceEnsembleAnnotations, { type: "error", message: "Must differ from the comparison" }]
        : persistedReferenceEnsembleAnnotations;

    if (areSourcesDistinct && !areSelectedTablesComparable) {
        statusWriter.addWarning("The selected table sources are not comparable.");
    }

    const referenceTableNameOptions: ComboboxItem<string>[] = availableReferenceTableNames.map((name) => ({
        label: name,
        value: name,
    }));
    const comparisonTableNameOptions: ComboboxItem<string>[] = availableComparisonTableNames.map((name) => ({
        label: name,
        value: name,
    }));

    const resultNameOptions: ComboboxItem<string>[] = availableResultNames.map((name) => ({
        label: name,
        value: name,
        hoverText: createHoverTextForVolume(name),
    }));

    const subplotByOptions: ComboboxItem<string>[] = [
        { label: "None (single waterfall)", value: NO_SUBPLOT_VALUE },
        ...availableIndicesWithValues.map((index) => ({ label: index.indexColumn, value: index.indexColumn })),
    ];

    function handleIndexValuesChange(indexColumn: string, values: string[]) {
        const newIndicesWithValues = selectedIndicesWithValues.value
            .filter((index) => index.indexColumn !== FLUID_INDEX_COLUMN)
            .map((index) => (index.indexColumn === indexColumn ? { indexColumn, values } : index));
        setSelectedIndicesWithValues(newIndicesWithValues);
    }

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Sources" defaultOpen>
                    <Setting.Field
                        label="Reference ensemble"
                        description="Ensemble the change is measured from."
                        help={{
                            title: "Reference and comparison",
                            content: (
                                <>
                                    The change is computed as <b>comparison &minus; reference</b>.
                                    <br />
                                    <br />
                                    The comparison works on per-ensemble means, so the two sides do not need to share
                                    realization numbering.
                                    <br />
                                    <br />
                                    Each side has its own table source, so the same ensemble can be used on both sides
                                    to compare two table sources against each other.
                                </>
                            ),
                        }}
                        annotations={referenceEnsembleAnnotations}
                    >
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={referenceEnsembleIdent.value}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={setReferenceEnsembleIdent}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Reference table"
                        loadingOverlay={tableDefinitionsQuery.isLoading}
                        annotations={referenceTableNameAnnotations}
                        errorOverlay={
                            !tableDefinitionsQuery.isLoading &&
                            referenceEnsembleIdent.value &&
                            referenceTableNameOptions.length === 0
                                ? "No inplace volumes tables in this ensemble."
                                : undefined
                        }
                    >
                        <Combobox
                            value={selectedReferenceTableName.value}
                            items={referenceTableNameOptions}
                            onValueChange={(v) => setSelectedReferenceTableName(v)}
                        />
                    </Setting.Field>

                    <Setting.Field
                        label="Comparison ensemble"
                        description="Ensemble the change is measured to."
                        annotations={comparisonEnsembleAnnotations}
                    >
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={comparisonEnsembleIdent.value}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={setComparisonEnsembleIdent}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Comparison table"
                        loadingOverlay={tableDefinitionsQuery.isLoading}
                        annotations={comparisonTableNameAnnotations}
                        errorOverlay={
                            !tableDefinitionsQuery.isLoading &&
                            comparisonEnsembleIdent.value &&
                            comparisonTableNameOptions.length === 0
                                ? "No inplace volumes tables in this ensemble."
                                : undefined
                        }
                    >
                        <Combobox
                            value={selectedComparisonTableName.value}
                            items={comparisonTableNameOptions}
                            onValueChange={(v) => setSelectedComparisonTableName(v)}
                        />
                    </Setting.Field>

                    {isCrossTableComparison && (
                        <Banner tone="warning" layoutClassName="col-span-3">
                            <strong>Comparing different table sources.</strong> Differences in BULK and PORO between
                            table sources reflect gridding and upscaling as well as any reservoir change, so the factor
                            contributions are not a like-for-like comparison.
                            {isSingleEnsembleComparison && " Both sides use the same ensemble."}
                        </Banner>
                    )}
                </Setting.Section>

                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field
                        label="Response"
                        annotations={resultNameAnnotations}
                        errorOverlay={
                            !tableDefinitionsQuery.isLoading && areSourcesDistinct && resultNameOptions.length === 0
                                ? "Neither STOIIP nor GIIP is available for the selected tables."
                                : undefined
                        }
                    >
                        <Combobox
                            value={selectedResultName.value}
                            items={resultNameOptions}
                            onValueChange={(v) => setSelectedResultName(v)}
                        />
                    </Setting.Field>

                    <Setting.Field label="Subplot by" annotations={subplotByAnnotations}>
                        <Combobox
                            value={selectedSubplotBy.value ?? NO_SUBPLOT_VALUE}
                            items={subplotByOptions}
                            onValueChange={(v) => setSelectedSubplotBy(v === NO_SUBPLOT_VALUE ? null : v)}
                        />
                    </Setting.Field>

                    {selectedResultName.value !== null && waterfallFactorSpec === null && (
                        <Banner tone="warning" layoutClassName="col-span-3">
                            <strong>Note:</strong> {selectedResultName.value} cannot be decomposed for the selected
                            table. The volume columns it is built from (BULK, PORV, HCPV) must all be available.
                        </Banner>
                    )}

                    <Setting.Field stacked>
                        <SwitchCompositions.WithLabel
                            label="Show contributions table below plot"
                            checked={showTable}
                            onCheckedChange={setShowTable}
                            size="small"
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Filters" defaultOpen>
                    {availableIndicesWithValues.map((indexWithValues) => (
                        <Setting.Field key={indexWithValues.indexColumn} label={indexWithValues.indexColumn} stacked>
                            <Select
                                options={indexWithValues.values.map((value) => ({
                                    value,
                                    label: value.toString(),
                                }))}
                                value={
                                    selectedIndicesWithValues.value.find(
                                        (index) => index.indexColumn === indexWithValues.indexColumn,
                                    )?.values ?? []
                                }
                                multiple
                                size={Math.max(Math.min(indexWithValues.values.length, 10), 3)}
                                showQuickSelectButtons
                                onValueChange={(values) => handleIndexValuesChange(indexWithValues.indexColumn, values)}
                            />
                        </Setting.Field>
                    ))}
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
