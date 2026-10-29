import { describe, it, expect } from "vitest";
import {
  cn,
  formatDuration,
  calculateScore,
  truncate,
  getGradeLabel,
  formatDate,
  sampleArray,
} from "../index";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("bg-blue-500", "bg-red-500")).toBe("bg-red-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});

describe("formatDuration()", () => {
  it("formats 0 seconds", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("formats 65 seconds", () => {
    expect(formatDuration(65)).toBe("01:05");
  });

  it("formats 3600 seconds (1 hour)", () => {
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("handles negative seconds (timer overrun)", () => {
    expect(formatDuration(-5)).toBe("00:05");
  });
});

describe("calculateScore()", () => {
  it("calculates 100% for all correct", () => {
    expect(calculateScore(40, 40)).toBe(100);
  });

  it("calculates 50% for half correct", () => {
    expect(calculateScore(20, 40)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(calculateScore(1, 3)).toBe(33);
  });

  it("returns 0 for zero total (no division by zero)", () => {
    expect(calculateScore(0, 0)).toBe(0);
  });
});

describe("truncate()", () => {
  it("does not truncate short text", () => {
    expect(truncate("Hello", 100)).toBe("Hello");
  });

  it("truncates and appends ellipsis", () => {
    const long = "a".repeat(110);
    const result = truncate(long, 100);
    expect(result).toHaveLength(100);
    expect(result.endsWith("...")).toBe(true);
  });

  it("defaults to 100 characters", () => {
    const long = "b".repeat(110);
    expect(truncate(long)).toHaveLength(100);
  });
});

describe("getGradeLabel()", () => {
  it("returns Excellent for 75+", () => {
    expect(getGradeLabel(75)).toBe("Excellent");
    expect(getGradeLabel(100)).toBe("Excellent");
  });

  it("returns Good for 60–74", () => {
    expect(getGradeLabel(60)).toBe("Good");
    expect(getGradeLabel(74)).toBe("Good");
  });

  it("returns Pass for 50–59", () => {
    expect(getGradeLabel(50)).toBe("Pass");
  });

  it("returns Fail for below 40", () => {
    expect(getGradeLabel(39)).toBe("Fail");
    expect(getGradeLabel(0)).toBe("Fail");
  });
});

describe("formatDate()", () => {
  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatDate("2026-10-29T10:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("sampleArray()", () => {
  it("returns the requested count", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(sampleArray(arr, 5)).toHaveLength(5);
  });

  it("returns all elements if count >= length", () => {
    const arr = [1, 2, 3];
    expect(sampleArray(arr, 10)).toHaveLength(3);
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    sampleArray(arr, 3);
    expect(arr).toEqual(original);
  });

  it("returns unique items from the source", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = sampleArray(arr, 5);
    const unique = new Set(result);
    expect(unique.size).toBe(5);
  });
});

