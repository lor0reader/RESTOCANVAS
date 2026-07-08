import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, hasSupabaseConfig } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_ID = "restaurant_default";
const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "restaurant-state.json");

const ARRAY_KEYS = new Set([
  "zones",
  "tables",
  "bookings",
  "admins",
  "sessions",
  "tasks"
]);

const OBJECT_KEYS = new Set([
  "appConfig"
]);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function itemIdentity(item: unknown, index: number) {
  if (isRecord(item)) {
    const id = item.id || item.code || item.sku || item.partId;
    if (id) return String(id);
  }
  return `idx:${index}:${JSON.stringify(item)}`;
}

function mergeArrayById(current: unknown[], incoming: unknown[]) {
  const result: unknown[] = [];
  const seen = new Set<string>();
  [...incoming, ...current].forEach((item, index) => {
    const id = itemIdentity(item, index);
    if (seen.has(id)) return;
    seen.add(id);
    result.push(item);
  });
  return result;
}

export function mergeState(current: unknown, incoming: unknown) {
  if (!isRecord(current) || !isRecord(incoming)) return incoming;

  const merged: Record<string, unknown> = { ...current, ...incoming };
  Object.keys(incoming).forEach((key) => {
    const currentValue = current[key];
    const incomingValue = incoming[key];
    if (ARRAY_KEYS.has(key) && Array.isArray(currentValue) && Array.isArray(incomingValue)) {
      merged[key] = mergeArrayById(currentValue, incomingValue);
      return;
    }
    if (OBJECT_KEYS.has(key) && isRecord(currentValue) && isRecord(incomingValue)) {
      merged[key] = { ...currentValue, ...incomingValue };
    }
  });

  merged._meta = {
    ...(isRecord(current._meta) ? current._meta : {}),
    ...(isRecord(incoming._meta) ? incoming._meta : {}),
    mergedAt: new Date().toISOString(),
  };

  return merged;
}

async function readLocalState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { data: null, updatedAt: null };
    }
    return {
      data: Object.prototype.hasOwnProperty.call(parsed, "data") ? parsed.data : parsed,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (error) {
    if (isMissingFile(error)) return { data: null, updatedAt: null };
    throw error;
  }
}

async function writeLocalState(data: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const updatedAt = new Date().toISOString();
  const tmpFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(
    tmpFile,
    JSON.stringify({ data, updatedAt }, null, 2),
    "utf8",
  );
  await fs.rename(tmpFile, STATE_FILE);
  return updatedAt;
}

async function readSupabaseState() {
  if (!hasSupabaseConfig) {
    return { ok: false as const, reason: "Supabase is not configured" };
  }

  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("restaurant_state")
      .select("data, updated_at")
      .eq("id", STATE_ID)
      .maybeSingle();

    if (error) return { ok: false as const, reason: error.message };
    return {
      ok: true as const,
      data: data?.data ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  } catch (error) {
    return { ok: false as const, reason: errorMessage(error) };
  }
}

export async function GET() {
  const remote = await readSupabaseState();
  if (remote.ok) {
    return NextResponse.json(
      {
        data: remote.data,
        updatedAt: remote.updatedAt,
        mode: "supabase",
      },
    );
  }

  try {
    const local = await readLocalState();
    return NextResponse.json({
      data: local.data,
      updatedAt: local.updatedAt,
      mode: "local-file",
      fallbackReason: remote.reason,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: errorMessage(error), mode: "local-file" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("data" in body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let fallbackReason = hasSupabaseConfig ? null : "Supabase is not configured";
  let dataToSave = body.data;
  if (hasSupabaseConfig) {
    try {
      const supabase = createClient(await cookies());
      const { error } = await supabase.from("restaurant_state").upsert({
        id: STATE_ID,
        data: dataToSave,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        await writeLocalState(dataToSave).catch(() => null);
        return NextResponse.json({ ok: true, mode: "supabase" });
      }
      fallbackReason = error.message;
    } catch (error) {
      fallbackReason = errorMessage(error);
    }
  }

  try {
    const updatedAt = await writeLocalState(dataToSave);
    return NextResponse.json({
      ok: true,
      mode: "local-file",
      updatedAt,
      fallbackReason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error), mode: "local-file", fallbackReason },
      { status: 503 },
    );
  }
}
