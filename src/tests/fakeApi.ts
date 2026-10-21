import { vi } from "vitest";

export interface FakeRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * In-memory stand-in for the API server, installed over `fetch`. Mirrors the
 * behaviour the client relies on: cookie-less session flag, 401 without a
 * session, 403 when a write lacks the CSRF token.
 */
export function installFakeApi(options: { password?: string; role?: "ADMIN" | "EDITOR" } = {}) {
  const password = options.password ?? "dogru-sifre-123";
  const user = { id: "u1", email: "ada@example.com", name: "Ada", role: options.role ?? "ADMIN" };
  const csrf = "csrf-token";
  const state = {
    signedIn: false,
    content: {} as Record<string, unknown>,
    uploads: 0,
    quotes: [] as { id: string; status: string; [key: string]: unknown }[],
  };
  const requests: FakeRequest[] = [];

  const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
    });

  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    requests.push({ method, url, headers, body });

    if (url === "/api/auth/login" && method === "POST") {
      const { email, password: given } = body as { email: string; password: string };
      if (email !== user.email || given !== password) return json(401, { message: "E-posta veya şifre hatalı." });
      state.signedIn = true;
      return json(200, { user, csrfToken: csrf });
    }
    if (!state.signedIn) return json(401, { message: "Oturum açmanız gerekiyor." });
    if (method !== "GET" && headers["X-CSRF-Token"] !== csrf) return json(403, { message: "CSRF doğrulaması başarısız." });

    if (url === "/api/auth/me") return json(200, { user, csrfToken: csrf });
    if (url === "/api/auth/logout") {
      state.signedIn = false;
      return json(204);
    }
    const content = /^\/api\/admin\/content\/(\w+)$/.exec(url);
    if (content && method === "PUT") {
      state.content[content[1]] = (body as { value: unknown }).value;
      return json(204);
    }
    if (content && method === "DELETE") {
      delete state.content[content[1]];
      return json(204);
    }
    if (url === "/api/admin/products" && method === "PUT") {
      state.content.products = (body as { products: unknown }).products;
      return json(204);
    }
    if (url === "/api/admin/categories" && method === "PUT") {
      state.content.categories = (body as { categories: unknown }).categories;
      return json(204);
    }
    if (url === "/api/admin/quotes" && method === "GET") return json(200, state.quotes);
    const quote = /^\/api\/admin\/quotes\/([\w-]+)$/.exec(url);
    if (quote && method === "PATCH") {
      const found = state.quotes.find((q) => q.id === quote[1]);
      if (!found) return json(404, { message: "Teklif talebi bulunamadı." });
      found.status = (body as { status: string }).status;
      return json(200, found);
    }
    if (url === "/api/admin/media" && method === "POST") {
      state.uploads += 1;
      return json(201, { url: `/api/media/00000000-0000-4000-8000-${String(state.uploads).padStart(12, "0")}.jpg` });
    }
    return json(404, { message: "Not found" });
  });

  return {
    user,
    password,
    state,
    requests,
    signIn: () => {
      state.signedIn = true;
    },
    restore: () => spy.mockRestore(),
  };
}
