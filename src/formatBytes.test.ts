import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("shows small sizes in kilobytes", () => {
    expect(formatBytes(48_000)).toBe("47 KB");
  });

  it("shows large sizes in megabytes", () => {
    expect(formatBytes(3_250_000)).toBe("3.1 MB");
  });
});
