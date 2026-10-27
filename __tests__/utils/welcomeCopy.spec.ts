/** @jest-environment node */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("canonical welcome bytes", () => {
  it("ships the approved welcome as exact UTF-8 bytes without a final newline", () => {
    const welcome = readFileSync(
      path.join(process.cwd(), "public/Users/Public/Documents/Welcome.txt")
    );

    expect(welcome).toHaveLength(525);
    expect(createHash("sha256").update(welcome).digest("hex")).toBe(
      "8cfade6f56f8046d1a2deae329e43d3f024095917d18dc11e436b095d9c9fb36"
    );
    expect(welcome.toString("utf8").endsWith("\n")).toBe(false);
  });
});
