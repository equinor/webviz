import React from "react";

function heavyOperation() {
    const promise = new Promise((resolve) => {
        setTimeout(() => resolve("done!"), 1000)
    });
    return promise;
}

export function hookWithAsyncFunc(data: any) {
    const [prevData, setPrevData] = React.useState<any>(null);
    const [isPending, startTransition] = React.useTransition();

    async function asyncFunc() {
        const result = await heavyOperation();
        console.log(result);
    }

    if (!prevData !== data) {
        setPrevData(data);
        startTransition(() => {
            asyncFunc();
        })
    }

    return isPending;
}

type State = {
    count: number;
}

enum Action {
    Increment = "increment",
    Decrement = "decrement",
}

type Payload = {
    [Action.Increment]: number;
    [Action.Decrement]: number;
}

type Actions = {
    [Key in Action]: Payload[Key] extends undefined ? { type: Key } : { type: Key; payload: Payload[Key] };
}[Action];


const ComponentWithReducer: React.FC = () => {
    const initialState = { count: 0 };

    const reducer = (state: State, action: Actions) => {
        switch (action.type) {
            case Action.Increment:
                return { count: state.count + action.payload };
            case Action.Decrement:
                return { count: state.count - action.payload };
            default:
                throw new Error();
        }
    }

    const [state, dispatch] = React.useReducer(reducer, initialState);

    function increment() {
        dispatch({ type: Action.Increment, payload: 1 });
    }

    function decrement() {
        dispatch({ type: Action.Decrement, payload: 1 });
    }

    return (
        <div>
            <button onClick={decrement}>-</button>
            <span>{state.count}</span>
            <button onClick={increment}>+</button>
        </div>
    );
}