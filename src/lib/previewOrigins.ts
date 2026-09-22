type PreviewEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
  AUTH0_PREVIEW_CLIENT_ID?: string;
  AUTH0_PREVIEW_CLIENT_SECRET?: string;
};

export function previewOrigins(env: PreviewEnv = process.env): string[] {
  if (env.VERCEL_ENV !== "preview") return [];

  return [...new Set(
    [env.VERCEL_BRANCH_URL, env.VERCEL_URL]
      .filter((host): host is string => Boolean(host))
      .map((host) => `https://${host}`),
  )];
}

export function previewAuth0Credentials(env: PreviewEnv = process.env) {
  if (env.VERCEL_ENV !== "preview") return null;

  const clientId = env.AUTH0_PREVIEW_CLIENT_ID;
  const clientSecret = env.AUTH0_PREVIEW_CLIENT_SECRET;
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new TypeError("Both preview Auth0 credentials must be configured together");
  }

  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
