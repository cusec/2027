import assert from "node:assert/strict";

const origin = "https://2027.cusec.net";
const base = process.argv[2] || "http://localhost:3001";
const paths = [
  "/", "/fr-CA", "/speakers", "/fr-CA/speakers", "/sponsors",
  "/fr-CA/sponsors", "/tickets", "/fr-CA/tickets", "/code-of-conduct",
  "/privacy-policy", "/ticket-terms",
];

async function read(path) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    headers: { "User-Agent": "Googlebot" },
    signal: AbortSignal.timeout(60_000),
  });
  assert.equal(response.status, 200, `${path}: HTTP status`);
  assert.doesNotMatch(response.headers.get("x-robots-tag") || "", /noindex/i, path);
  return response.text();
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1].toLowerCase(), match[2]]),
  );
}

function checkEvents(value, property = "") {
  if (!value || typeof value !== "object") return 0;
  const types = [value["@type"]].flat();
  const isEvent = types.includes("Event") || ["superEvent", "subEvent"].includes(property);
  let count = Object.entries(value).reduce(
    (total, [key, child]) => total + checkEvents(child, key), 0,
  );
  if (isEvent) {
    assert.equal(typeof value.name, "string", "Event name must be local");
    assert.notEqual(value.name.trim(), "", "Event name must not be empty");
    assert.match(value.startDate, /^\d{4}-\d{2}-\d{2}/, "Event startDate");
    assert.equal(value.location?.["@type"], "Place", "Event location");
    assert.equal(typeof value.location.name, "string", "Event location name");
    assert.equal(value.organizer?.["@type"], "Organization", "Event organizer");
    assert.equal(value.organizer.name, "CUSEC", "Event organizer name");
    assert.equal(value.image, `${origin}/cusec-logo.png`, "Event image");
    count += 1;
  }
  return count;
}

const [robots, sitemap] = await Promise.all([read("/robots.txt"), read("/sitemap.xml")]);
assert.match(robots, /Sitemap: https:\/\/2027\.cusec\.net\/sitemap\.xml/);
const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((match) => match[1]);
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
const results = await Promise.all(paths.map(async (path) => {
  const html = await read(path);
  const canonical = new URL(path, origin).href;
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => attributes(match[0]));
  const canonicals = links.filter((link) => link.rel === "canonical");
  assert.equal(canonicals.length, 1, `${path}: one canonical`);
  assert.equal(new URL(canonicals[0].href).href, canonical, `${path}: canonical`);
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map((match) => attributes(match[0]));
  const directives = meta.filter((tag) => ["robots", "googlebot"].includes(tag.name));
  assert.ok(directives.some((tag) => /\bindex\b/.test(tag.content)), `${path}: indexable`);
  for (const tag of directives) assert.doesNotMatch(tag.content, /noindex/i, path);
  for (const rule of disallowed) assert.ok(!path.startsWith(rule), `${path}: robots allow`);
  const entry = entries.find((item) => item.includes(`<loc>${canonical}</loc>`));
  assert.ok(entry, `${path}: sitemap entry`);
  const translated = !["/code-of-conduct", "/privacy-policy", "/ticket-terms"].includes(path);
  if (translated) {
    const english = path.replace(/^\/fr-CA/, "") || "/";
    const french = english === "/" ? "/fr-CA" : `/fr-CA${english}`;
    for (const [language, target] of [["en-CA", english], ["fr-CA", french], ["x-default", english]]) {
      const href = new URL(target, origin).href;
      assert.ok(links.some((link) => link.rel === "alternate" && link.hreflang === language && new URL(link.href).href === href), `${path}: ${language} alternate`);
      assert.ok(entry.includes(`hreflang="${language}" href="${href}"`), `${path}: sitemap ${language}`);
    }
  }
  const schemas = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((match) => attributes(match[1]).type === "application/ld+json")
    .map((match) => JSON.parse(match[2]));
  const events = schemas.reduce((total, schema) => total + checkEvents(schema), 0);
  if (["/", "/fr-CA"].includes(path)) assert.equal(events, 1, `${path}: one complete Event`);
  return `${path}: 200, canonical, indexable, sitemap${events ? ", 1 complete Event" : ""}`;
}));
const image = await fetch(new URL("/cusec-logo.png", base));
assert.equal(image.status, 200, "Event image accessible");
assert.match(image.headers.get("content-type"), /^image\//, "Event image content type");
console.log(results.join("\n"));
console.log(`SEO checks passed: ${paths.length} pages, 2 Events, image and robots.txt (${base})`);
