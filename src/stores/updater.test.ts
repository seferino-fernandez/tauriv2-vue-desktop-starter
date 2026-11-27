import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUpdaterStore } from "./updater";

/** Answers the updater commands; `check_for_update` returns `found` */
function mockUpdater(found: unknown, fail: Array<string> = []) {
  const sent: Array<string> = [];
  vi.stubGlobal("isTauri", true);
  mockIPC((command) => {
    sent.push(command);
    if (fail.includes(command)) {
      throw new Error("offline");
    }
    if (command === "updater_available") {
      return true;
    }
    if (command === "check_for_update") {
      return found;
    }
    return null;
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  return sent;
}

beforeEach(() => setActivePinia(createPinia()));

afterEach(() => {
  clearMocks();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("updater store", () => {
  it("stays hidden outside the app", async () => {
    const updater = useUpdaterStore();
    await updater.init();
    expect(updater.available).toBe(false);
  });

  it("knows when the build can update itself", async () => {
    mockUpdater(null);
    const updater = useUpdaterStore();
    await updater.init();
    expect(updater.available).toBe(true);
  });

  it("says so when this is the latest version", async () => {
    mockUpdater(null);
    const updater = useUpdaterStore();
    await updater.check();
    expect(updater.step).toBe("upToDate");
  });

  it("offers a newer version, installs it only when asked, then offers a restart", async () => {
    const sent = mockUpdater({ version: "1.1.0", currentVersion: "1.0.0" });
    const updater = useUpdaterStore();

    await updater.check();
    expect(updater.step).toBe("available");
    expect(updater.update?.version).toBe("1.1.0");
    expect(sent).not.toContain("install_update");

    await updater.install();
    expect(updater.step).toBe("installed");
    expect(sent).not.toContain("restart_app");
  });

  it("tells a failed check from a failed install", async () => {
    mockUpdater(null, ["check_for_update"]);
    const updater = useUpdaterStore();
    await updater.check();
    expect(updater.step).toBe("checkFailed");

    mockUpdater({ version: "1.1.0", currentVersion: "1.0.0" }, ["install_update"]);
    await updater.check();
    await updater.install();
    expect(updater.step).toBe("installFailed");
  });

  it("cannot be closed while downloading", () => {
    const updater = useUpdaterStore();
    updater.step = "downloading";
    updater.close();
    expect(updater.step).toBe("downloading");
  });

  it("reports the download in percent once its size is known", () => {
    const updater = useUpdaterStore();
    updater.progress = { downloaded: 512, total: null };
    expect(updater.percent).toBeNull();
    updater.progress = { downloaded: 512, total: 1024 };
    expect(updater.percent).toBe(50);
  });
});
