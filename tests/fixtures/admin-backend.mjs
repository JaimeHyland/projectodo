import http from "node:http";

// Isolated server-side dashboard fixtures; never connect these tests to real data.
http.createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const data = path.includes("/auth/status/")
    ? { is_authenticated: true, username: "test-admin", is_superuser: true, groups: [] }
    : path === "/api/courses/locations/"
      ? { locations: [{ id: 1, location_type: "physical", name: "Test studio", street_address: "", city: "Berlin", state: "", postcode: "", country: "DE" }] }
      : path.includes("user-group-counts")
        ? Object.fromEntries(["total", "ordinary", "superusers", "webmasters", "teachers", "students", "band_leaders", "press"].map(key => [key, 0]))
        : { users: [], bands: [] };
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}).listen(8124, "127.0.0.1");
