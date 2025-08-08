import React from "react";

import { Input, Warning } from "@mui/icons-material";
import { isEqual } from "lodash";

import type { ChannelReceiverChannelContent } from "@framework/DataChannelTypes";
import { KeyKind } from "@framework/DataChannelTypes";
import { ParameterIdent } from "@framework/EnsembleParameters";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ModuleViewProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { getVaryingContinuousParameters } from "@modules/_shared/parameterUtils";
import type { ResponseData } from "@modules/_shared/rankParameter";
import type { CorrelationDataItem } from "@modules/_shared/utils/math/correlationMatrix";
import {
    createPearsonCorrelationMatrix,
    filterCorrelationMatrixByRowAndColumnThresholds,
} from "@modules/_shared/utils/math/correlationMatrix";

import type { Interfaces } from "../interfaces";
import { PlotType, type CorrelationSettings } from "../typesAndEnums";

import { ParameterCorrelationMatrixFigure } from "./utils/parameterCorrelationMatrixFigure";
import { createResponseParameterCorrelationMatrix } from "./utils/parameterCorrelationMatrixUtils";
import { useContinuousColorScale } from "@framework/WorkbenchSettings";

const MAX_NUM_PLOTS = 12;

function MaxNumberPlotsExceededMessage() {
    return (
        <ContentWarning>
            <Warning fontSize="large" className="mb-2" />
            Too many plots to display. Due to performance limitations, the number of plots is limited to {MAX_NUM_PLOTS}
            .
        </ContentWarning>
    );
}

