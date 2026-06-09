const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) =>
    fetch(...args)
  );

// =========================================
// 🤖 LEARNING PATH MODELS (free fallbacks)
// =========================================

const LEARNING_PATH_MODELS = [
  "openrouter/free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free"
];

// =========================================
// 🤖 CALL OPENROUTER WITH FALLBACK
// =========================================

async function callOpenRouter(messages, max_tokens = 500) {

  let lastError = null;

  for (const model of LEARNING_PATH_MODELS) {

    try {

      console.log("LEARNING PATH TRYING MODEL:", model);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "SAP AI Copilot"
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
            max_tokens
          })
        }
      );

      console.log("LEARNING PATH STATUS:", response.status, "MODEL:", model);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("LEARNING PATH ERROR:", errorText, "MODEL:", model);
        lastError = new Error(errorText);
        continue; // try next model
      }

      const data = await response.json();

      const content = data?.choices?.[0]?.message?.content || "";

      if (!content) {
        lastError = new Error("Empty content from model");
        continue;
      }

      console.log("LEARNING PATH SUCCESS MODEL:", model);
      return content;

    } catch (err) {
      console.log("LEARNING PATH MODEL FAILED:", model, err.message);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All learning path models failed");
}

// =========================================
// 📚 GENERATE LEARNING PATH
// =========================================

async function generateLearningPath(missingSkills, targetRole) {

  const prompt = `
Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use triple backticks.
Keep response SHORT.

Format:

{
  "prioritySkills": ["skill1", "skill2"],

  "weeklyPlan": [
    {
      "week": 1,
      "focus": "topic"
    }
  ],

  "certifications": ["cert1"],

  "projects": ["project1"]
}

Target Role:
${targetRole}

Missing Skills:
${missingSkills.join(", ")}
`;

  const FALLBACK = JSON.stringify({
    prioritySkills: [
      "SAP BTP",
      "SAP RAP",
      "SAP CAP"
    ],
    weeklyPlan: [
      {
        week: 1,
        focus: "Learn SAP BTP Fundamentals"
      },
      {
        week: 2,
        focus: "Build RAP Applications"
      }
    ],
    certifications: [
      "SAP BTP Certification"
    ],
    projects: [
      "Build SAP CAP Project"
    ]
  });

  try {

    const raw = await callOpenRouter([
      {
        role: "user",
        content: prompt
      }
    ]);

    console.log("RAW ROADMAP:", raw);

    try {

      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.stringify(JSON.parse(cleaned));

    } catch (parseError) {

      console.log("ROADMAP JSON PARSE ERROR:", parseError.message);
      console.log("RAW WAS:", raw);
      return FALLBACK;
    }

  } catch (err) {

    console.log("ROADMAP AI ERROR:", err.message);
    return FALLBACK;
  }
}

module.exports = {
  generateLearningPath
};