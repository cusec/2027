type PreviewEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
};

export function previewOrigins(env: PreviewEnv = process.env): string[] {
  if (env.VERCEL_ENV !== "preview") return [];

  return [...new Set(
    [env.VERCEL_BRANCH_URL, env.VERCEL_URL]
      .filter((host): host is string => Boolean(host))
      .map((host) => `https://${host}`),
  )];
}
