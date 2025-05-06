import type { Interfaces } from "../interfaces";
import { ParallelCoordinatesFigure } from "./parallelCoordinatesFigure";
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

const MAX_NUM_PLOTS = 1;

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
            if (receiverResponse.channel.contents.length > 1) {
                setContent(
                    <ContentWarning>
                        <Warning fontSize="large" className="mb-2" />
                        Only one channel is supported. Please select a single channel.
                    </ContentWarning>
                );
                return;
            }
            const responseChannelData = receiverResponse.channel.contents[0];
            const ensembleIdentString = responseChannelData.metaData.ensembleIdentString;
            const ensemble = ensembleSet.findEnsembleByIdentString(ensembleIdentString);

            if (!ensemble || !(ensemble instanceof RegularEnsemble)) {
                setContent(
                    <ContentWarning>
                        <Warning fontSize="large" className="mb-2" />
                        Ensemble not found. Please select a valid ensemble.
                    </ContentWarning>
                );
                return;
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
                setContent(
                    <ContentWarning>
                        <Warning fontSize="large" className="mb-2" />
                        No parameters found in ensemble
                    </ContentWarning>
                );
                return;
            }
            const responseData: ResponseData = {
                realizations: responseChannelData.dataArray.map((dataPoint) => dataPoint.key as number),
                values: responseChannelData.dataArray.map((dataPoint) => dataPoint.value as number),
                displayName: responseChannelData.displayName,
            };

            const rankedParameterCorrelations = createRankedParameterCorrelations(
                parameters,
                responseData,
                numParams,
                corrCutOff
            );
            const rankedParametersData = getRankedParameterData(rankedParameterCorrelations, parameters);
            const figure = new ParallelCoordinatesFigure(wrapperDivSize);
            figure.addPlot(responseData, rankedParametersData, {});

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
