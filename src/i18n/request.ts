import { getRequestConfig } from "next-intl/server";

import messages from "../../messages/en-CA.json";

export default getRequestConfig(async () => ({
  locale: "en-CA",
  messages,
}));
