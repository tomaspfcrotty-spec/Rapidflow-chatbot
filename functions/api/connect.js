export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const model = String(body.model || context.env.OPENAI_MODEL || "gpt-4o-mini").trim();
    const apiKey = String(context.env.OPENAI_API_KEY || "").trim();

    if (!apiKey) {
      return json({ error: "OPENAI_API_KEY secret is missing." }, 500);
    }

    if (!model) {
      return json({ error: "Model is required." }, 400);
    }

    await callOpenAi(apiKey, {
      model,
      temperature: 0,
      messages: [
        { role: "system", content: "Reply with exactly the single word connected." },
        { role: "user", content: "ping" }
      ]
    });

    return json({ ok: true, model });
  } catch (error) {
    return json({ error: error.message || "Unexpected backend error." }, 500);
  }
}

async function callOpenAi(apiKey, payload) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data && data.error && data.error.message ? data.error.message : `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
