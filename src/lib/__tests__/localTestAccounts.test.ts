import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localCredentials, readLocalAccount, signLocalAccount } from "../localTestAccounts";
beforeEach(()=>{vi.stubEnv("LOCAL_TEST_PASSWORD","cubear");vi.stubEnv("LOCAL_TEST_SESSION_SECRET","test-secret");});
afterEach(()=>vi.unstubAllEnvs());
describe("local test account sessions",()=>{
 it("accepts basic and case-insensitive VIP with the requested password",()=>{expect(localCredentials("basic","cubear")).toBe("basic");expect(localCredentials("VIP","cubear")).toBe("vip");});
 it("rejects incorrect passwords and unknown accounts",()=>{expect(localCredentials("basic","wrong")).toBeNull();expect(localCredentials("admin","cubear")).toBeNull();});
 it("validates signed sessions and rejects account switching by cookie tampering",()=>{const cookie=signLocalAccount("basic",1000);expect(readLocalAccount(cookie,2000)).toBe("basic");expect(readLocalAccount(cookie.replace("basic","vip"),2000)).toBeNull();});
 it("rejects expired, future and malformed sessions",()=>{const cookie=signLocalAccount("vip",1000);expect(readLocalAccount(cookie,1000+8*60*60*1000+1)).toBeNull();expect(readLocalAccount(cookie,0)).toBeNull();expect(readLocalAccount("vip:1000:fake",2000)).toBeNull();});
 it("fails closed without configuration",()=>{vi.stubEnv("LOCAL_TEST_SESSION_SECRET","");vi.stubEnv("LOCAL_TEST_PASSWORD","");expect(readLocalAccount("anything")).toBeNull();expect(localCredentials("basic","cubear")).toBeNull();});
});
