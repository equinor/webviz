import type { Interfaces } from "../interfaces";
import { ParameterCorrelationFigure } from "./parameterCorrelationFigure";
import { KeyKind } from "@framework/DataChannelTypes";
import { ContinuousParameter, ParameterType } from "@framework/EnsembleParameters";
import type { ModuleViewProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Tag } from "@lib/components/Tag";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Size2D } from "@lib/utils/geometry";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { ContentWarning } from "@modules/_shared/components/ContentMessage/contentMessage";
import {
    createRankedParameterCorrelations,
    getRankedParameterData,
    ResponseData,
} from "@modules/_shared/utils/rankParameter";
import { Input, Warning } from "@mui/icons-material";
import React from "react";

const MAX_NUM_PLOTS = 12;

const MaxNumberPlotsExceededMessage: React.FC = () => {
    return (
        <ContentWarning>
            <Warning fontSize="large" className="mb-2" />
            Too many plots to display. Due to performance limitations, the number of plots is limited to {MAX_NUM_PLOTS}
            .
        </ContentWarning>
    );
};

MaxNumberPlotsExceededMessage.displayName = "MaxNumberPlotsExceededMessage";

export const View = ({ viewContext, workbenchSession }: ModuleViewProps<Interfaces>) => {
    const [isPending, startTransition] = React.useTransition();
    const [content, setContent] = React.useState<React.ReactNode>(null);
    const [revNumberResponse, setRevNumberResponse] = React.useState<number>(0);
    const [prevNumParams, setPrevNumParams] = React.useState<number>(10);
    const [prevCorrCutOff, setPrevCorrCutOff] = React.useState<number>(0.0);
    const [prevShowLabels, setPrevShowLabels] = React.useState<boolean | null>(null);
    const [prevSize, setPrevSize] = React.useState<Size2D | null>(null);

    const numParams = viewContext.useSettingsToViewInterfaceValue("numParams");
    const corrCutOff = viewContext.useSettingsToViewInterfaceValue("corrCutOff");
    const showLabels = viewContext.useSettingsToViewInterfaceValue("showLabels");
    const ensembleSet = workbenchSession.getEnsembleSet();

    const statusWriter = useViewStatusWriter(viewContext);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const receiverResponse = viewContext.useChannelReceiver({
        receiverIdString: "channelResponse",
        expectedKindsOfKeys: [KeyKind.REALIZATION],
    });

    statusWriter.setLoading(isPending || receiverResponse.isPending);

    if (
        receiverResponse.revisionNumber !== revNumberResponse ||
        numParams !== prevNumParams ||
        corrCutOff !== prevCorrCutOff ||
        showLabels !== prevShowLabels ||
        wrapperDivSize !== prevSize
    ) {
        setRevNumberResponse(receiverResponse.revisionNumber);

        setPrevNumParams(numParams);
        setPrevCorrCutOff(corrCutOff);
        setPrevShowLabels(showLabels);

        setPrevSize(wrapperDivSize);

        startTransition(function makeContent() {
            if (!receiverResponse.channel) {
                setContent(
                    <ContentInfo>
                        <span>
                            Data channel required for use. Add a main module to the workbench and use the data channels
                            icon
                            <Input />
                        </span>
                        <Tag label="Response" />
                    </ContentInfo>
                );
                return;
            }

            if (receiverResponse.channel.contents.length === 0) {
                setContent(
                    <ContentInfo>
                        No data on <Tag label={receiverResponse.displayName} />
                    </ContentInfo>
                );
                return;
            }
            const numContents = receiverResponse.channel.contents.length;
            if (numContents > MAX_NUM_PLOTS) {
                setContent(<MaxNumberPlotsExceededMessage />);
                return;
            }
            const numCols = Math.floor(Math.sqrt(numContents));
            const numRows = Math.ceil(numContents / numCols);
            const figure = new ParameterCorrelationFigure(wrapperDivSize, numCols, numRows, showLabels);

            // Loop through the contents and plot the correlations
            let cellIndex = 0;
            for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    if (cellIndex >= numContents) {
                        break;
                    }
                    const responseChannelData = receiverResponse.channel.contents[cellIndex];
                    const ensembleIdentString = responseChannelData.metaData.ensembleIdentString;
                    const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);
                    if (!ensemble || !(ensemble instanceof RegularEnsemble)) {
                        continue;
                    }
                    const parameterArr = ensemble.getParameters().getParameterArr();
                    const parameters: ContinuousParameter[] = [];
                    if (parameterArr) {
                        parameterArr.forEach((parameter) => {
                            if (parameter.isConstant || parameter.type !== ParameterType.CONTINUOUS) {
                                return;
                            }
                            parameters.push(parameter);
                        });
                    }

                    if (!parameters) {
                        continue;
                    }
                    const responseData: ResponseData = {
                        realizations: responseChannelData.dataArray.map((dataPoint) => dataPoint.key as number),
                        values: responseChannelData.dataArray.map((dataPoint) => dataPoint.value as number),
                        displayName: responseChannelData.displayName,
                    };

                    const rankedParameters = createRankedParameterCorrelations(
                        parameters,
                        responseData,
                        numParams,
                        corrCutOff
                    );

                    // const color = responseChannelData.metaData.preferredColor;

                    const channelTitle = responseChannelData.metaData.displayString;

                    figure.addCorrelationTrace(
                        rankedParameters,
                        rowIndex + 1,
                        colIndex + 1,
                        cellIndex,
                        channelTitle ?? ""
                    );
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
};

View.displayName = "View";
