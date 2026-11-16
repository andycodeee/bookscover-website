const ENDPOINTS = {
  catalogSearch: {
    host: "catalog.roblox.com",
    path: "/v1/search/items/details"
  },
  assetThumbnails: {
    host: "thumbnails.roblox.com",
    path: "/v1/assets"
  },
  bundleThumbnails: {
    host: "thumbnails.roblox.com",
    path: "/v1/bundles/thumbnails"
  },
  gameThumbnails: {
    host: "thumbnails.roblox.com",
    path: "/v1/games/multiget/thumbnails"
  },
  avatarHeadshot: {
    host: "thumbnails.roblox.com",
    path: "/v1/users/avatar-headshot"
  },
  userSearch: {
    host: "users.roblox.com",
    path: "/v1/users/search"
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { endpoint, ...params } = req.query;
  let upstreamEndpoint = ENDPOINTS[endpoint];

  if (endpoint === "universeByPlace") {
    const placeId = params.placeId;
    delete params.placeId;
    if (typeof placeId === "string" && /^\d+$/.test(placeId)) {
      upstreamEndpoint = {
        host: "apis.roblox.com",
        path: `/universes/v1/places/${placeId}/universe`
      };
    }
  }

  if (!upstreamEndpoint) {
    return res.status(400).json({ error: "Unsupported Roblox API endpoint" });
  }

  const upstreamUrl = new URL(`https://${upstreamEndpoint.host}${upstreamEndpoint.path}`);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(item => upstreamUrl.searchParams.append(key, item));
    } else if (typeof value === "string") {
      upstreamUrl.searchParams.set(key, value);
    }
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl);
    const body = await upstreamResponse.text();
    res.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(upstreamResponse.status).send(body);
  } catch (error) {
    console.error("Roblox API proxy request failed:", error);
    return res.status(502).json({ error: "Roblox API is temporarily unavailable" });
  }
};