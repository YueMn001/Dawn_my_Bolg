const DEFAULT_LIKE_COUNT = 2305;
const COUNTER_ID = "dawn-voyager-blog";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function prepareDatabase(db) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS counters (id TEXT PRIMARY KEY, like_count INTEGER NOT NULL)"
    )
    .run();
}

async function readCount(db) {
  await db
    .prepare("INSERT OR IGNORE INTO counters (id, like_count) VALUES (?, ?)")
    .bind(COUNTER_ID, DEFAULT_LIKE_COUNT)
    .run();

  const row = await db
    .prepare("SELECT like_count FROM counters WHERE id = ?")
    .bind(COUNTER_ID)
    .first();

  return Number(row?.like_count || DEFAULT_LIKE_COUNT);
}

async function addLike(db) {
  const row = await db
    .prepare(
      "INSERT INTO counters (id, like_count) VALUES (?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET like_count = like_count + 1 " +
        "RETURNING like_count"
    )
    .bind(COUNTER_ID, DEFAULT_LIKE_COUNT + 1)
    .first();

  return Number(row?.like_count || DEFAULT_LIKE_COUNT + 1);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!env.LIKE_DB) {
      return json({ error: "LIKE_DB binding is missing.", count: DEFAULT_LIKE_COUNT }, 500);
    }

    await prepareDatabase(env.LIKE_DB);

    if (request.method === "GET") {
      return json({ count: await readCount(env.LIKE_DB) });
    }

    if (request.method === "POST") {
      return json({ count: await addLike(env.LIKE_DB) });
    }

    return json({ error: "Method not allowed." }, 405);
  }
};
