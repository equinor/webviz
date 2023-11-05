import React from "react";

import "animate.css";

import { isoStringToDateOrIntervalLabel } from "../../_utils/isoString";
import { EnsembleStageType, StatisticFunctionToStringMapping, ViewSpecification } from "../../types";

export type ViewLabelProps = {
    viewSpecification?: ViewSpecification;
};
type Animations = {
    surfaceName?: string;
    surfaceAttribute?: string;
    surfaceTimeOrInterval?: string;
    realizationNum?: string;
    statisticFunction?: string;
};
export const ViewLabel: React.FC<ViewLabelProps> = ({ viewSpecification }) => {
    const [animations, setAnimations] = React.useState<Animations>({});
    const prevViewSpecification = React.useRef(viewSpecification);

    const checkAndAnimate = (key: keyof ViewSpecification) => {
        return !prevViewSpecification.current ||
            (viewSpecification && viewSpecification[key] !== prevViewSpecification.current[key])
            ? "bg-green-200 animate__animated animate__fadeIn"
            : " bg-transparent ";
    };

    React.useEffect(() => {
        if (viewSpecification) {
            const newAnimations = {
                surfaceName: checkAndAnimate("surfaceName"),
                surfaceAttribute: checkAndAnimate("surfaceAttribute"),
                surfaceTimeOrInterval: checkAndAnimate("surfaceTimeOrInterval"),
                realizationNum: checkAndAnimate("realizationNum"),
                statisticFunction: checkAndAnimate("statisticFunction"),
            };

            setAnimations(newAnimations);
            prevViewSpecification.current = viewSpecification;

            const timer = setTimeout(() => setAnimations({}), 2000);
            return () => clearTimeout(timer);
        }
    }, [viewSpecification]);
    const baseClassNames = "m-0 border border-gray-300 p-1 max-w-sm text-gray-800 text-sm";
    return (
        <div className="flex">
            {viewSpecification ? (
                <>
                    <div className={`${baseClassNames} ${animations.surfaceName}`}>{viewSpecification.surfaceName}</div>
                    <div className={`${baseClassNames} ${animations.surfaceAttribute}`}>
                        {viewSpecification.surfaceAttribute}
                    </div>
                    {viewSpecification.surfaceTimeOrInterval && (
                        <div className={`${baseClassNames} ${animations.surfaceTimeOrInterval}`}>
                            {isoStringToDateOrIntervalLabel(viewSpecification.surfaceTimeOrInterval)}
                        </div>
                    )}
                    {viewSpecification.ensembleStage === EnsembleStageType.Realization && (
                        <div className={`${baseClassNames} ${animations.realizationNum}`}>
                            {`Real: ${viewSpecification.realizationNum}`}
                        </div>
                    )}
                    {viewSpecification.ensembleStage === EnsembleStageType.Statistics && (
                        <div className={`${baseClassNames} ${animations.statisticFunction}`}>
                            {`${StatisticFunctionToStringMapping[viewSpecification.statisticFunction]}`}
                        </div>
                    )}
                    {viewSpecification.ensembleStage === EnsembleStageType.Observation && (
                        <div className={`${baseClassNames} ${animations.statisticFunction}`}>Observation</div>
                    )}
                </>
            ) : (
                <div className={`${baseClassNames} `}>No surface found</div>
            )}
        </div>
    );
};
