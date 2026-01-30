import { describe, expect, it } from "vitest";
import { parseUserFromAuthCookies } from "./parse-auth-cookie";

const fakeUser = { id: "abc-123", email: "test@example.com" };
const session = { user: fakeUser, access_token: "tok", refresh_token: "ref" };

function toBase64(obj: object): string {
  return "base64-" + Buffer.from(JSON.stringify(obj)).toString("base64");
}

describe("parseUserFromAuthCookies", () => {
  it("returns null when no auth cookies exist", () => {
    expect(parseUserFromAuthCookies([])).toBeNull();
    expect(parseUserFromAuthCookies([{ name: "other", value: "x" }])).toBeNull();
  });

  it("parses plain JSON auth cookie", () => {
    const cookies = [{ name: "sb-xxx-auth-token", value: JSON.stringify(session) }];
    expect(parseUserFromAuthCookies(cookies)).toEqual(fakeUser);
  });

  it("parses base64-encoded auth cookie", () => {
    const cookies = [{ name: "sb-xxx-auth-token", value: toBase64(session) }];
    expect(parseUserFromAuthCookies(cookies)).toEqual(fakeUser);
  });

  it("parses chunked cookies", () => {
    const json = JSON.stringify(session);
    const mid = Math.floor(json.length / 2);
    const cookies = [
      { name: "sb-xxx-auth-token.1", value: json.slice(mid) },
      { name: "sb-xxx-auth-token.0", value: json.slice(0, mid) },
    ];
    expect(parseUserFromAuthCookies(cookies)).toEqual(fakeUser);
  });

  it("parses chunked base64-encoded cookies", () => {
    const encoded = toBase64(session);
    const mid = Math.floor(encoded.length / 2);
    const cookies = [
      { name: "sb-xxx-auth-token.1", value: encoded.slice(mid) },
      { name: "sb-xxx-auth-token.0", value: encoded.slice(0, mid) },
    ];
    expect(parseUserFromAuthCookies(cookies)).toEqual(fakeUser);
  });

  it("ignores code-verifier cookies", () => {
    const cookies = [
      { name: "sb-xxx-auth-token-code-verifier", value: "verifier" },
    ];
    expect(parseUserFromAuthCookies(cookies)).toBeNull();
  });

  it("returns null for malformed cookie value", () => {
    const cookies = [{ name: "sb-xxx-auth-token", value: "not-json" }];
    expect(parseUserFromAuthCookies(cookies)).toBeNull();
  });
});
