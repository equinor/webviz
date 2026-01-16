import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { ChannelIds } from "@modules/InplaceVolumesNew/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import { colorByAtom, firstResultNameAtom, plotTypeAtom, subplotByAtom } from "../atoms/baseAtoms";

const STANDARD_ORIGIN_KEYS = [TableOriginKey.ENSEMBLE, TableOriginKey.TABLE_NAME, TableOriginKey.FLUID];

interface ContentContext {
    ensembleName: string;
    ensembleIdent: RegularEnsembleIdent;
    ensembleIdentStr: string | number;
    tableName: string | number;
    fluidZone: string | number;
    resultName: string;
    subplotByValue?: string | number;
    colorByValue?: string | number;
}

function buildContentIdString(ctx: ContentContext): string {
    const parts = [ctx.fluidZone, ctx.tableName, ctx.ensembleIdentStr];
    if (ctx.subplotByValue !== undefined) parts.push(ctx.subplotByValue);
    if (ctx.colorByValue !== undefined) parts.push(ctx.colorByValue);
    return parts.join("-");
}

function buildDisplayName(ctx: ContentContext): string {
    const baseParts = [ctx.ensembleName, ctx.tableName, ctx.fluidZone];
    const extraParts: (string | number)[] = [];
    if (ctx.subplotByValue !== undefined) extraParts.push(ctx.subplotByValue);
    if (ctx.colorByValue !== undefined) extraParts.push(ctx.colorByValue);

    const allParts = [...baseParts, ...extraParts].join(", ");
    return `${ctx.resultName} (${allParts})`;
}

function makeResultRealizationDataGenerator(table: Table, ctx: ContentContext, preferredColor?: string): DataGenerator {
    return () => {
        const realColumn = table.getColumn("REAL");
        const resultColumn = table.getColumn(ctx.resultName);

        if (!realColumn || !resultColumn) {
            throw new Error("REAL and result columns must be present");
        }

        const data: { key: number; value: number }[] = [];
        for (let row = 0; row < realColumn.getNumRows(); row++) {
            const key = parseFloat(realColumn.getRowValue(row).toString());
            const value = parseFloat(resultColumn.getRowValue(row).toString());
            data.push({ key, value });
        }

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: ctx.ensembleIdent.toString(),
            displayString: buildDisplayName(ctx),
            preferredColor,
        };

        return { data, metaData };
    };
}

function getColorKey(
    colorBy: string,
    ensembleIdentStr: string | number,
    tableName: string | number,
    fluidZone: string | number,
): string | number {
    if (colorBy === TableOriginKey.TABLE_NAME) return tableName;
    if (colorBy === TableOriginKey.FLUID) return fluidZone;
    return ensembleIdentStr;
}

function createChannelContent(
    table: Table,
    ctx: ContentContext,
    colorByMap: Map<string | number, string>,
    colorBy: string,
): ChannelContentDefinition {
    const colorKey = ctx.colorByValue ?? getColorKey(colorBy, ctx.ensembleIdentStr, ctx.tableName, ctx.fluidZone);
    const determinedColor = colorByMap.get(colorKey);

    return {
        contentIdString: buildContentIdString(ctx),
        displayName: buildDisplayName(ctx),
        dataGenerator: makeResultRealizationDataGenerator(table, ctx, determinedColor),
    };
}

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    table?: Table,
) {
    const contents: ChannelContentDefinition[] = [];
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const resultName = useAtomValue(firstResultNameAtom);
    const plotType = useAtomValue(plotTypeAtom);

    if (
        !table ||
        !resultName ||
        !table.getColumn("REAL") ||
        !table.getColumn(resultName) ||
        plotType === PlotType.BAR
    ) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet],
            enabled: Boolean(table && resultName),
            contents,
        });
        return;
    }

    const colorByMap = createColumnValuesToColorMap(table, ensembleSet, colorBy, colorSet);
    const isStandardSubplotBy = STANDARD_ORIGIN_KEYS.includes(subplotBy as TableOriginKey);
    const isStandardColorBy = STANDARD_ORIGIN_KEYS.includes(colorBy as TableOriginKey);

    for (const [ensembleIdentStr, ensembleTable] of table.splitByColumn(TableOriginKey.ENSEMBLE).getCollectionMap()) {
        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
        const ensembleName = makeDistinguishableEnsembleDisplayName(
            ensembleIdent,
            ensembleSet.getRegularEnsembleArray(),
        );

        for (const [tableName, tableForTableName] of ensembleTable
            .splitByColumn(TableOriginKey.TABLE_NAME)
            .getCollectionMap()) {
            for (const [fluidZone, fluidZoneTable] of tableForTableName
                .splitByColumn(TableOriginKey.FLUID)
                .getCollectionMap()) {
                const baseCtx: Omit<ContentContext, "subplotByValue" | "colorByValue"> = {
                    ensembleName,
                    ensembleIdent,
                    ensembleIdentStr,
                    tableName,
                    fluidZone,
                    resultName,
                };

                const tablesToProcess = isStandardSubplotBy
                    ? [{ table: fluidZoneTable, subplotByValue: undefined }]
                    : Array.from(fluidZoneTable.splitByColumn(subplotBy).getCollectionMap()).map(
                          ([subplotValue, subplotTable]) => ({ table: subplotTable, subplotByValue: subplotValue }),
                      );

                for (const { table: currentTable, subplotByValue } of tablesToProcess) {
                    const colorEntries = isStandardColorBy
                        ? [{ table: currentTable, colorByValue: undefined }]
                        : Array.from(currentTable.splitByColumn(colorBy).getCollectionMap()).map(
                              ([colorValue, colorTable]) => ({ table: colorTable, colorByValue: colorValue }),
                          );

                    for (const { table: finalTable, colorByValue } of colorEntries) {
                        const ctx: ContentContext = { ...baseCtx, subplotByValue, colorByValue };
                        contents.push(createChannelContent(finalTable, ctx, colorByMap, colorBy));
                    }
                }
            }
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [table, ensembleSet, resultName, colorBy, colorSet],
        enabled: Boolean(table && resultName),
        contents,
    });
}

function createColumnValuesToColorMap(
    table: Table,
    ensembleSet: EnsembleSet,
    colorBy: string,
    colorSet: ColorSet,
): Map<string | number, string> {
    const colorByMap = new Map<string | number, string>();
    const colorByColumn = table.getColumn(colorBy);

    if (!colorByColumn) {
        return colorByMap;
    }

    const collectionToColor = table.splitByColumn(colorBy);
    let currentBaseColorFromSet = colorSet.getFirstColor();

    for (const [keyOfColorByItem] of collectionToColor.getCollectionMap()) {
        let effectiveColor = currentBaseColorFromSet;

        if (colorBy === TableOriginKey.ENSEMBLE) {
            const currentEnsembleIdent = RegularEnsembleIdent.fromString(keyOfColorByItem.toString());
            const ensemble = ensembleSet.findEnsemble(currentEnsembleIdent);
            const ensembleSpecificColor = ensemble?.getColor();

            if (ensembleSpecificColor !== undefined) {
                effectiveColor = ensembleSpecificColor;
            }
        }

        colorByMap.set(keyOfColorByItem, effectiveColor);
        currentBaseColorFromSet = colorSet.getNextColor();
    }

    return colorByMap;
}
