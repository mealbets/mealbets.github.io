export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      url.pathname = "/index.html";
    }

    const response = await env.ASSETS.fetch(new Request(url, request));
    const contentType = response.headers.get("Content-Type") || "";

    // Also cover HTML returned through the Worker, including fallback pages.
    if (contentType.split(";", 1)[0].trim().toLowerCase() === "text/html") {
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/html; charset=utf-8");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
