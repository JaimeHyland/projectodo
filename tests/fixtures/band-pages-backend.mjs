import http from "node:http";
import { readFileSync } from "node:fs";

// Isolated browser data; no database, S3 or real account is accessed.
const photo = readFileSync(new URL("../../public/guitarist.jpg", import.meta.url));
let options = {};
let page;
let gigs;
let nextPrice;
function reset(value = {}) {
  options = value;
  page = {
    id: 1, slug: "test-band", published: true, description_html: "Band description",
    description_translations: { en: "English page", de: "Deutsche Seite", es: "Pagina espanola" },
    background_colour: "#112233", foreground_colour: "#ffffff",
    main_image: "/cms-media/bands/main/photo.jpg",
    image_caption: { en: "English caption", de: "Deutsche Bildunterschrift", es: "Pie de foto" },
    image_alt: { en: "Photograph en", de: "Photograph de", es: "Photograph es" },
    audio_url: "https://media.example.test/clip.mp3", video_url: "https://media.example.test/clip.mp4",
    video_captions_url: "", server_time: "2030-01-10T18:00:00Z",
    band: { id: 1, name: "Test band", description: "Legacy band", description_translations: {
      en: "English band", de: "Deutsche Band", es: "Grupo espanol",
    }, genres: [], members: [], contact_email: "", contact_tel: "", website_url: "" },
    upcoming_gigs: [
      { id: 1, venue: "Tonight", city: "Berlin", starts_at: "2030-01-10T20:00:00+01:00", ticket_prices: [{ id: 1, description: "Advance", price: "12.30" }] },
      { id: 2, venue: "Tomorrow", city: "Berlin", starts_at: "2030-01-11T20:00:00+01:00", ticket_prices: [{ id: 2, description: "Standard", price: "20.00" }] },
    ],
  };
  gigs = page.upcoming_gigs.map(gig => ({ ...gig, date: gig.starts_at.slice(0, 10),
    start_time: gig.starts_at.slice(11, 19), venue_translations: {
      en: gig.venue, de: gig.id === 1 ? "Heute" : "Morgen", es: gig.id === 1 ? "Esta noche" : "Manana",
    }, ticket_prices: gig.ticket_prices.map(price => ({ ...price, description_translations: {
      en: price.description, de: "Vorverkauf", es: "Anticipada",
    } })) }));
  nextPrice = 3;
  if (options.blankDescription) page.description_translations.en = "";
  if (options.legacy) {
    for (const key of ["description_translations", "main_image", "image_caption", "image_alt", "audio_url", "video_url", "video_captions_url", "upcoming_gigs", "server_time"]) delete page[key];
  }
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
  if (path.includes("/auth/status/")) {
    response.setHeader("Set-Cookie", "csrftoken=fixture; Path=/; SameSite=Lax");
    return send({ is_authenticated: true, username: "test-admin", is_superuser: !options.ordinary, groups: [] });
  }
  if (path.startsWith("/cms-media/")) { response.writeHead(200, { "Content-Type": "image/jpeg" }); return response.end(photo); }
  const gigRoute = path.match(/^\/api\/bands\/admin\/bands\/1\/gigs\/(\d+\/)?$/);
  if (gigRoute) {
    if (options.denyGigSave && request.method !== "GET") return send({ error: "Forbidden" }, 403);
    if (request.method === "GET") return send({ gigs });
    const id = gigRoute[1] ? Number(gigRoute[1].slice(0, -1)) : Math.max(0, ...gigs.map(gig => gig.id)) + 1;
    if (request.method === "DELETE") { gigs = gigs.filter(gig => gig.id !== id); return send({ ok: true }); }
    const data = JSON.parse(body.toString());
    const result = { ...data, id, venue: data.venue || Object.values(data.venue_translations)[0],
      ticket_prices: data.ticket_prices.map(price => ({ ...price, id: price.id ?? nextPrice++,
        description: price.description || Object.values(price.description_translations)[0] })) };
    gigs = [...gigs.filter(gig => gig.id !== id), result];
    return send(result, request.method === "POST" ? 201 : 200);
  }
  if (path === "/api/bands/admin/bands/1/page/image/") {
    page.main_image = "/cms-media/bands/main/replacement.jpg";
    return send({ main_image: page.main_image });
  }
  if (path === "/api/bands/pages/test-band/" || path === "/api/bands/admin/bands/1/page/") {
    if (request.method === "PATCH") {
      const data = JSON.parse(body.toString());
      page = { ...page, ...data, band: { ...page.band, description_translations: data.band_description_translations ?? page.band.description_translations } };
    }
    if (!options.legacy) page.upcoming_gigs = gigs.map(gig => ({ ...gig, starts_at: `${gig.date}T${gig.start_time}+01:00` }));
    return send(page);
  }
  if (path === "/api/bands/pages/") return send({ pages: [{ ...page, band: page.band }] });
  return send({});
}).listen(8126, "127.0.0.1");
