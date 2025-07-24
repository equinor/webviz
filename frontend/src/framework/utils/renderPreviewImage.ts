import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import React from "react";
import ReactDOMServer from "react-dom/server";

function isSvgElement(node: unknown): node is React.ReactElement<"svg"> {
    return React.isValidElement(node) && node.type === "svg";
}

function isUrlString(node: unknown): node is string {
    return typeof node === "string";
}

export async function drawModulePreviewToCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    preview: string | SVGElement,
): Promise<void> {
    if (isUrlString(preview)) {
        await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                ctx.drawImage(img, x, y, w, h);
                resolve();
            };
            img.onerror = () => {
                console.warn("Failed to load image preview:", preview);
                resolve();
            };
            img.src = preview;
        });
    } else if (isSvgElement(preview)) {
        const svgString = ReactDOMServer.renderToStaticMarkup(preview);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                ctx.drawImage(img, x, y, w, h);
                URL.revokeObjectURL(url);
                resolve();
            };
            img.onerror = () => {
                console.warn("Failed to render inline SVG preview");
                URL.revokeObjectURL(url);
                resolve();
            };
            img.src = url;
        });
    } else {
        console.warn("Unknown preview type:", preview);
    }
}

export async function renderDashboardLayoutToCanvas(
    ctx: CanvasRenderingContext2D,
    layout: LayoutElement[],
    width: number,
    height: number,
): Promise<void> {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const strokeWidth = 2;
    const headerHeight = 10;

    for (const element of layout) {
        const w = element.relWidth * width;
        const h = element.relHeight * height;
        const x = element.relX * width;
        const y = element.relY * height;

        // Container
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = strokeWidth;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, w, h);

        // Header
        ctx.fillStyle = "#eee";
        ctx.fillRect(x + strokeWidth / 2, y + strokeWidth / 2, w - strokeWidth, headerHeight);

        // Label
        ctx.fillStyle = "#000";
        ctx.font = "3px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(element.moduleName, x + strokeWidth, y + headerHeight / 2 + strokeWidth / 2);

        // Module preview
        const module = ModuleRegistry.getModule(element.moduleName);
        const drawFunc = module.getDrawPreviewFunc?.();
        const innerX = x + 2 * strokeWidth;
        const innerY = y + headerHeight + 2 * strokeWidth;
        const innerW = w - 4 * strokeWidth;
        const innerH = h - headerHeight - 4 * strokeWidth;

        if (typeof drawFunc === "function") {
            const content = await drawFunc(innerW, innerH);

            if (typeof content === "string") {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, innerX, innerY, innerW, innerH);
                img.src = content;
            } else if (content instanceof SVGElement) {
                const svgStr = new XMLSerializer().serializeToString(content);
                const blob = new Blob([svgStr], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, innerX, innerY, innerW, innerH);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        }
    }
}

export async function exportDashboardAsPng(layout: LayoutElement[], width: number, height: number): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to get canvas context");

    await renderDashboardLayoutToCanvas(ctx, layout, width, height);

    return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) throw new Error("Failed to generate PNG blob");
            resolve(blob);
        }, "image/png");
    });
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
