// 一時デバッグ用: siteTagフィルタ無しでアカウント内のsiteTag一覧と件数を見る（原因調査用・後で削除）
const ACCOUNT_TAG = "17cc2544057c28d189a5e846fb3f79c9";
const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const QUERY = `
  query DebugStats($accountTag: String!, $since: Time!, $until: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        rumPageloadEventsAdaptiveGroups(
          limit: 50
          filter: { datetime_geq: $since, datetime_leq: $until }
          orderBy: [count_DESC]
        ) {
          dimensions {
            siteTag
          }
          count
        }
      }
    }
  }
`;

export async function onRequestGet({ env }) {
  if (!env.CF_ANALYTICS_TOKEN) {
    return new Response(JSON.stringify({ error: "not_configured" }), { status: 503 });
  }
  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
    body: JSON.stringify({
      query: QUERY,
      variables: { accountTag: ACCOUNT_TAG, since: isoDaysAgo(30), until: new Date().toISOString() },
    }),
  });
  const json = await resp.json();
  return new Response(JSON.stringify(json), { headers: { "content-type": "application/json" } });
}
