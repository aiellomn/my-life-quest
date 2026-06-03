const MODEL = "gemini-2.5-flash-lite";

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function buildPrompt(agent, payload) {
  const globalVision = payload.globalVision || "The user wants a calmer, more ordered, healthier life.";
  const appRules = `
You are an ADHD-friendly assistant inside an app called My Life Quest.
Use warm, practical, non-shaming language.
Keep responses concise and action-oriented.
Tie advice to the user's vision when useful.
Return valid JSON only.
Do not include markdown.
User global vision: "${globalVision}"
`;

  const prompts = {
    projectBreaker: `${appRules}
Break this project into a practical project plan.
Return JSON exactly like:
{
  "title": "short project title",
  "vision": "encouraging project vision",
  "tasks": [
    {
      "title": "task title",
      "notes": "short note",
      "difficulty": "Easy",
      "subtasks": ["tiny step", "tiny step"]
    }
  ]
}
Use difficulty only as Easy, Medium, or Hard.
Project description: ${payload.text || ""}`,

    goalBreaker: `${appRules}
Break this goal into trackable tasks.
Return JSON exactly like:
{
  "title": "short goal title",
  "vision": "encouraging goal vision",
  "tasks": [
    {
      "title": "task title",
      "notes": "short note",
      "difficulty": "Easy",
      "subtasks": ["tiny step", "tiny step"]
    }
  ]
}
Use difficulty only as Easy, Medium, or Hard.
Goal description: ${payload.text || ""}`,

    taskBreaker: `${appRules}
Break this task into tiny, doable subtasks.
Return JSON exactly like:
{
  "title": "clear task title",
  "difficulty": "Easy",
  "estimatedMinutes": 20,
  "subtasks": ["tiny step", "tiny step", "tiny step"]
}
Use difficulty only as Easy, Medium, or Hard.
Task: ${payload.text || ""}`,

    dailyPlanner: `${appRules}
Create a simple daily plan.
If mood or energy is low, include a Minimum Viable Day.
Return JSON exactly like:
{
  "summary": "short encouraging summary",
  "minimumViableDay": ["item", "item", "item"],
  "priorityPlan": [
    {"title": "item", "why": "reason", "timeBlock": "suggested order or time"}
  ],
  "encouragement": "warm closing"
}
Mood: ${payload.mood || 3}/5
Energy: ${payload.energy || 3}/5
Items: ${JSON.stringify(payload.items || [])}`,

    routineSuggester: `${appRules}
Suggest 3 routines for the user's need.
Return JSON exactly like:
{
  "routines": [
    {
      "title": "routine title",
      "time": "07:00",
      "recurrence": "Daily",
      "subtasks": ["step", "step"]
    }
  ]
}
Need: ${payload.text || ""}`,

    weeklyInsights: `${appRules}
Analyze this week and give ADHD-friendly insights.
Return JSON exactly like:
{
  "wins": ["win", "win"],
  "patterns": ["pattern", "pattern"],
  "suggestions": ["suggestion", "suggestion"],
  "visionTieIn": "one sentence"
}
Data: ${JSON.stringify(payload.data || {})}`,

    reflection: `${appRules}
Respond to this end-of-day reflection.
Return JSON exactly like:
{
  "affirmation": "warm affirmation",
  "pattern": "gentle pattern noticed",
  "tomorrow": "one practical suggestion for tomorrow"
}
Reflection: ${payload.text || ""}`,

    affirmation: `${appRules}
Create a short celebration after completion or partial completion.
Return JSON exactly like:
{
  "title": "short celebration title",
  "message": "warm affirmation",
  "visionMessage": "start-with-the-end-in-mind message tied to the relevant vision"
}
Completed item: ${payload.text || ""}
Relevant vision: ${payload.itemVision || globalVision}`
  };

  return prompts[agent] || prompts.affirmation;
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: "Missing GEMINI_API_KEY. Add it in Netlify Site configuration → Environment variables."
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const agent = payload.agent || "affirmation";
    const prompt = buildPrompt(agent, payload);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 900,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return jsonResponse(response.status, {
        ok: false,
        error: `Gemini API error ${response.status}`,
        details: text.slice(0, 500)
      });
    }

    const data = JSON.parse(text);
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { raw };
    }

    return jsonResponse(200, { ok: true, result });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || "Unknown server error"
    });
  }
};
