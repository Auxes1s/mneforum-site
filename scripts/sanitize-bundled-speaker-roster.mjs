import fs from "node:fs";

const indexPath = new URL("../index.html", import.meta.url);
const raw = fs.readFileSync(indexPath, "utf8");
const openTag = '<script type="__bundler/template">';
const closeTag = "</script>";
const start = raw.indexOf(openTag);
if (start < 0) throw new Error("Bundled template opening tag not found");
const contentStart = start + openTag.length;
const end = raw.indexOf(closeTag, contentStart);
if (end < 0) throw new Error("Bundled template closing tag not found");

const template = JSON.parse(raw.slice(contentStart, end));
const rosterPattern = /const SPEAKERS = \[[\s\S]*?\n\];/;
if (!rosterPattern.test(template)) {
  throw new Error("Indicative speaker roster was not found exactly once");
}

const sanitizedTemplate = template.replace(rosterPattern, "const SPEAKERS = [\n];");
const encoded = JSON.stringify(sanitizedTemplate).replaceAll("</", "<\\u002F");
const output = raw.slice(0, contentStart) + encoded + raw.slice(end);
fs.writeFileSync(indexPath, output, "utf8");
