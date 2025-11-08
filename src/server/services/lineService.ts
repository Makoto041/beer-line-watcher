import "server-only";

const LINE_ENDPOINT = "https://api.line.me/v2/bot/message/broadcast";

export async function sendLineBroadcast(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }

  const res = await fetch(LINE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("LINE broadcast error", res.status, body);
  }
}
