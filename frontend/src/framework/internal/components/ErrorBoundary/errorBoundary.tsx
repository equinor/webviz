import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";

export type Props = {
    moduleInstance: ModuleInstance<any>;
    children?: React.ReactNode;
};

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = {
        error: null,
    };

    static getDerivedStateFromError(err: Error): State {
        return { error: err };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.props.moduleInstance.setFatalError(error, errorInfo);
    }

    render() {
        if (this.state.error) {
            return null;
        }
        return this.props.children;
    }
}
