import type { InplaceVolumetricResultName_api } from "@api";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ChannelIds } from "@modules/InplaceVolumetricsPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumetricsPlot/interfaces";
import type { Table } from "@modules/_shared/InplaceVolumetrics/Table";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

function makeDataGeneratorFunc(
    ensembleName: string,
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    fluidZone: string,
    table: Table,
    resultName: string
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
    table?: Table,
    resultName?: InplaceVolumetricResultName_api
) {
    const contents: ChannelContentDefinition[] = [];

    if (table && resultName) {
        const ensembleCollection = table.splitByColumn(SourceIdentifier.ENSEMBLE);
        for (const [ensembleIdentStr, ensembleTable] of ensembleCollection.getCollectionMap()) {
            const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr.toString());
            const ensembleName = makeDistinguishableEnsembleDisplayName(
                ensembleIdent,
                ensembleSet.getRegularEnsembleArray()
            );

            const tableCollection = ensembleTable.splitByColumn(SourceIdentifier.TABLE_NAME);
            for (const [tableName, table] of tableCollection.getCollectionMap()) {
                const fluidZoneCollection = table.splitByColumn(SourceIdentifier.FLUID_ZONE);
                for (const [fluidZone, fluidZoneTable] of fluidZoneCollection.getCollectionMap()) {
                    const dataGenerator = makeDataGeneratorFunc(
                        ensembleName,
                        ensembleIdent,
                        tableName.toString(),
                        fluidZone.toString(),
                        fluidZoneTable,
                        resultName
                    );
                    contents.push({
                        contentIdString: `${fluidZone}-${tableName}-${ensembleIdentStr}`,
                        displayName: `${resultName} (${ensembleName}, ${tableName}, ${fluidZone})`,
                        dataGenerator,
                    });
                }
            }
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [table, resultName],
        enabled: Boolean(table && resultName),
        contents,
    });
}
