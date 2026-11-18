import { existsSync } from "node:fs";

/**
 * Playwright options for stories that need GPU rendering, e.g. WebGL maps, where software rendering
 * makes every redraw take seconds. Use at the top level of the story file: `test.use(GPU_RENDERING)`.
 *
 * Under WSL the GPU is only reachable through WSLg's display, so Chromium runs headed there (a window
 * opens during the run); headless Chromium on WSL always falls back to software WebGL. Elsewhere the
 * default headless mode can reach the GPU through /dev/dri, so nothing changes.
 *
 * Headed mode changes timings compared with headless, so only opt in where the GPU is needed.
 */
export const GPU_RENDERING = existsSync("/dev/dxg") ? { headless: false } : {};
