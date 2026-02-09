import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-slate-900 text-white p-8 flex flex-col items-center justify-center overflow-auto">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
                    <div className="bg-slate-800 p-4 rounded max-w-4xl w-full">
                        <h2 className="font-mono text-yellow-400 mb-2">{this.state.error?.toString()}</h2>
                        <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap overflow-x-auto">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.location.reload();
                        }}
                        className="mt-6 px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
                    >
                        Reload Page
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="mt-2 px-4 py-2 bg-red-900/50 border border-red-800 rounded hover:bg-red-900 text-sm"
                    >
                        Clear Local Storage & Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
