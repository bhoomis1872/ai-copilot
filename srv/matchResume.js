const express =
  require("express");

const axios =
  require("axios");
  require("dotenv").config();

const cds =
  require("@sap/cds");

const router =
  express.Router();

const {
  SELECT
} = cds.ql;

// =========================
// JD vs RESUME MATCH
// =========================

router.post(
  "/",
  async (req, res) => {

    try {

      const db =
        await cds.connect.to("db");

      const {
        Documents
      } = cds.entities("copilot");

      const jd =
        req.body.jd;

      const userID =
        req.body.userID || "demo-user";

      // =========================
      // VALIDATION
      // =========================

      if (!jd) {

        return res.json({

          matchScore: 0,

          matchedSkills: [],

          missingSkills: [],

          recommendation:
            "Please provide a job description."
        });
      }

      // =========================
      // FETCH LATEST RESUME
      // =========================

      const document =
        await SELECT.one
          .from(Documents)
          .where({
            userID
          })
          .orderBy(
            "uploadedAt desc"
          );

      // =========================
      // CHECK RESUME
      // =========================

      if (!document) {

        return res.json({

          matchScore: 0,

          matchedSkills: [],

          missingSkills: [],

          recommendation:
            "Please upload a resume first."
        });
      }

      // =========================
      // LIMIT RESUME SIZE
      // =========================

      const resumeText =

        (document.extractedText || "")
          .substring(0, 3000);

      // =========================
      // BUILD PROMPT
      // =========================

      const prompt = `

You are an SAP recruitment AI.

Analyze the resume against the job description.

Return ONLY valid JSON.

Do NOT return markdown.
Do NOT return explanation text.
Do NOT use \`\`\`json.

Required JSON format:

{
  "matchScore": 85,
  "matchedSkills": [],
  "missingSkills": [],
  "recommendation": ""
}

RESUME:

${resumeText}

JOB DESCRIPTION:

${jd}

`;

      // =========================
      // OPENROUTER REQUEST
      // =========================

      const response =

        await axios.post(

          "https://openrouter.ai/api/v1/chat/completions",

          {

            model:
              "openai/gpt-4o-mini",

            messages: [

              {

                role: "system",

                content: `
You are an AI Resume Matcher.

You MUST return ONLY valid JSON.

Never return markdown.

Never explain anything outside JSON.
`
              },

              {

                role: "user",

                content:
                  prompt
              }
            ],

            temperature: 0.2,

            max_tokens: 700
          },

          {

            headers: {

              Authorization:
                `Bearer ${process.env.OPENROUTER_API_KEY}`,

              "Content-Type":
                "application/json"
            }
          }
        );

      // =========================
      // AI RESPONSE
      // =========================

      const aiText =

        response.data
          .choices?.[0]
          ?.message?.content || "";

      console.log("================================");
      console.log("📄 JD vs RESUME MATCH");
      console.log(aiText);
      console.log("================================");

// =========================
// CLEAN RESPONSE
// =========================

const cleanedText =

  aiText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

// =========================
// SAFE JSON PARSE
// =========================

let parsed;

try {

  parsed =
    JSON.parse(cleanedText);

} catch (e) {

  console.log(
    "JSON PARSE ERROR:"
  );

  console.log(e);

  parsed = {

    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    recommendation:
      cleanedText ||
      "AI returned invalid JSON."
  };
}

      // =========================
      // SAFETY DEFAULTS
      // =========================

      parsed.matchScore =
        Number(
          parsed.matchScore || 0
        );

      parsed.matchedSkills =
        parsed.matchedSkills || [];

      parsed.missingSkills =
        parsed.missingSkills || [];

      parsed.recommendation =
        parsed.recommendation ||
        "No recommendation generated.";

      // =========================
      // RETURN RESPONSE
      // =========================

      return res.json(parsed);

    } catch (err) {

      console.log("================================");
      console.log("❌ MATCHING ERROR");

      console.log(err);

      console.log("================================");

      return res.json({

        matchScore: 0,

        matchedSkills: [],

        missingSkills: [],

        recommendation:
          "Matching failed."
      });
    }
  }
);

module.exports =
  router;
