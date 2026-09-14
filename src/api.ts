import type { HealthResponse, PublicVehicle, SoldStub, VehicleListResponse, VehicleResponse } from "./contract.ts";

/**
 * The HTTP calls to BilBoost's read API. Timeouts are short on purpose: a
 * render that hangs past the page's own stale window is worse than a 503 the
 * edge can serve stale around.
 */

/**
 * Measured 2026-09-14 in `wrangler dev`: the first list fetch on a cold
 * isolate went past 4 s and the page answered 503 once. 8 s is still well
 * inside the 300 s freshness window a stale-while-revalidate refresh has.
 */
export const FETCH_TIMEOUT_MS = 8_000;

export class BilboostError extends Error {
  readonly code: "sold" | "not_found" | "unavailable";
  readonly stub?: SoldStub;
  readonly status?: number;
  constructor(code: BilboostError["code"], message: string, extra: { stub?: SoldStub; status?: number } = {}) {
    super(message);
    this.name = "BilboostError";
    this.code = code;
    this.stub = extra.stub;
    this.status = extra.status;
  }
}

export type ApiClient = {
  apiBase: string;
  siteKey: string;
  readToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const request = async (client: ApiClient, path: string): Promise<Response> => {
  const fetchImpl = client.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), client.timeoutMs ?? FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(`${client.apiBase}/public/v1/sites/${client.siteKey}${path}`, {
      headers: { Authorization: `Bearer ${client.readToken}`, Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    const message = controller.signal.aborted ? "BilBoost svarede ikke i tide" : err instanceof Error ? err.message : String(err);
    throw new BilboostError("unavailable", message);
  } finally {
    clearTimeout(timer);
  }
};

export const fetchVehicleList = async (client: ApiClient): Promise<VehicleListResponse> => {
  const res = await request(client, "/vehicles");
  if (!res.ok) throw new BilboostError("unavailable", `BilBoost svarede ${res.status}`, { status: res.status });
  return (await res.json()) as VehicleListResponse;
};

export const fetchVehicle = async (client: ApiClient, bilboostId: string): Promise<PublicVehicle> => {
  const res = await request(client, `/vehicles/${encodeURIComponent(bilboostId)}`);
  if (res.status === 404) throw new BilboostError("not_found", "Bilen findes ikke", { status: 404 });
  if (res.status === 410) {
    const body = (await res.json().catch(() => ({}))) as { vehicle?: SoldStub };
    throw new BilboostError("sold", "Bilen er solgt", { status: 410, stub: body.vehicle });
  }
  if (!res.ok) throw new BilboostError("unavailable", `BilBoost svarede ${res.status}`, { status: res.status });
  return ((await res.json()) as VehicleResponse).vehicle;
};

export const fetchHealth = async (client: ApiClient): Promise<HealthResponse> => {
  const res = await request({ ...client, timeoutMs: client.timeoutMs ?? 3_000 }, "/health");
  if (!res.ok) throw new BilboostError("unavailable", `BilBoost svarede ${res.status}`, { status: res.status });
  return (await res.json()) as HealthResponse;
};
