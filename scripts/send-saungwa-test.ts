/**
 * Manual WhatsApp smoke test — sends a simple "Sukses transaksi" template
 * message to the team's test number via Saungwa API in LIVE mode.
 *
 * Usage (requires .env with SAUNGWA_APPKEY & SAUNGWA_AUTHKEY):
 *   npx tsx --env-file=.env scripts/send-saungwa-test.ts [phone]
 *
 * Default phone: 6282254203272 (team test number)
 *
 * ⚠️  This performs a REAL WhatsApp send. Run only when you intend to
 *     verify live delivery. Otherwise keep SAUNGWA_MODE=mock.
 */

const SAUNGWA_API_URL = "https://app.saungwa.com/api/create-message";

async function main() {
  const phone = process.argv[2] || "6282254203272";
  const appKey = process.env.SAUNGWA_APPKEY;
  const authKey = process.env.SAUNGWA_AUTHKEY;

  if (!appKey || !authKey) {
    console.error(
      "ERROR: SAUNGWA_APPKEY and/or SAUNGWA_AUTHKEY is not set in .env. Cannot send live message."
    );
    process.exit(1);
  }

  console.log(`Sending "Sukses transaksi" to ${phone} ...`);

  const formData = new FormData();
  formData.append("appkey", appKey);
  formData.append("authkey", authKey);
  formData.append("to", phone);
  formData.append("message", "Sukses transaksi");

  const response = await fetch(SAUNGWA_API_URL, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  const isSuccess =
    result?.message_status === "Success" || result?.data?.status_code === 200;

  if (response.ok && isSuccess) {
    console.log("✅ Sent OK");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("❌ Send failed:", result?.message || result?.error || result);
    console.error("HTTP status:", response.status);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});