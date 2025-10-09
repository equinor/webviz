import type React from "react";
import { useEffect, useRef } from "react";

import { Close } from "@mui/icons-material";
import { createPortal } from "react-dom";

export type ParameterSortingInfoDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    anchorElement?: HTMLElement | null;
};

export function ParameterSortingInfoDialog({
    isOpen,
    onClose,
    anchorElement,
}: ParameterSortingInfoDialogProps): React.ReactElement | null {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Calculate position relative to anchor element
    const baseStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 9999,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        minWidth: "320px",
        maxWidth: "400px",
    };

    // Position relative to anchor element
    const rect = anchorElement?.getBoundingClientRect();
    const style: React.CSSProperties = {
        ...baseStyle,
        top: rect ? rect.bottom + 4 : 100,
        left: rect ? rect.left : 100,
    };

    const dialogContent = (
        <div ref={dialogRef} style={style}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Parameter Sorting Methods</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" title="Close">
                    <Close fontSize="small" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Alphabetical</h4>
                    <p className="text-sm text-gray-600">Sorts parameters by name in alphabetical order (A-Z).</p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Variance Reduction</h4>
                    <p className="text-sm text-gray-600">
                        Shows parameters where the spread of values decreased the most from prior to posterior. High
                        percentage = values became more tightly clustered.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Entropy Reduction</h4>
                    <p className="text-sm text-gray-600">
                        Shows parameters where uncertainty decreased the most from prior to posterior. High percentage =
                        distribution became more predictable.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-800 mb-1">KL Divergence</h4>
                    <p className="text-sm text-gray-600">
                        Shows parameters where the distribution changed the most (spread, location, or shape). High
                        value = parameter updated significantly by observations.
                    </p>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-700">
                        <strong>Note:</strong> Prior-posterior sorting methods are only available when comparing exactly
                        two ensembles (prior and posterior). For independent ensemble mode, only alphabetical sorting is
                        available.
                    </p>
                </div>
            </div>
        </div>
    );

    return createPortal(dialogContent, document.body);
}
