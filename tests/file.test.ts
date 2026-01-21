import { unlinkSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { formatDate, readTodayFile, writeTodayFile } from "@/file";

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_HEADER_REGEX = /^## \d{4}-\d{2}-\d{2}\n/;

describe("formatDate", () => {
  test("returns date in YYYY-MM-DD format", () => {
    const result = formatDate();
    expect(result).toMatch(DATE_FORMAT_REGEX);
  });

  test("pads single-digit months and days", () => {
    const result = formatDate();
    const parts = result.split("-");
    expect(parts[1]).toHaveLength(2);
    expect(parts[2]).toHaveLength(2);
  });
});

describe("readTodayFile", () => {
  const testFile = "./test-today.txt";

  afterEach(() => {
    try {
      unlinkSync(testFile);
    } catch (_error) {
      // File doesn't exist
    }
  });

  test("returns empty string for non-existent file", async () => {
    const result = await readTodayFile("./non-existent-file.txt");
    expect(result).toBe("");
  });

  test("reads existing file content", async () => {
    const content = "Test content";
    await Bun.write(testFile, content);
    const result = await readTodayFile(testFile);
    expect(result).toBe(content);
  });
});

describe("writeTodayFile", () => {
  const testFile = "./test-today-write.txt";

  afterEach(() => {
    try {
      unlinkSync(testFile);
    } catch (_error) {
      // File doesn't exist
    }
  });

  test("creates new file with entry", async () => {
    const entry = "My todo for today";
    await writeTodayFile(entry, testFile);

    const content = await readTodayFile(testFile);
    expect(content).toContain(entry);
    expect(content).toMatch(DATE_HEADER_REGEX);
  });

  test("prepends new entry to existing content", async () => {
    const firstEntry = "First entry";
    const secondEntry = "Second entry";

    await writeTodayFile(firstEntry, testFile);
    await writeTodayFile(secondEntry, testFile);

    const content = await readTodayFile(testFile);
    const firstIndex = content.indexOf(secondEntry);
    const secondIndex = content.indexOf(firstEntry);

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(-1);
  });

  test("includes date header for each entry", async () => {
    const entry = "Test entry";
    await writeTodayFile(entry, testFile);

    const content = await readTodayFile(testFile);
    const datePattern = /## \d{4}-\d{2}-\d{2}/g;
    const matches = content.match(datePattern);

    expect(matches).toHaveLength(1);
  });
});
