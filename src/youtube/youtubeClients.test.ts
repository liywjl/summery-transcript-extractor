import { describe, expect, it } from "vitest";
import { clientLabel, clientsToTry, DEFAULT_ANDROID_VERSION, extractAppVersion } from "./youtubeClients";

describe("extractAppVersion", () => {
  it("accepts a plain version", () => {
    expect(extractAppVersion("20.45.36")).toBe("20.45.36");
  });

  it("pulls the version out of text copied from a download page", () => {
    expect(extractAppVersion("  YouTube 20.45.36 (1555459520) ")).toBe("20.45.36");
  });

  it("rejects text without a version", () => {
    expect(extractAppVersion("latest")).toBeUndefined();
    expect(extractAppVersion("20.45")).toBeUndefined();
  });
});

describe("clientsToTry", () => {
  it("tries the custom version, then the built-in one, then the iPhone app", () => {
    expect(clientsToTry("20.45.36").map(clientLabel)).toEqual([
      "Android app 20.45.36",
      `Android app ${DEFAULT_ANDROID_VERSION}`,
      "iPhone app 20.10.4",
    ]);
  });

  it("uses the built-in version when none is set", () => {
    expect(clientsToTry("").map(clientLabel)).toEqual([`Android app ${DEFAULT_ANDROID_VERSION}`, "iPhone app 20.10.4"]);
  });

  it("ignores an unreadable custom version", () => {
    expect(clientsToTry("not a version")).toEqual(clientsToTry(""));
  });

  it("does not try the built-in version twice", () => {
    expect(clientsToTry(DEFAULT_ANDROID_VERSION)).toEqual(clientsToTry(""));
  });
});
