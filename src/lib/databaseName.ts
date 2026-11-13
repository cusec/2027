type DatabaseEnv = {
  [key: string]: string | undefined;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  MONGODB_DB_NAME?: string;
};

/** Staging and production share the established conference database. */
export function databaseName(env: DatabaseEnv): string {
  if (env.VERCEL_ENV === "production" || env.VERCEL_GIT_COMMIT_REF === "staging") return "CUSEC2027";
  return env.MONGODB_DB_NAME || "CUSEC2027";
}
