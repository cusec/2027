import {
  Auth0Client,
  filterDefaultIdTokenClaims,
} from "@auth0/nextjs-auth0/server";
import { previewAuth0Credentials, previewOrigins } from "./previewOrigins";

const previewBaseUrls = previewOrigins();
const previewCredentials = previewAuth0Credentials();

export const auth0 = new Auth0Client({
  ...(previewBaseUrls.length ? { appBaseUrl: previewBaseUrls } : {}),
  ...previewCredentials,
  async beforeSessionSaved(session) {
    return {
      ...session,
      user: {
        ...filterDefaultIdTokenClaims(session.user),
        "cusec/roles": session.user["cusec/roles"],
      },
    };
  },
});
