#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { TOOLHIVE_VERSION } from "../utils/constants";

const url = `https://raw.githubusercontent.com/stacklok/toolhive/${TOOLHIVE_VERSION}/docs/server/swagger.json`;
const dest = path.resolve("./src/common/api/openapi.json");

console.log(`Fetching OpenAPI spec from: ${url}`);
const res = await fetch(url);
if (!res.ok) {
  throw new Error(
    `Failed to fetch OpenAPI spec: ${res.status} ${res.statusText}`,
  );
}
const data = await res.text();
await writeFile(dest, data);
console.log(`Saved OpenAPI spec to: ${dest}`);

console.log("Formatting with Prettier...");
const prettier = await import("prettier");
const formatted = await prettier.format(data, { parser: "json" });
await writeFile(dest, formatted);
console.log("Formatted with Prettier.");
