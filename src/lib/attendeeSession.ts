import "server-only";
import { cache } from "react";
import { auth0 } from "./auth0";
/** All attendee pages and APIs use the real Auth0 session, including locally. */
export const getAttendeeSession = cache(() => auth0.getSession());
