import {
  Auth0Client,
  filterDefaultIdTokenClaims,
} from "@auth0/nextjs-auth0/server";
import { previewOrigins } from "./previewOrigins";

const previewBaseUrls = previewOrigins();

export const auth0 = new Auth0Client({
  ...(previewBaseUrls.length ? { appBaseUrl: previewBaseUrls } : {}),
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
