const express =
  require("express");

const router =
  express.Router();

const axios =
  require("axios");
  const cds =
  require("@sap/cds");

const { SELECT } =
  cds.ql;

router.post(
  "/",
  async (req, res) => {

    try {

      // =========================
      // GET REQUEST DATA
      // =========================

   const {
  message,
  history,
  conversationID,
  resumeText,
  jobDescription
} = req.body;

      console.log(
  "CONVERSATION ID FROM CHAT:",
  conversationID
);

      console.log(
        "MESSAGE:",
        message
      );

      console.log(
        "RESUME TEXT:",
        resumeText
      );

      console.log(
        "JOB DESCRIPTION:",
        jobDescription
      );

      // =========================
      // OPENROUTER REQUEST
      // =========================

      const response =
        await axios({

          method: "post",

          url:
            "https://openrouter.ai/api/v1/chat/completions",

          data: {

            model:
              "openai/gpt-4o-mini",

            messages: [
              {
                role: "user",

                content: `

You are an SAP AI Career Copilot.

Analyze the resume and job description carefully.

Resume:
${resumeText || "No resume uploaded"}

Job Description:
${jobDescription || "No JD uploaded"}

User Request:
${message}

Instructions:

- If user asks for JD comparison:
  Provide:
  1. Match Score
  2. Matched Skills
  3. Missing Skills
  4. Recommendations
  5. ATS Suggestions

- If user asks for interview:
  Ask interview questions.

- If user asks general questions:
  Answer normally.

Return clean markdown response.
`
              }
            ],

            temperature: 0.3
          },

          headers: {

            Authorization:
              `Bearer ${process.env.OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json"
          }
        });

      // =========================
      // EXTRACT AI RESPONSE
      // =========================

      const aiReply =

        response.data
          ?.choices?.[0]
          ?.message?.content ||

        "No response generated";

      console.log(
        "AI REPLY:",
        aiReply
      );

      // =========================
// RETURN JSON RESPONSE
// =========================

const { AIContext } =
  cds.entities("copilot");

const aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

    console.log(
  "AI CONTEXT FOUND:",
  aiContext
);

    console.log(
  "AI CONTEXT:",
  aiContext
);
    const dynamicRecommendations = [];

// =========================
// BASED ON MATCH SCORE
// =========================

if (
  aiContext?.matchScore < 60
) {

  dynamicRecommendations.push(
    "Improve resume alignment with JD"
  );

  dynamicRecommendations.push(
    "Add more SAP project experience"
  );
}

if (
  aiContext?.matchScore >= 60 &&
  aiContext?.matchScore < 80
) {

  dynamicRecommendations.push(
    "Improve ATS optimization"
  );

  dynamicRecommendations.push(
    "Add measurable achievements"
  );
}

if (
  aiContext?.matchScore >= 80
) {

  dynamicRecommendations.push(
    "Resume is strong for SAP roles"
  );
}

/// =========================
// BASED ON MISSING SKILLS
// =========================

const missingSkills = JSON.parse(
  aiContext?.missingSkills || "[]"
);

missingSkills.forEach((skill) => {

  dynamicRecommendations.push(
    `Add ${skill} experience`
  );

});

// =========================
// EXTRACT MATCH SCORE
// =========================

let extractedScore = 0;

const scorePatterns = [

  /(\d+)\s*\/\s*100/,

  /Hiring Readiness Score[\s\S]*?(\d+)/i,

  /Match Score[\s\S]*?(\d+)/i
];

for (const pattern of scorePatterns) {

  const match =
    aiReply.match(pattern);

  if (match) {

    extractedScore =
      Number(match[1]);

    break;
  }
}
// =========================
// RETURN RESPONSE
// =========================

return res.json({

  reply: aiReply,

  status: "SUCCESS",

  intent: "GENERAL_CHAT",

  matchScore: extractedScore,

  matchedSkills:

    JSON.parse(
      aiContext?.matchedSkills || "[]"
    ),

  missingSkills:

    JSON.parse(
      aiContext?.missingSkills || "[]"
    ),

  recommendations:
    dynamicRecommendations,

  interviewQuestions: [],

  codingAssessment: []
});

    } catch (err) {

      console.error(
        "STREAM ERROR:"
      );

      if (err.response) {

        console.error(
          "STATUS:",
          err.response.status
        );

        console.error(
          "DATA:",
          err.response.data
        );

      } else {

        console.error(
          err.message
        );
      }

      return res
        .status(500)
        .json({

          reply:
            "AI service unavailable",

          status:
            "ERROR"
        });
    }
  }
);

module.exports =
  router;