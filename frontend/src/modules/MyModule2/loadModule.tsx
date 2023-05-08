import React from "react";

import { broadcaster } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { Input } from "@lib/components/Input";

import { State } from "./state";

const initialState: State = {
    text: "Hello World",
};

const module = ModuleRegistry.initModule<State>("MyModule2", initialState);

module.viewFC = (props) => {
    const text = props.moduleContext.useStoreValue("text");
    const [count, setCount] = React.useState<number>(0);

    React.useEffect(() => {
        const handleCountChange = (data: { count: number }) => {
            setCount(data.count);
        };

        const channel = broadcaster.getChannel("MyModule");

        if (channel) {
            return channel.subscribe(handleCountChange);
        }

        return () => {};
    }, []);

    return (
        <div>
            <h1>Text: {text as string}</h1>
            <h1>Count: {count}</h1>
        </div>
    );
};

module.settingsFC = (props) => {
    const [text, setText] = props.moduleContext.useStoreState("text");

    return (
        <div>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
        </div>
    );
};
