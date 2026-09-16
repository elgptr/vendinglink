import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

const applyMidtransStatusUpdateMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ updated: true })
);

vi.mock("@/lib/transactionStatus", () => ({
  applyMidtransStatusUpdate: applyMidtransStatusUpdateMock,
}));

import { POST } from "@/app/api/kasera/webhook/route";

describe("API: Kasera Webhook Route (POST /api/kasera/webhook)", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "whsec_super_secret_webhook_key_12345";

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KASERA_WEBHOOK_SECRET: TEST_SECRET,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createSignedRequest(
    body: object,
    opts?: {
      timestamp?: number;
      tamperSignature?: boolean;
      useLegacy?: boolean;
      omitSignature?: boolean;
    }
  ) {
    const rawBody = JSON.stringify(body);
    const now = opts?.timestamp ?? Math.floor(Date.now() / 1000);

    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (!opts?.omitSignature) {
      if (opts?.useLegacy) {
        const sig = opts?.tamperSignature
          ? "bad_legacy_sig"
          : crypto
              .createHmac("sha256", TEST_SECRET)
              .update(rawBody)
              .digest("hex");
        headers.set("kasera-signature", sig);
      } else {
        const sig = opts?.tamperSignature
          ? "bad_v1_sig"
          : crypto
              .createHmac("sha256", TEST_SECRET)
              .update(`${now}.${rawBody}`)
              .digest("hex");
        headers.set("kasera-signature-v1", `t=${now},v1=${sig}`);
      }
    }

    return new NextRequest("https://toko.txsiber.online/api/kasera/webhook", {
      method: "POST",
      headers,
      body: rawBody,
    });
  }

  it("returns 401 when signature headers are missing and secret is configured", async () => {
    const req = createSignedRequest(
      { type: "payment.paid" },
      { omitSignature: true }
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Missing signature header");
  });

  it("returns 403 when signature is invalid", async () => {
    const req = createSignedRequest(
      { type: "payment.paid", data: { external_id: "VM-123" } },
      { tamperSignature: true }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("returns 400 when external_id / orderId is missing", async () => {
    const req = createSignedRequest({
      type: "payment.paid",
      data: { amount: 15000 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("external_id missing");
  });

  it("successfully processes payment.paid event and calls settlement update", async () => {
    applyMidtransStatusUpdateMock.mockResolvedValueOnce({ updated: true });

    const req = createSignedRequest({
      id: "evt_kasera_001",
      type: "payment.paid",
      data: {
        payment_request_id: "payreq_999",
        external_id: "VM-TEST-ORDER-1",
        amount: 25000,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("OK");
    expect(json.orderId).toBe("VM-TEST-ORDER-1");
    expect(json.status).toBe("UPDATED");

    expect(applyMidtransStatusUpdateMock).toHaveBeenCalledWith(
      "VM-TEST-ORDER-1",
      "settlement"
    );
  });

  it("maps payment.expired event to expire internal status", async () => {
    applyMidtransStatusUpdateMock.mockResolvedValueOnce({ updated: true });

    const req = createSignedRequest({
      id: "evt_kasera_002",
      type: "payment.expired",
      data: {
        external_id: "VM-TEST-ORDER-2",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(applyMidtransStatusUpdateMock).toHaveBeenCalledWith(
      "VM-TEST-ORDER-2",
      "expire"
    );
  });

  it("supports legacy kasera-signature header", async () => {
    applyMidtransStatusUpdateMock.mockResolvedValueOnce({ updated: false });

    const req = createSignedRequest(
      {
        type: "payment.paid",
        data: { external_id: "VM-TEST-ORDER-LEGACY" },
      },
      { useLegacy: true }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("PROCESSED");
  });
});
