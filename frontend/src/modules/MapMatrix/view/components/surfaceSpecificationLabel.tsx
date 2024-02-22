import React from "react";

import "animate.css";

import { isoStringToDateOrIntervalLabel } from "../../_utils/isoString";
import { EnsembleStageType, StatisticFunctionToStringMapping, SurfaceSpecification } from "../../types";

export type SurfaceSpecificationLabelProps = {
    surfaceSpecification?: SurfaceSpecification;
};
type Animations = {
    surfaceName?: string;
    surfaceAttribute?: string;
    surfaceTimeOrInterval?: string;
    realizationNum?: string;
    statisticFunction?: string;
};
export const SurfaceSpecificationLabel: React.FC<SurfaceSpecificationLabelProps> = ({ surfaceSpecification }) => {
    const [animations, setAnimations] = React.useState<Animations>({});
    const prevSurfaceSpecification = React.useRef(surfaceSpecification);

    const checkAndAnimate = (key: keyof SurfaceSpecification) => {
        return !prevSurfaceSpecification.current ||
            (surfaceSpecification && surfaceSpecification[key] !== prevSurfaceSpecification.current[key])
            ? "bg-green-200 animate__animated animate__fadeIn"
            : " bg-transparent ";
    };

    React.useEffect(() => {
        if (surfaceSpecification) {
            const newAnimations = {
                surfaceName: checkAndAnimate("surfaceName"),
                surfaceAttribute: checkAndAnimate("surfaceAttribute"),
                surfaceTimeOrInterval: checkAndAnimate("surfaceTimeOrInterval"),
                realizationNum: checkAndAnimate("realizationNum"),
                statisticFunction: checkAndAnimate("statisticFunction"),
            };

            setAnimations(newAnimations);
            prevSurfaceSpecification.current = surfaceSpecification;

            const timer = setTimeout(() => setAnimations({}), 2000);
            return () => clearTimeout(timer);
        }
    }, [surfaceSpecification]);
    const baseClassNames = "m-0 border border-gray-300 p-1 max-w-sm text-gray-800 text-sm";
    return (
        <div className="flex">
            {surfaceSpecification ? (
                <>
                    <div className={`${baseClassNames} ${animations.surfaceName}`}>
                        {surfaceSpecification.surfaceName}
                    </div>
                    <div className={`${baseClassNames} ${animations.surfaceAttribute}`}>
                        {surfaceSpecification.surfaceAttribute}
                    </div>
                    {surfaceSpecification.surfaceTimeOrInterval && (
                        <div className={`${baseClassNames} ${animations.surfaceTimeOrInterval}`}>
                            {isoStringToDateOrIntervalLabel(surfaceSpecification.surfaceTimeOrInterval)}
                        </div>
                    )}
                    {surfaceSpecification.ensembleStage === EnsembleStageType.Realization && (
                        <div className={`${baseClassNames} ${animations.realizationNum}`}>
                            {`Real: ${surfaceSpecification.realizationNum}`}
                        </div>
                    )}
                    {surfaceSpecification.ensembleStage === EnsembleStageType.Statistics && (
                        <div className={`${baseClassNames} ${animations.statisticFunction}`}>
                            {`${StatisticFunctionToStringMapping[surfaceSpecification.statisticFunction]}`}
                        </div>
                    )}
                    {surfaceSpecification.ensembleStage === EnsembleStageType.Observation && (
                        <div className={`${baseClassNames} ${animations.statisticFunction}`}>Observation</div>
                    )}
                </>
            ) : (
                <div className={`${baseClassNames} `}>No surface found</div>
            )}
        </div>
    );
};
