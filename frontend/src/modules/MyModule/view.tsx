import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

const data: number[][][] = [];

for (let i = 0; i < 100; i++) {
    data.push([]);
    for (let j = 0; j < 100; j++) {
        data[i].push([]);
        for (let k = 0; k < 100; k++) {
            data[i][j].push(Math.random() * i);
        }
    }
}

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    const divScale = props.workbenchSettings.useSequentialColorScale();

    divScale.setMin(0);
    divScale.setMax(20);

    const maxValue = Math.max(...data[count].flat());

    function makeScale(): React.ReactNode {
        const nodes: React.ReactNode[] = [];

        for (let i = 99; i >= 0; i--) {
            nodes.push(
                <div
                    key={i}
                    className="w-10 h-1"
                    style={{
                        backgroundColor: divScale.getColorForValue(0 + (maxValue - 0) * (i / 100)),
                    }}
                />
            );
        }

        return <div className="flex flex-col">{nodes}</div>;
    }

    return (
        <div>
            {data[count].map((row, i) => (
                <div key={i} className="flex">
                    {row.map((val, j) => (
                        <div
                            key={j}
                            className="w-1 h-1"
                            style={{
                                backgroundColor: divScale.getColorForValue(val),
                            }}
                        />
                    ))}
                </div>
            ))}
            {makeScale()}
        </div>
    );
};
