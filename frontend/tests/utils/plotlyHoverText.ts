/** A Plotly hovertemplate as plain text lines, so tests don't depend on its HTML styling. */
export function hoverTemplateToLines(template: string): string[] {
    return template.split("<br>").map((line) => line.replace(/<[^>]*>/g, ""));
}