export function View({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const [isPending, startTransition] = React.useTransition();
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberResponses, setRevNumberResponses] = React.useState<number[]>([]);
    const [prevShowLabels, setPrevShowLabels] = React.useState<boolean | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);
    const [prevParameterIdents, setPrevParameterIdents] = React.useState<ParameterIdent[]>([]);
    const [prevUseFixedColorRange, setPrevUseFixedColorRange] = React.useState<boolean>(true);
    const [prevColorScaleWithGradient, setPrevColorScaleWithGradient] = React.useState<[number, string][]>([]);
    const [prevPlotType, setPrevPlotType] = React.useState<PlotType>(PlotType.ParameterResponseMatrix);
    const [prevCorrelationSettings, setPrevCorrelationSettings] = React.useState<CorrelationSettings>({
        threshold: null as number | null,
        hideIndividualCells: true,
        filterColumns: true,
        filterRows: true,
    });

    const parameterIdents = viewContext.useSettingsToViewInterfaceValue("parameterIdents");
    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
    const useFixedColorRange = viewContext.useSettingsToViewInterfaceValue("useFixedColorRange");
    const correlationSettings = viewContext.useSettingsToViewInterfaceValue("correlationSettings");
    const ensembleSet = workbenchSession.getEnsembleSet();

    const statusWriter = useViewStatusWriter(viewContext);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const colorScaleWithGradient = useContinuousColorScale(workbenchSettings, {
        gradientType: ColorScaleGradientType.Diverging,
    }).getPlotlyColorScale();

    const receiverResponses = [
        viewContext.useChannelReceiver({
            receiverIdString: "channelResponse",
            expectedKindsOfKeys: [KeyKind.REALIZATION],
        }),
        viewContext.useChannelReceiver({
            receiverIdString: "channelResponse2",
            expectedKindsOfKeys: [KeyKind.REALIZATION],
        }),
        viewContext.useChannelReceiver({
            receiverIdString: "channelResponse3",
            expectedKindsOfKeys: [KeyKind.REALIZATION],
        }),
    ];

    statusWriter.setLoading(isPending || receiverResponses.some((r) => r.isPending));
    const receiverResponseRevisionNumbers = receiverResponses.map((response) => response.revisionNumber);
    const hasParameterIdentsChanged =
        parameterIdents.length !== prevParameterIdents.length ||
        !parameterIdents.every((ident, index) => ident.equals(prevParameterIdents[index]));
    if (
        !isEqual(receiverResponseRevisionNumbers, revNumberResponses) ||
        hasParameterIdentsChanged ||
        showLabels !== prevShowLabels ||
        wrapperDivSize !== prevSize ||
        useFixedColorRange !== prevUseFixedColorRange ||
        !isEqual(colorScaleWithGradient, prevColorScaleWithGradient) ||
        plotType !== prevPlotType ||
        !isEqual(correlationSettings, prevCorrelationSettings)
    ) {
        setRevNumberResponses(receiverResponseRevisionNumbers);

        setPrevParameterIdents(parameterIdents);
        setPrevShowLabels(showLabels);
        setPrevSize(wrapperDivSize);
        setPrevUseFixedColorRange(useFixedColorRange);
        setPrevColorScaleWithGradient(colorScaleWithGradient);
        setPrevPlotType(plotType);
        setPrevCorrelationSettings(correlationSettings);

        startTransition(function makeContent() {
            // Content when no data channels are defined
            if (receiverResponses.every((response) => !response.channel)) {
                setContent(
                    <ContentInfo>
                        <span>
                            Data channel required for use. Add a main module to the workbench and use the data channels
                            <Input fontSize="small" />
                        </span>{" "}
                        Up to 3 modules can be connected.
                        <span>
                            <Tag label="Response" />
                            <Tag label="Response" />
                            <Tag label="Response" />
                        </span>
                    </ContentInfo>,
                );
                return;
            }

            const usedChannels = receiverResponses.filter((response) => response.channel);
            const usedChannelsWithoutData = receiverResponses.filter(
                (response) => response.channel && response.channel.contents.length === 0,
            );
            // Content when no data is received on any of the channels
            if (usedChannels.length === usedChannelsWithoutData.length) {
                setContent(
                    <ContentInfo>
                        <span>No data received on any of the channels. Check relevant modules for issues.</span>
                    </ContentInfo>,
                );
                return;
            }
            // Add a warning when some channels have no data
            if (usedChannelsWithoutData.length > 0) {
                statusWriter.addWarning(
                    `Some channels have no data:) ${usedChannelsWithoutData
                        .map((response) => response.displayName)
                        .join(", ")}`,
                );
            }

            // Create a map to group responses by ensemble
            const receiveResponsesPerEnsembleIdent = new Map<
                string,
                ChannelReceiverChannelContent<KeyKind.REALIZATION[]>[]
            >();

            receiverResponses.forEach((response) => {
                if (!response.channel || !response.channel.contents) {
                    return;
                }
                response.channel.contents.forEach((content) => {
                    const ensembleIdentString = content.metaData.ensembleIdentString;
                    if (!receiveResponsesPerEnsembleIdent.has(ensembleIdentString)) {
                        receiveResponsesPerEnsembleIdent.set(ensembleIdentString, []);
                    }
                    receiveResponsesPerEnsembleIdent.get(ensembleIdentString)?.push(content);
                });
            });

            const numContents = receiveResponsesPerEnsembleIdent.size;

            if (numContents > MAX_NUM_PLOTS) {
                setContent(<MaxNumberPlotsExceededMessage />);
                return;
            }
            const numCols = Math.floor(Math.sqrt(numContents));
            const numRows = Math.ceil(numContents / numCols);
            const figure = new ParameterCorrelationMatrixFigure({
                wrapperDivSize,
                plotType,
                numCols,
                numRows,
                showLabels,
                useFixedColorRange,
            });
            fillParameterCorrelationMatrixFigure(
                figure,
                parameterIdents,
                colorScaleWithGradient,
                numContents,
                ensembleSet,
                receiveResponsesPerEnsembleIdent,
                plotType,
                correlationSettings,
            );
            setContent(figure.build());
            return;
        });
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
}

