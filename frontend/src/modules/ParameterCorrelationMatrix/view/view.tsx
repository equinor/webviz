import React from "react";

import { Input, Warning } from "@mui/icons-material";
import { isEqual } from "lodash";

import type { ChannelReceiverChannelContent } from "@framework/DataChannelTypes";
import { KeyKind } from "@framework/DataChannelTypes";
import { ParameterIdent } from "@framework/EnsembleParameters";
import type { ChannelReceiverReturnData } from "@framework/internal/DataChannels/hooks/useChannelReceiver";
import type { ModuleViewProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import { getContinuousParameterArray } from "@modules/_shared/parameterUtils";
import type { ResponseData } from "@modules/_shared/rankParameter";
import { createCorrelationMatrix } from "@modules/_shared/rankParameter";

import type { Interfaces } from "../interfaces";

import { ParameterCorrelationMatrixFigure } from "./parameterCorrelationMatrixFigure";

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

export function View({ viewContext, workbenchSession }: ModuleViewProps<Interfaces>) {
    const [isPending, startTransition] = React.useTransition();
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberResponses, setRevNumberResponses] = React.useState<number[]>([]);
    const [prevShowLabels, setPrevShowLabels] = React.useState<boolean | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);
    const [prevParameterIdentStrings, setPrevParameterIdentStrings] = React.useState<string[]>([]);
    const [prevShowSelfCorrelation, setPrevShowSelfCorrelation] = React.useState<boolean>(true);
    const [prevUseFixedColorRange, setPrevUseFixedColorRange] = React.useState<boolean>(true);
    const parameterIdentStrings = viewContext.useSettingsToViewInterfaceValue("parameterIdentStrings");
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
    const showSelfCorrelation = viewContext.useSettingsToViewInterfaceValue("showSelfCorrelation");
    const useFixedColorRange = viewContext.useSettingsToViewInterfaceValue("useFixedColorRange");

    const ensembleSet = workbenchSession.getEnsembleSet();

    const statusWriter = useViewStatusWriter(viewContext);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

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
    const receiverResponseRevisionNumbers = receiverResponses.map(
        (response: ChannelReceiverReturnData<KeyKind.REALIZATION[]>) => response.revisionNumber,
    );
    if (
        !isEqual(receiverResponseRevisionNumbers, revNumberResponses) ||
        !isEqual(parameterIdentStrings, prevParameterIdentStrings) ||
        showLabels !== prevShowLabels ||
        wrapperDivSize !== prevSize ||
        showSelfCorrelation !== prevShowSelfCorrelation ||
        useFixedColorRange !== prevUseFixedColorRange
    ) {
        setRevNumberResponses(receiverResponseRevisionNumbers);

        setPrevParameterIdentStrings(parameterIdentStrings);
        setPrevShowLabels(showLabels);
        setPrevSize(wrapperDivSize);
        setPrevShowSelfCorrelation(showSelfCorrelation);
        setPrevUseFixedColorRange(useFixedColorRange);

        startTransition(function makeContent() {
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

            //Check for empty channels
            const emptyChannels = receiverResponses.filter(
                (response) => !response.channel || response.channel.contents.length === 0,
            );
            if (emptyChannels.length === receiverResponses.length) {
                setContent(
                    <ContentInfo>
                        <span>
                            No data on any of the channels. Add a main module to the workbench and use the data channels{" "}
                            <Input fontSize="small" />
                        </span>
                        <span>
                            <Tag label="Response" />
                            <Tag label="Response" />
                            <Tag label="Response" />
                        </span>
                    </ContentInfo>,
                );
                return;
            }
            if (emptyChannels.length > 0) {
                setContent(
                    <ContentWarning>
                        <span>Some channels have no data. Only the channels with data will be displayed.</span>
                        <span>
                            {emptyChannels.map((channel, index) => (
                                <Tag key={index} label={channel.displayName} />
                            ))}
                        </span>
                    </ContentWarning>,
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
                numCols,
                numRows,
                showLabels,
                showSelfCorrelation,
                useFixedColorRange,
            });

            //  each ensemble and plot all the correlations
            let cellIndex = 0;
            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    if (cellIndex >= numContents) {
                        break;
                    }
                    const ensembleReceiverChannelContents = Array.from(receiveResponsesPerEnsembleIdent.values())[
                        cellIndex
                    ];
                    const ensembleIdentString = Array.from(receiveResponsesPerEnsembleIdent.keys())[cellIndex];

                    const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
                    if (!ensemble || !(ensemble instanceof RegularEnsemble)) {
                        continue;
                    }
                    const parameterArr = getContinuousParameterArray(ensemble);
                    if (!parameterArr) {
                        continue;
                    }
                    const selectedParameters = parameterArr.filter((param) => {
                        const parameterIdent = ParameterIdent.fromNameAndGroup(param.name, param.groupName);
                        return parameterIdentStrings.includes(parameterIdent.toString());
                    });

                    const responseDataArr: ResponseData[] = ensembleReceiverChannelContents.map((content) => {
                        return {
                            realizations: content.dataArray.map((dataPoint) => dataPoint.key as number),
                            values: content.dataArray.map((dataPoint) => dataPoint.value as number),
                            displayName: content.displayName,
                        };
                    });

                    const corr = createCorrelationMatrix(selectedParameters, responseDataArr);
                    figure.addCorrelationMatrixTrace({
                        data: corr,
                        rowIndex: rowIndex + 1,
                        columnIndex: colIndex + 1,
                        cellIndex,
                        title: ensemble.getDisplayName(),
                    });

                    cellIndex++;
                }
            }
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
