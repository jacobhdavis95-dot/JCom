import { access, readFile } from "node:fs/promises";

const required = ["index.html", "styles.css", "app.js", "core.mjs", "manifest.webmanifest", "sw.js"];
for (const file of required) await access(file);
const html = await readFile("index.html", "utf8");
const ids = ["app", "nav", "toast", "modal-root"];
for (const id of ids) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);
}
console.log("JCom production files validated.");
