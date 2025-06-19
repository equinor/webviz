import type { InplaceVolumetricResultName_api } from "@api";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumetrics/Table";
import type { SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumetricsPlot/interfaces";

function makeDataGeneratorFunc(
    ensembleName: string,
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    fluidZone: string,
    table: Table,
    resultName: string,
    color?: string,
): DataGenerator {
    return () => {
        const realColumn = table.getColumn("REAL");
        const resultColumn = table.getColumn(resultName);

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
            ensembleIdentString: ensembleIdent.toString(),
            displayString: `${resultName} (${ensembleName}, ${tableName}, ${fluidZone})`,
            preferredColor: color,
        };

        return {
            data,
            metaData,
        };
    };
}

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    colorBy: SourceAndTableIdentifierUnion,
    table?: Table,
    resultName?: InplaceVolumetricResultName_api,
) {
    const contents: ChannelContentDefinition[] = [];

    if (table && resultName) {
        const colorByMap = new Map<string | number, string>();
        const colorByColumnExists = table.getColumn(colorBy);
        if (colorByColumnExists) {
            const collectionToColor = table.splitByColumn(colorBy);
            let currentBaseColorFromSet = colorSet.getFirstColor();

            for (const [keyOfColorByItem] of collectionToColor.getCollectionMap()) {
                let effectiveColor = currentBaseColorFromSet;

                if (colorBy === SourceIdentifier.ENSEMBLE) {
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
        }
        const ensembleCollection = table.splitByColumn(SourceIdentifier.ENSEMBLE);
        for (const [ensembleIdentStr, ensembleTable] of ensembleCollection.getCollectionMap()) {
            const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
            const ensembleName = makeDistinguishableEnsembleDisplayName(
                ensembleIdent,
                ensembleSet.getRegularEnsembleArray(),
            );

            const tableCollection = ensembleTable.splitByColumn(SourceIdentifier.TABLE_NAME);
            for (const [tableNameStr, tableForFluidZone] of tableCollection.getCollectionMap()) {
                const fluidZoneCollection = tableForFluidZone.splitByColumn(SourceIdentifier.FLUID_ZONE);
                for (const [fluidZoneStr, fluidZoneTable] of fluidZoneCollection.getCollectionMap()) {
                    let keyForColorLookup: string | number = ensembleIdentStr;

                    if (colorBy === SourceIdentifier.TABLE_NAME) {
                        keyForColorLookup = tableNameStr;
                    } else if (colorBy === SourceIdentifier.FLUID_ZONE) {
                        keyForColorLookup = fluidZoneStr;
                    }
                    const determinedColor = colorByMap.get(keyForColorLookup);

                    const dataGenerator = makeDataGeneratorFunc(
                        ensembleName,
                        ensembleIdent,
                        tableNameStr.toString(),
                        fluidZoneStr.toString(),
                        fluidZoneTable,
                        resultName,
                        determinedColor,
                    );

                    contents.push({
                        contentIdString: `${fluidZoneStr}-${tableNameStr}-${ensembleIdentStr}`,
                        displayName: `${resultName} (${ensembleName}, ${tableNameStr}, ${fluidZoneStr})`,
                        dataGenerator,
                    });
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
