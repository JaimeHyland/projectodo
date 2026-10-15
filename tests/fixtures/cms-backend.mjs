import http from "node:http";
import { readFileSync } from "node:fs";

// Isolated CMS browser fixtures. No database, S3, credentials or real backend calls.
const catalogue = JSON.parse(readFileSync(new URL("../../backend/core/cms_catalogue.json", import.meta.url)));
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=", "base64");
let values;
let scenario;
function reset(options = {}) {
  values = Object.fromEntries(catalogue.fields.map(field => [field.id, { ...field.initial }]));
  scenario = options;
  for (const [id, translations] of Object.entries(options.values ?? {})) values[id] = { ...values[id], ...translations };
  for (const [id, locale] of options.missing ?? []) delete values[id][locale];
}
reset();

http.createServer(async (request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  if (path === "/__scenario") { reset(JSON.parse(body.toString() || "{}")); return send({ ok: true }); }
  if (path.includes("/auth/status/")) return send({ is_authenticated: true, username: "test-admin", is_superuser: !scenario.ordinary, groups: [] });
  if (path === "/api/content/admin/") {
    response.setHeader("Set-Cookie", "csrftoken=fixture; Path=/; SameSite=Lax");
    return send({ locales: catalogue.locales, items: catalogue.fields.map(field => ({ ...field, values: values[field.id], fallbacks: field.initial })) });
  }
  const admin = path.match(/^\/api\/content\/admin\/([^/]+)\/(en|de|es)\/(image\/)?$/);
  if (admin) {
    const [, id, locale, image] = admin;
    if (image && scenario.uploadFail) return send({ error: "image_storage" }, 503);
    const value = image ? "/cms-media/fixture.jpg" : JSON.parse(body.toString()).value;
    values[id][locale] = value;
    return send({ value });
  }
  const publicMatch = path.match(/^\/api\/content\/public\/([^/]+)\/(en|de|es)\/$/);
  if (publicMatch) {
    if (scenario.publicMode === "disconnect") return request.socket.destroy();
    if (scenario.publicMode === "unavailable") return send({}, 503);
    const [, page, locale] = publicMatch;
    const result = scenario.publicMode === "missing" ? {} : Object.fromEntries(catalogue.fields
      .filter(field => field.page === page && Object.hasOwn(values[field.id], locale))
      .map(field => [field.id, values[field.id][locale]]));
    return send({ values: result });
  }
  if (path.startsWith("/cms-media/")) { response.writeHead(200, { "Content-Type": "image/png" }); return response.end(pixel); }
  if (path.includes("user-group-counts")) return send(Object.fromEntries(["total", "ordinary", "superusers", "webmasters", "teachers", "students", "band_leaders", "press"].map(key => [key, 0])));
  return send({ users: [], bands: [], pages: [], locations: [] });
}).listen(8125, "127.0.0.1");
