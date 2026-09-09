// GET /api/stats -> miitobow.comのCloudflare Web Analytics（RUM）集計をサイト内表示用に返す。
// Cloudflare GraphQL Analytics API (rumPageloadEventsAdaptiveGroups) を、環境変数 CF_ANALYTICS_TOKEN
// （Account Analytics:Read権限のAPIトークン）でサーバー側からのみ叩く。トークン値はクライアントに渡さない。

const ACCOUNT_TAG = "17cc2544057c28d189a5e846fb3f79c9";
const SITE_TAG = "a605107326c34038b1f102869faccfd7"; // beaconトークン＝siteTag（公開埋め込み用の値。秘密ではない）

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

async function runQuery(token, query, variables) {
  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await resp.json();
  if (!resp.ok || json.errors) {
    throw new Error(`graphql_error: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data;
}

const DAILY_QUERY = `
  query DailyStats($accountTag: String!, $siteTag: String!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        rumPageloadEventsAdaptiveGroups(
          limit: 100
          filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }
          orderBy: [date_ASC]
        ) {
          dimensions {
            date
          }
          count
          sum {
            visits
          }
        }
      }
    }
  }
`;

export async function onRequestGet({ env }) {
  if (!env.CF_ANALYTICS_TOKEN) {
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const data = await runQuery(env.CF_ANALYTICS_TOKEN, DAILY_QUERY, {
      accountTag: ACCOUNT_TAG,
      siteTag: SITE_TAG,
      since: isoDaysAgo(30),
      until: new Date().toISOString(),
    });

    const groups = data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
    const daily = groups
      .map((g) => ({
        date: g.dimensions.date,
        pageviews: g.count,
        visits: g.sum?.visits || 0,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const sumLastNDays = (n) => {
      const cutoff = new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return daily
        .filter((d) => d.date >= cutoff)
        .reduce(
          (acc, d) => ({ pageviews: acc.pageviews + d.pageviews, visits: acc.visits + d.visits }),
          { pageviews: 0, visits: 0 }
        );
    };

    const result = {
      last1d: sumLastNDays(1),
      last7d: sumLastNDays(7),
      last30d: sumLastNDays(30),
      daily,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=1800" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "fetch_failed", message: String(e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
