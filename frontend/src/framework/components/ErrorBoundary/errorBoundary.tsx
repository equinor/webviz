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
    public state: State = {
        error: null,
    };

    public static getDerivedStateFromError(err: Error): State {
        return { error: err };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.props.moduleInstance.setFatalError(error, errorInfo);
    }

    public render() {
        if (this.state.error) {
            return null;
        }
        return this.props.children;
    }
}
