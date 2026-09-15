/**
 * Manual WhatsApp smoke test — sends a simple "Sukses transaksi" template
 * message to the team's test number via WhatsVA API in LIVE mode.
 *
 * Usage (requires .env with WHATSVA_DEVICE_TOKEN):
 *   npx tsx --env-file=.env scripts/send-whatsapp-test.ts [phone]
 *
 * Default phone: 6282254203272 (team test number)
 *
 * ⚠️  This performs a REAL WhatsApp send. Run only when you intend to
 *     verify live delivery. Otherwise keep WHATSVA_MODE=mock.
 */

const WHATSVA_API_URL = "https://whatsva.com/api/sendMessageText";

async function main() {
  const phone = process.argv[2] || "6282254203272";
  const apiKey = process.env.WHATSVA_DEVICE_TOKEN;

  if (!apiKey) {
    console.error(
      "ERROR: WHATSVA_DEVICE_TOKEN is not set in .env. Cannot send live message."
    );
    process.exit(1);
  }

  console.log(`Sending "Sukses transaksi" to ${phone} ...`);

  const response = await fetch(WHATSVA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Sukses transaksi",
      jid: phone,
      apikey: apiKey,
    }),
  });

  const result = await response.json();

  if (response.ok && result.success !== false) {
    console.log("✅ Sent OK");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("❌ Send failed:", result.message || result.error || result);
    console.error("HTTP status:", response.status);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});