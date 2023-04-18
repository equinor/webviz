import { ModuleRegistry } from "@framework/ModuleRegistry";
import { Input } from "@lib/components/Input";
import { DeckGLMap } from "@webviz/subsurface-components";
import { ViewsType } from "@webviz/subsurface-components/dist/components/SubsurfaceViewer/components/Map";

import { State } from "./state";

const initialState: State = {
    text: "Hello World",
};

const module = ModuleRegistry.initModule<State>("MyModule2", initialState);

module.viewFC = (props) => {
    const text = props.moduleContext.useStoreValue("text");

    const layers = [
        {
            "@@type": "AxesLayer",
            id: "axes-layer2",
            bounds: [432150, 6475800, 0, 439400, 6481500, 3500],
        },
        {
            "@@type": "MapLayer",
            id: "mesh-layer",
            meshUrl: "hugin_depth_25_m.png",
            frame: {
                origin: [432150, 6475800],
                count: [291, 229],
                increment: [25, 25],
                rotDeg: 0,
            },
            propertiesUrl: "kh_netmap_25_m.png",
            contours: [0, 100],
            isContoursDepth: true,
            gridLines: false,
            material: true,
            smoothShading: true,
            colorMapName: "Physics",
            ZIncreasingDownwards: true,
        },
        {
            "@@type": "NorthArrow3DLayer",
            id: "north-arrow-layer",
        },
    ];

    return (
        <div>
            <h1>Text: {text as string}</h1>
            <div style={{ width: 300, height: 300, position: "relative" }}>
                <DeckGLMap id="test" layers={layers} bounds={[432150, 6475800, 439400, 6481500]} />
            </div>
        </div>
    );
};

module.settingsFC = (props) => {
    return null;
};
