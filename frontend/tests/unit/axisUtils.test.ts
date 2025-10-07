import { generateNiceAxisTicks, type AxisTickOptions } from "@modules/_shared/utils/axisUtils";
import { describe, expect, test } from "vitest";

describe("generateNiceAxisTicks", () => {
    describe("basic functionality", () => {
        test("should return single value for identical min and max", () => {
            const result = generateNiceAxisTicks(5, 5, 5);
            expect(result).toEqual([5]);
        });

        test("should generate nice round numbers for typical range", () => {
            const result = generateNiceAxisTicks(2220.458, 3645.571, 5);
            // Should include boundaries plus nice intermediate values
            expect(result).toEqual([2220.458, 2500, 3000, 3500, 3645.571]);
        });

        test("should include min and max values when they are nice numbers", () => {
            const result = generateNiceAxisTicks(0, 10, 5);
            // When min/max are nice, algorithm chooses nice step size (5 in this case)
            expect(result).toEqual([0, 5, 10]);
        });
    });

    describe("step size calculation", () => {
        test("should use step size 1 for small ranges", () => {
            const result = generateNiceAxisTicks(1, 3, 5);
            expect(result).toContain(2);
        });

        test("should use step size 2 for appropriate ranges", () => {
            const result = generateNiceAxisTicks(1, 8, 5);
            expect(result).toContain(2);
            expect(result).toContain(4);
            expect(result).toContain(6);
        });

        test("should use step size 5 for appropriate ranges", () => {
            const result = generateNiceAxisTicks(3, 17, 5);
            expect(result).toContain(5);
            expect(result).toContain(10);
            expect(result).toContain(15);
        });

        test("should use step size 10 for larger ranges", () => {
            const result = generateNiceAxisTicks(15, 85, 5);
            expect(result).toContain(20);
            expect(result).toContain(40);
            expect(result).toContain(60);
            expect(result).toContain(80);
        });
    });

    describe("decimal ranges", () => {
        test("should handle decimal step sizes correctly", () => {
            const result = generateNiceAxisTicks(0, 1, 5);
            // Algorithm chooses step size 0.5 for this range
            expect(result).toEqual([0, 0.5, 1]);
        });

        test("should handle very small decimal ranges", () => {
            const result = generateNiceAxisTicks(0, 0.1, 5);
            // Algorithm chooses step size 0.05 for this range
            expect(result).toEqual([0, 0.05, 0.1]);
        });

        test("should handle ranges with decimal min/max", () => {
            const result = generateNiceAxisTicks(1.2, 5.8, 5);
            // Should include boundaries and nice values in between
            expect(result).toEqual([1.2, 2, 4, 5.8]);
        });
    });

    describe("negative ranges", () => {
        test("should handle negative ranges correctly", () => {
            const result = generateNiceAxisTicks(-10, -2, 5);
            expect(result).toContain(-8);
            expect(result).toContain(-6);
            expect(result).toContain(-4);
        });

        test("should handle ranges crossing zero", () => {
            const result = generateNiceAxisTicks(-5, 5, 5);
            expect(result).toEqual([-5, 0, 5]);
        });

        test("should handle asymmetric ranges around zero", () => {
            const result = generateNiceAxisTicks(-2, 8, 5);
            expect(result).toEqual([-2, 0, 5, 8]);
        });
    });

    describe("floating-point precision", () => {
        test("should avoid floating-point accumulation errors", () => {
            const result = generateNiceAxisTicks(0.1, 0.9, 5);
            // All values should be properly rounded
            result.forEach((tick) => {
                expect(Number.isFinite(tick)).toBe(true);
                expect(tick.toString()).not.toMatch(/e/); // No scientific notation
            });
        });

        test("should handle ranges that might cause floating-point issues", () => {
            const result = generateNiceAxisTicks(-0.2, 0.2, 5);
            // Should not produce values like 6.938893903907228e-18
            const hasNearZero = result.some((tick) => Math.abs(tick) < 1e-10 && tick !== 0);
            expect(hasNearZero).toBe(false);
        });
    });

    describe("edge cases", () => {
        test("should handle maxTicks of 1", () => {
            const result = generateNiceAxisTicks(0, 100, 1);
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        test("should handle maxTicks of 2", () => {
            const result = generateNiceAxisTicks(0, 100, 2);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        test("should handle very large numbers", () => {
            const result = generateNiceAxisTicks(1000000, 2000000, 5);
            expect(result).toContain(1500000);
        });

        test("should handle very small numbers", () => {
            const result = generateNiceAxisTicks(0.000001, 0.000002, 5);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe("boundary inclusion", () => {
        test("should always include min value when it's not a nice number", () => {
            const result = generateNiceAxisTicks(1.3, 8.7, 5);
            expect(result[0]).toBe(1.3);
        });

        test("should always include max value when it's not a nice number", () => {
            const result = generateNiceAxisTicks(1.3, 8.7, 5);
            expect(result[result.length - 1]).toBe(8.7);
        });

        test("should not duplicate boundaries if they match nice numbers", () => {
            const result = generateNiceAxisTicks(0, 10, 5);
            expect(result.filter((x) => x === 0).length).toBe(1);
            expect(result.filter((x) => x === 10).length).toBe(1);
        });
    });

    describe("tick count constraints", () => {
        test("should respect maxTicks constraint approximately", () => {
            const result = generateNiceAxisTicks(0, 100, 3);
            // Should not exceed maxTicks by much
            expect(result.length).toBeLessThanOrEqual(6); // Allow some flexibility
        });

        test("should generate at least min and max ticks", () => {
            const result = generateNiceAxisTicks(1.5, 8.3, 2);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("ordering", () => {
        test("should return ticks in ascending order", () => {
            const result = generateNiceAxisTicks(-5, 15, 5);
            for (let i = 1; i < result.length; i++) {
                expect(result[i]).toBeGreaterThan(result[i - 1]);
            }
        });

        test("should handle reversed min/max gracefully", () => {
            const result = generateNiceAxisTicks(10, 0, 5);
            expect(result.length).toBeGreaterThan(0);
            // Function should swap min/max internally and generate proper ticks
            expect(result).toContain(0);
            expect(result).toContain(10);
            expect(result).toContain(5);
            // Should be in ascending order
            const sortedResult = [...result].sort((a, b) => a - b);
            expect(sortedResult).toEqual(result);
        });
    });

    describe("spacing constraints", () => {
        test("should limit ticks when space is constrained", () => {
            const options: AxisTickOptions = {
                minTickSpacing: 50,
                availableSpace: 200,
            };
            const result = generateNiceAxisTicks(0, 100, 10, options);

            // Should have at most 5 ticks (200px / 50px spacing + 1)
            expect(result.length).toBeLessThanOrEqual(5);
            expect(result).toContain(0);
            expect(result).toContain(100);
        });

        test("should handle very limited space", () => {
            const options: AxisTickOptions = {
                minTickSpacing: 100,
                availableSpace: 150,
            };
            const result = generateNiceAxisTicks(0, 100, 10, options);

            // Should have at most 2 ticks (min and max)
            expect(result.length).toBeLessThanOrEqual(2);
            expect(result).toContain(0);
            expect(result).toContain(100);
        });

        test("should work without spacing constraints", () => {
            const resultWithoutOptions = generateNiceAxisTicks(0, 100, 5);
            const resultWithOptions = generateNiceAxisTicks(0, 100, 5, {});

            // Should produce same results when no spacing constraints
            expect(resultWithOptions).toEqual(resultWithoutOptions);
        });

        test("should prioritize boundaries by default", () => {
            const options: AxisTickOptions = {
                minTickSpacing: 30,
                availableSpace: 100,
            };
            const result = generateNiceAxisTicks(1.23, 98.76, 10, options);

            // Should always include boundaries
            expect(result[0]).toBe(1.23);
            expect(result[result.length - 1]).toBe(98.76);
        });

        test("should respect minimum spacing between ticks", () => {
            const options: AxisTickOptions = {
                minTickSpacing: 40,
                availableSpace: 200,
            };
            const result = generateNiceAxisTicks(0, 100, 10, options);

            if (result.length > 1) {
                // Check that pixel spacing between consecutive ticks meets minimum
                const range = 100 - 0;
                const pixelPerUnit = 200 / range;

                for (let i = 1; i < result.length; i++) {
                    const spacing = (result[i] - result[i - 1]) * pixelPerUnit;
                    expect(spacing).toBeGreaterThanOrEqual(39); // Allow small floating point tolerance
                }
            }
        });

        test("should handle edge case with very small available space", () => {
            const options: AxisTickOptions = {
                minTickSpacing: 50,
                availableSpace: 30,
            };
            const result = generateNiceAxisTicks(0, 100, 10, options);

            // Should still return at least min value when space is too small
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain(0);
        });
    });
});
