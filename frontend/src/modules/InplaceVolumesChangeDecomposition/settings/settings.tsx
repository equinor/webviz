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
import { Setting } from "@lib/components/Setting";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";

import {
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedReferenceEnsembleIdentAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNameAtom,
} from "./atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    availableIndicesWithValuesAtom,
    availableResultNamesAtom,
    availableTableNamesAtom,
    isEnsemblePairValidAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
    selectedTableNameAtom,
    waterfallFactorSpecAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

const NO_SUBPLOT_VALUE = "__none__";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const tableDefinitionsQuery = useAtomValue(tableDefinitionsQueryAtom);

    const [referenceEnsembleIdent, setReferenceEnsembleIdent] = useAtom(userSelectedReferenceEnsembleIdentAtom);
    const [comparisonEnsembleIdent, setComparisonEnsembleIdent] = useAtom(userSelectedComparisonEnsembleIdentAtom);
    const [, setUserSelectedTableName] = useAtom(userSelectedTableNameAtom);
    const [, setUserSelectedResultName] = useAtom(userSelectedResultNameAtom);
    const [, setUserSelectedSubplotBy] = useAtom(userSelectedSubplotByAtom);
    const [, setUserSelectedIndicesWithValues] = useAtom(userSelectedIndicesWithValuesAtom);

    const availableTableNames = useAtomValue(availableTableNamesAtom);
    const availableResultNames = useAtomValue(availableResultNamesAtom);
    const availableIndicesWithValues = useAtomValue(availableIndicesWithValuesAtom);
    const selectedTableName = useAtomValue(selectedTableNameAtom);
    const selectedResultName = useAtomValue(selectedResultNameAtom);
    const selectedSubplotBy = useAtomValue(selectedSubplotByAtom);
    const selectedIndicesWithValues = useAtomValue(selectedIndicesWithValuesAtom);
    const isEnsemblePairValid = useAtomValue(isEnsemblePairValidAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const waterfallFactorSpec = useAtomValue(waterfallFactorSpecAtom);

    const isSameEnsembleSelectedTwice = Boolean(
        referenceEnsembleIdent && comparisonEnsembleIdent && referenceEnsembleIdent.equals(comparisonEnsembleIdent),
    );

    if (isEnsemblePairValid && !areSelectedTablesComparable) {
        statusWriter.addWarning("The selected tables are not comparable across the two ensembles.");
    }

    const tableNameOptions: ComboboxItem<string>[] = availableTableNames.map((name) => ({ label: name, value: name }));

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
        const newIndicesWithValues = selectedIndicesWithValues.map((index) =>
            index.indexColumn === indexColumn ? { indexColumn, values } : index,
        );
        setUserSelectedIndicesWithValues(newIndicesWithValues);
    }

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Ensembles" defaultOpen>
                    <Setting.Field
                        label="Reference"
                        description="Baseline the change is measured from."
                        help={{
                            title: "Reference and comparison",
                            content: (
                                <>
                                    The change is decomposed as <b>comparison &minus; reference</b>, the same convention
                                    delta ensembles use.
                                    <br />
                                    <br />
                                    The two ensembles are selected separately here rather than as a delta ensemble,
                                    because the decomposition works on per-ensemble means and so does not require the
                                    two to share realization numbering.
                                </>
                            ),
                        }}
                        errorAnnotation={isSameEnsembleSelectedTwice ? "Must differ from the comparison" : undefined}
                    >
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={referenceEnsembleIdent}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={setReferenceEnsembleIdent}
                        />
                    </Setting.Field>
                    <Setting.Field label="Comparison" description="Ensemble the change is measured to.">
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={comparisonEnsembleIdent}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={setComparisonEnsembleIdent}
                        />
                    </Setting.Field>
                </Setting.Section>

                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field
                        label="Table source"
                        loadingOverlay={tableDefinitionsQuery.isLoading}
                        errorOverlay={
                            !tableDefinitionsQuery.isLoading && isEnsemblePairValid && tableNameOptions.length === 0
                                ? "No table names shared by the two ensembles."
                                : undefined
                        }
                    >
                        <Combobox
                            value={selectedTableName}
                            items={tableNameOptions}
                            onValueChange={(v) => setUserSelectedTableName(v)}
                        />
                    </Setting.Field>

                    <Setting.Field
                        label="Response"
                        errorOverlay={
                            !tableDefinitionsQuery.isLoading && isEnsemblePairValid && resultNameOptions.length === 0
                                ? "Neither STOIIP nor GIIP is available for the selected table."
                                : undefined
                        }
                    >
                        <Combobox
                            value={selectedResultName}
                            items={resultNameOptions}
                            onValueChange={(v) => setUserSelectedResultName(v)}
                        />
                    </Setting.Field>

                    <Setting.Field label="Subplot by">
                        <Combobox
                            value={selectedSubplotBy ?? NO_SUBPLOT_VALUE}
                            items={subplotByOptions}
                            onValueChange={(v) => setUserSelectedSubplotBy(v === NO_SUBPLOT_VALUE ? null : v)}
                        />
                    </Setting.Field>

                    {selectedResultName !== null && waterfallFactorSpec === null && (
                        <Banner tone="warning">
                            <strong>Note:</strong> {selectedResultName} cannot be decomposed for the selected table. The
                            factor columns (BULK, PORO or NTG+PORO_NET, SW, BO/BG) must all be available.
                        </Banner>
                    )}
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
                                    selectedIndicesWithValues.find(
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