function fillParameterCorrelationMatrixFigure(
    figure: ParameterCorrelationMatrixFigure,
    parameterIdents: ParameterIdent[],
    colorScaleWithGradient: [number, string][],
    numContents: number,
    ensembleSet: EnsembleSet,
    receiveResponsesPerEnsembleIdent: Map<string, ChannelReceiverChannelContent<KeyKind.REALIZATION[]>[]>,
    plotType: PlotType,
    correlationSettings: CorrelationSettings,
): void {
    const numRows = figure.numRows();
    const numCols = figure.numColumns();
    const { threshold, hideIndividualCells, filterColumns, filterRows } = correlationSettings;
    const filterCutoff = hideIndividualCells && threshold ? threshold : null;
    const columnCutoff = filterColumns ? threshold : null;
    const rowCutoff = filterRows ? threshold : null;
    // Each ensemble and plot all the correlations
    let cellIndex = 0;
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
        for (let colIndex = 0; colIndex < numCols; colIndex++) {
            if (cellIndex >= numContents) {
                break;
            }
            const ensembleReceiverChannelContents = Array.from(receiveResponsesPerEnsembleIdent.values())[cellIndex];
            const ensembleIdentString = Array.from(receiveResponsesPerEnsembleIdent.keys())[cellIndex];

            const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
            if (!ensemble || !(ensemble instanceof RegularEnsemble)) {
                continue;
            }
            const fullParameterArr = getVaryingContinuousParameters(ensemble);
            if (!fullParameterArr) {
                continue;
            }
            const selectedParameterArr = fullParameterArr.filter((param) => {
                const currentParamIdent = ParameterIdent.fromNameAndGroup(param.name, param.groupName);
                return parameterIdents.some((ident) => ident.equals(currentParamIdent));
            });

            const responseDataArr: ResponseData[] = ensembleReceiverChannelContents.map((content) => {
                return {
                    realizations: content.dataArray.map((dataPoint) => dataPoint.key as number),
                    values: content.dataArray.map((dataPoint) => dataPoint.value as number),
                    displayName: content.displayName,
                };
            });
            const responseItems: CorrelationDataItem[] = responseDataArr.map((r) => ({
                name: r.displayName,
                values: r.values,
                realizations: r.realizations,
            }));
            const parameterItems: CorrelationDataItem[] = selectedParameterArr.map((param) => ({
                name: param.name,
                values: param.values,
                realizations: param.realizations,
            }));
            if (plotType === PlotType.FullMirroredMatrix) {
                const corr = createPearsonCorrelationMatrix([...responseItems, ...parameterItems], filterCutoff);
                const filteredCorr = filterCorrelationMatrixByRowAndColumnThresholds(corr, rowCutoff, columnCutoff);

                figure.addFullMirroredCorrelationMatrixTrace({
                    data: filteredCorr,
                    colorScaleWithGradient,
                    row: rowIndex + 1,
                    column: colIndex + 1,
                    cellIndex,
                    title: ensemble.getDisplayName(),
                });
            }
            if (plotType === PlotType.FullTriangularMatrix) {
                const corr = createPearsonCorrelationMatrix([...responseItems, ...parameterItems], filterCutoff);
                const filteredCorr = filterCorrelationMatrixByRowAndColumnThresholds(corr, rowCutoff, columnCutoff);

                figure.addFullTriangularCorrelationMatrixTrace({
                    data: filteredCorr,
                    colorScaleWithGradient,
                    row: rowIndex + 1,
                    column: colIndex + 1,
                    cellIndex,
                    title: ensemble.getDisplayName(),
                });
            }
            if (plotType === PlotType.ParameterResponseMatrix) {
                const corr = createResponseParameterCorrelationMatrix(responseItems, parameterItems, filterCutoff);
                const filteredCorr = filterCorrelationMatrixByRowAndColumnThresholds(corr, rowCutoff, columnCutoff);
                figure.addParameterResponseMatrixTrace({
                    data: filteredCorr,
                    colorScaleWithGradient,
                    row: rowIndex + 1,
                    column: colIndex + 1,
                    cellIndex,
                    title: ensemble.getDisplayName(),
                });
            }

            cellIndex++;
        }
    }
}
