import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

test("toutes les ressources locales de la page existent", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]);
  assert.ok(refs.length >= 5);
  refs.forEach((ref) => assert.equal(fs.existsSync(path.resolve(root, ref)), true, `${ref} doit exister`));
  assert.equal(/https?:\/\//.test(html), false, "le jeu ne doit dépendre d'aucune ressource distante");
});

test("les images CSS et les ressources hors-ligne existent", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const urls = [...css.matchAll(/url\("(\.\/[^"#]+)"\)/g)].map((match) => match[1]);
  urls.forEach((ref) => assert.equal(fs.existsSync(path.resolve(root, ref)), true, `${ref} doit exister`));
  const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(worker, /dog-breed-portrait-atlas\.webp/);
  assert.equal(fs.existsSync(path.join(root, "assets/dog-breed-portrait-atlas.webp")), true);
});

test("le manifeste PWA est valide et orienté portrait", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.name, "TOUTOU48 V2");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.ok(manifest.icons.length >= 1);
});
