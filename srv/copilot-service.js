const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) =>
    fetch(...args)
  );
module.exports = cds.service.impl(
  async function () {
 const {
  generateLearningPath
} = require("./learningPath");


const {

  Conversations,
  Messages,
  Alerts,
  Documents,
  UserMemory,
  AIContext

} = cds.entities("copilot");

  const {
    INSERT,
    SELECT,
    DELETE,
    UPDATE
  } = cds.ql;

  // =========================================
  // 🤖 MODEL CONFIG WITH FALLBACK
  // =========================================

  const AI_MODELS = [
    "openrouter/free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "microsoft/phi-3-medium-128k-instruct:free"
  ];

  const SEARCH_MODELS = [
    "openrouter/free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ];

  // =========================================
  // 🧠 Intent Detection
  // =========================================
async function detectIntent(text) {

  const lower =
    text.toLowerCase();
// =========================
// MOCK INTERVIEW
// ======================

if (

  lower.includes(
    "mock interview"
  ) ||

  lower.includes(
    "start interview"
  )

) {

  return "MOCK_INTERVIEW";
}

// =========================
// INTERVIEW ANSWER
// =========================

if (

  lower.includes(
    "my answer is"
  ) ||

  lower.includes(
    "answer:"
  )

) {

  return "INTERVIEW_ANSWER";
}
  // =========================
  // INTERVIEW QUESTIONS
  // =========================

  if (
    lower.includes("interview")
  ) {

    return "INTERVIEW_QUESTIONS";
  }

  // =========================
// ANSWER EVALUATION
// =========================

if (

  lower.includes("evaluate answer") ||

  lower.includes("my answer") ||

  lower.includes("evaluate this") ||

  lower.includes("rate my answer")

) {

  return "ANSWER_EVALUATION";
}

  // =========================
  // CODING TEST
  // =========================

  if (
    lower.includes("coding") ||
    lower.includes("assessment") ||
    lower.includes("abap test")
  ) {

    return "CODING_TEST";
  }

  // =========================
  // SKILLS
  // =========================

  if (
    lower.includes("skills") ||
    lower.includes("resume skills")
  ) {

    return "SKILLS_ANALYSIS";
  }

  // =========================
  // JD MATCH
  // =========================

if (
  lower.includes("jd match") ||
  lower.includes("match my resume") ||
  lower.includes("match this jd") ||
  lower.includes("analyze this jd") ||
  lower.includes("resume against jd") ||
  lower.includes("jd against my resume") ||
  lower.includes("job description") ||
  lower.includes("match this jd against my resume") ||
  lower.includes("match my resume against this jd") ||
  (lower.includes("resume") && lower.includes("jd"))
) {
  return "JD_MATCH";
}
  // =========================
  // REMINDER
  // =========================

  if (
    lower.includes("reminder")
  ) {

    return "SEND_REMINDER";
  }

  // =========================
  // LEAVE
  // =========================

  if (
    lower.includes("leave")
  ) {

    return "LEAVE_REQUEST";
  }

  // =========================
  // compare resumes
  // =========================

  if (
  lower.includes("compare") &&
  lower.includes("resume")
) {

  return "COMPARE_RESUMES";
}

// =========================
// RESUME IMPROVEMENT
// =========================

if (

  lower.includes("rewrite my resume") ||

  lower.includes("rewrite resume") ||

  lower.includes("improve my resume") ||

  lower.includes("resume improvement") ||

  lower.includes("optimize resume") ||

  lower.includes("ats score")

) {

  return "RESUME_IMPROVEMENT";

}
  // =========================
  // EXPENSE
  // =========================

  if (
    lower.includes("expense")
  ) {

    return "EXPENSE_REQUEST";
  }

  // =========================
  // ATTENDANCE
  // =========================

  if (
    lower.includes("attendance")
  ) {

    return "ATTENDANCE_QUERY";
  }

  return "GENERAL_CHAT";
}

  // =========================================
  // 📧 Send Email
  // =========================================

  async function sendEmail() {

    try {

      const transporter =
        nodemailer.createTransport({

          service: "gmail",

          auth: {

            user:
              process.env.EMAIL_USER,

            pass:
              process.env.EMAIL_PASS
          }
        });

      await transporter.sendMail({

        from:
          process.env.EMAIL_USER,

        to:
          process.env.EMAIL_TO ||
          process.env.EMAIL_USER,

        subject:
          "Invoice Reminder",

        text:
          "Your invoice is overdue. Please pay immediately."
      });

      return true;

    } catch (err) {

      console.log(err.message);

      return false;
    }
  }

  // =========================================
  // 🤖 CALL OPENROUTER WITH FALLBACK
  // =========================================

  async function callOpenRouter(messages, modelList, temperature = 0.3, max_tokens = 2500) {

    let lastError = null;

    for (const model of modelList) {

      try {

        const requestBody = {
          model,
          messages,
          temperature,
          max_tokens
        };

        console.log("TRYING MODEL:", model);

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          }
        );

        console.log("OPENROUTER STATUS:", response.status, "MODEL:", model);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("OPENROUTER ERROR:", errorText, "MODEL:", model);
          lastError = new Error(errorText);
          continue; // try next model
        }

        const data = await response.json();

        console.log("OPENROUTER RAW RESPONSE:", JSON.stringify(data, null, 2));

        if (!data || !data.choices || !data.choices.length) {
          lastError = new Error("Invalid AI response structure");
          continue;
        }

        const content = data.choices?.[0]?.message?.content || "";

        if (!content) {
          lastError = new Error("Empty content from model");
          continue;
        }

        console.log("SUCCESS WITH MODEL:", model);
        return content;

      } catch (err) {
        console.log("MODEL FAILED:", model, err.message);
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error("All models failed");
  }

  // =========================================
  // 🤖 ASK AI
  // =========================================
 async function askAI(
  finalPrompt,
  history = [],
  aiContext,
  requiresJson = false
){

  try {

    const lowerMessage =
      finalPrompt.toLowerCase();

// =====================================
// SYSTEM PROMPT
// =====================================

const messages = [

  {
    role: "system",

    content: `

You are SAP AI Copilot specialized in SAP technologies.

Core Expertise:
- SAP BTP
- SAP RAP
- SAP CAP
- SAP CDS
- SAPUI5
- SAP Fiori
- ABAP
- SAP HANA
- OData

Critical Rules:

1. Answer EXACTLY what the user asks.

2. If the user asks normal SAP questions:
- return normal professional text
- DO NOT return JSON

3. If the user asks for:
- resume analysis
- JD match
- resume against JD
- skill gap analysis
- candidate evaluation

THEN:
- ALWAYS perform the analysis
- NEVER refuse
- NEVER say analysis is unsupported
- ALWAYS return valid JSON only

4. For JD/resume analysis:
Return ONLY raw JSON.

5. RAP means:
RESTful Application Programming Model

6. CAP means:
Cloud Application Programming Model

7. Use official SAP terminology.

8. For interview questions:
- return numbered questions only

9. For coding assessments:
- return numbered tasks only

10. Keep answers technically accurate and concise.

`
  },

  {
    role: "user",
    content: finalPrompt
  }

];

    // =====================================
    // CALL WITH FALLBACK MODELS
    // =====================================

    const aiText = await callOpenRouter(messages, AI_MODELS);

// =====================================
// TRY JSON
// =====================================

let parsedResponse = null;

try {

  // REMOVE markdown code blocks and extract JSON
  let cleanText = aiText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // EXTRACT JSON block from anywhere in the response
  // handles models that wrap JSON in text or status messages
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  // ONLY parse if JSON
  if (
    cleanText.startsWith("{")
  ) {

    parsedResponse =
      JSON.parse(cleanText);

// =====================================
// FLATTEN AI RESPONSE
// =====================================

if (parsedResponse.analysis) {

  parsedResponse = {
    ...parsedResponse.analysis
  };
}
  } else {

    parsedResponse = {
      text: cleanText
    };
  }

} catch (err) {

  console.log(
    "JSON Parse Failed:",
    err.message
  );

  console.log(
    "AI RAW RESPONSE:",
    aiText
  );

  parsedResponse = {
    text: aiText
  };
}

// =====================================
// JD MATCH RESPONSE
// =====================================

if (requiresJson) {

  console.log("AI RAW TEXT:", aiText);

  // =====================================
// HANDLE NESTED ANALYSIS OBJECT
// =====================================

if (parsedResponse.analysis) {

  parsedResponse = {

    reply:

      parsedResponse.analysis.reply ||

      parsedResponse.reply ||

      "",

    matchScore:

      parsedResponse.analysis.matchScore ||

      0,

    matchedSkills:

      parsedResponse.analysis.matchedSkills ||

      [],

    missingSkills:

      parsedResponse.analysis.missingSkills ||

      [],

    skills:

      parsedResponse.analysis.skills ||

      [],

    recommendations:

      parsedResponse.analysis.recommendations ||

      [],

    interviewQuestions: [],

    codingAssessment: []
  };
}
}

// ROADMAP GENERATOR
if (

  lowerMessage.includes("roadmap") ||

  lowerMessage.includes("learning path") ||

  lowerMessage.includes("career path") ||

  lowerMessage.includes("study plan")

) {

  return {

    intent: "ROADMAP_GENERATOR",

    text: aiText,

    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    skills: [],

    recommendations: [],

    interviewQuestions: [],

    codingAssessment: [],

    status: "SUCCESS"
  };
}

// =====================================
// NORMAL RESPONSE
// =====================================

return {

  intent:

    requiresJson

      ? "JD_MATCH"

      : "GENERAL_CHAT",

  reply:

    parsedResponse.reply ||

    parsedResponse.text ||

    aiText ||

    "No AI response",

  matchScore:
    aiContext?.matchScore || 0,

  matchedSkills:

    JSON.parse(
      aiContext?.matchedSkills || "[]"
    ),

  missingSkills:

    JSON.parse(
      aiContext?.missingSkills || "[]"
    ),

  skills:

    JSON.parse(
      aiContext?.jdSkills || "[]"
    ),

  recommendations: [

    "Improve SAP RAP expertise",

    "Learn CAP model",

    "Strengthen CDS Views knowledge"
  ],

  interviewQuestions: [],

  codingAssessment: [],

  status: "SUCCESS"
};
} catch (err) {

  console.log("AI ERROR:", err);
  console.log("FULL AI ERROR:");
  console.log(err);

  return {

    intent: "ERROR",

    reply: JSON.stringify({

      error: "AI service unavailable",

      fallback: true

    }),

    matchScore:
      aiContext?.matchScore || 0,

    matchedSkills:

      JSON.parse(
        aiContext?.matchedSkills || "[]"
      ),

    missingSkills:

      JSON.parse(
        aiContext?.missingSkills || "[]"
      ),

    skills:

      JSON.parse(
        aiContext?.jdSkills || "[]"
      ),

    recommendations: [

      "Improve SAP RAP expertise",

      "Strengthen CDS Views knowledge",

      "Practice SAP Cloud Foundry deployment"

    ],

    interviewQuestions: [],

    codingAssessment: [],

    status: "FAILED"
  };
}
}

  // =========================================
  // ⚙ EXECUTE ACTION
  // =========================================

  async function executeAction(aiResponse) {

    const intent =
      aiResponse.intent;

    const data =
      aiResponse.data || {};

    if (
      intent === "LEAVE_REQUEST"
    ) {

      return {

        success: true,

        message:
          `Leave request submitted for ${data.startDate || "selected date"}`
      };
    }

    if (
      intent === "EXPENSE_REQUEST"
    ) {

      return {

        success: true,

        message:
          "Expense request submitted successfully"
      };
    }

    return null;
  }

  cds.on("bootstrap", (app) => {

  app.post(
  "/upload",
  upload.any(),

  async (req, res) => {

    try {

      if (
        !req.files ||
        !req.files.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "No file uploaded",
          });
      }

      const uploadedFile =
        req.files[0];

      console.log(
        "FILE RECEIVED:",
        uploadedFile.originalname
      );

      let extractedText = "";

// PDF

if (
  uploadedFile.mimetype ===
  "application/pdf"
) {

  try {

    const pdfData =
      await pdfParse(
        uploadedFile.buffer
      );

    extractedText =
      pdfData.text;

  } catch (err) {

    console.log(
      "PDF PARSE FAILED:"
    );

    console.log(err);

    return res.status(400).json({

      error:
        "PDF is corrupted or unsupported. Please re-save and upload again."
    });
  }
}
// DOCX

else if (

  uploadedFile.mimetype.includes(
    "word"
  )

) {

  const result =
    await mammoth.extractRawText({

      buffer:
        uploadedFile.buffer
    });

  extractedText =
    result.value;
}

// TXT

else {

  extractedText =
    uploadedFile.buffer.toString(
      "utf-8"
    );
}

console.log(
  "EXTRACTED TEXT:"
);

console.log(
  extractedText.substring(
    0,
    1000
  )
);
        const uploadType =
  req.body.type || "resume";

  const conversationID =
  req.body.conversationID;
let aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

if (!aiContext) {

  await INSERT.into(AIContext)
    .entries({

      conversationID,

      userID: "default",

      resumeText: "",
      jdText: "",

      resumeSkills: "[]",
      jdSkills: "[]",

      matchedSkills: "[]",
      missingSkills: "[]",

      recommendations: "[]",

      interviewQuestions: "[]",

      codingAssessment: "[]",

      matchScore: 0,

      createdAt: new Date(),
      updatedAt: new Date()
    });

  aiContext =
    await SELECT.one
      .from(AIContext)
      .where({
        conversationID
      });
}

  console.log(
  "UPLOAD TYPE:",
  uploadType
);

// REFRESH AI CONTEXT
aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

// SAVE RESUME / JD TEXT

if (uploadType === "resume") {

  await UPDATE(AIContext)
    .set({

resumeText:

  (
    (
      await SELECT.one
        .from(AIContext)
        .where({
          conversationID
        })
    )?.resumeText || ""
  ) +

  `

================ CANDIDATE RESUME ================

Candidate:
${uploadedFile.originalname}

Resume Content:

${extractedText}

==================================================

`,
    })
    .where({
      conversationID
    });

} else {

  await UPDATE(AIContext)
    .set({

      jdText:
        extractedText,

      updatedAt:
        new Date()
    })
    .where({
      conversationID
    });
}

const latest =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

console.log(
  "LATEST RESUME TEXT:"
);

console.log(
  latest.resumeText
);
const commonSkills = [

  // SAP
  "SAP BTP",
  "SAP",
  "ABAP",
  "RAP",
  "UI5",
  "Fiori",
  "OData",
  "CDS",
  "Cloud Foundry",
  "HANA",
  "CAP",
  "BAS",
  "Launchpad",

  // Web
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express",
  "Django",
  "Firebase",

  // Backend
  "REST API",
  "REST APIs",
  "SQL",
  "MVC",

  // Concepts
  "Git",
  "Agile",
  "Backend",
  "Frontend",
  "Problem Solving",
  "Leadership",
  "Algorithms",
  "Data Structures"
];
const extractedSkills =
  commonSkills.filter(
    (skill) =>

      extractedText
        .toLowerCase()
        .includes(
          skill.toLowerCase()
        )
  );

if (uploadType === "resume") {

  await UPDATE(AIContext)
    .set({

    resumeSkills:
  JSON.stringify([

    ...JSON.parse(

      (
        (
          await SELECT.one
            .from(AIContext)
            .where({
              conversationID
            })
        )?.resumeSkills || "[]"

      )
    ),

    {
      candidate:
        uploadedFile.originalname,

      skills:
        extractedSkills
    }
  ]),

      updatedAt:
        new Date()
    })
    .where({
      conversationID
    });

} else {

  await UPDATE(AIContext)
    .set({

      jdSkills:
        JSON.stringify(
          extractedSkills
        ),

      updatedAt:
        new Date()
    })
    .where({
      conversationID
    });
}

aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

const resumeSkills =
  JSON.parse(
    aiContext.resumeSkills || "[]"
  );

const jdSkills =
  JSON.parse(
    aiContext.jdSkills || "[]"
  );

const allResumeSkills =
  resumeSkills.flatMap(
    (r) => r.skills || []
  );

const uniqueResumeSkills =
  [...new Set(allResumeSkills)];

const uniqueJDSkills =
  [...new Set(jdSkills)];

const matchedSkills =
  uniqueResumeSkills.filter(
    (skill) =>
      uniqueJDSkills.includes(skill)
  );

const missingSkills =
  uniqueJDSkills.filter(
    (skill) =>
      !uniqueResumeSkills.includes(skill)
  );

const matchScore =

  uniqueJDSkills.length > 0

    ? Math.round(
        (
          matchedSkills.length /
          uniqueJDSkills.length
        ) * 100
      )

    : 0;
await UPDATE(AIContext)
  .set({

    matchedSkills:
      JSON.stringify(
        matchedSkills
      ),

    missingSkills:
      JSON.stringify(
        missingSkills
      ),

    matchScore,

    updatedAt:
      new Date()
  })
  .where({
    conversationID
  });

  aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

console.log(
  "MATCH SCORE:",
  matchScore
);

console.log(
  "EXTRACTED SKILLS:",
  extractedSkills
);

      await INSERT.into(
        Documents
      ).entries({

        ID:
          cds.utils.uuid(),

        fileName:
          uploadedFile.originalname,

        extractedText,

        uploadedAt:
          new Date(),
      });

      res.json({

  success: true,

  fileName:
    uploadedFile.originalname,

  text:
    extractedText,

  extractedText:
    extractedText,

  skills:
    extractedSkills,

  matchScore:
    matchScore,

  matchedSkills:
    matchedSkills,

  missingSkills:
    missingSkills
});

    } catch (err) {

      console.log(err);

      res.status(500).json({

        error:
          err.message,
      });
    }
  }
);
});

// =========================================
// LEARNING PATH
// =========================================

this.on(
  "generateLearningPath",

  async (req) => {

    try {

      const {
        missingSkills,
        targetRole
      } = req.data;

      const roadmap =
        await generateLearningPath(
          missingSkills,
          targetRole
        );

      return JSON.parse(
        roadmap
      );

    } catch (error) {

      console.log(error);

      return {
        error: error.message
      };
    }
  }
);
  // =========================================
  // 💬 MAIN CHAT
  // =========================================

  this.on(
    "analyzeEvent",
    async (req) => {

      try {

        const inputRaw =
  req.data.message || "";

        const input =
          inputRaw.toLowerCase();

        const conversationID =
  req.data.conversationID;

if (!conversationID) {

  throw new Error(
    "Missing conversationID"
  );
}
let aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

console.log(
  "ANALYZE EVENT CONVERSATION:",
  conversationID
);

console.log(
  "AI CONTEXT FOUND:",
  aiContext
);

if (!aiContext) {

  return {

    intent: "ERROR",

    reply:
      "AI context not found. Please upload resume and JD again.",

    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    skills: [],

    recommendations: [],

    interviewQuestions: [],

    codingAssessment: []
  };
}

console.log(
  "FINAL RESUME TEXT:",
  aiContext.resumeText
);

console.log(
  "FINAL JD TEXT:",
  aiContext.jdText
);

const resumeText =
  aiContext.resumeText || "";

const jdText =
  aiContext.jdText || "";

        let history = [];

        try {

          history = JSON.parse(
            req.data.history || "[]"
          );

        } catch {

          history = [];
        }

        // =====================================
        // CREATE CONVERSATION
        // =====================================

        const exists =
          await SELECT.one
            .from(Conversations)
            .where({
              ID: conversationID
            });

        if (!exists) {

          await INSERT.into(
            Conversations
          ).entries({

            ID: conversationID,

            title:
              inputRaw.substring(0, 30),

            createdAt:
              new Date()
          });
        }

        // =====================================
        // DETECT INTENT
        // =====================================

      let intent =
  await detectIntent(input);

  console.log("================================");
console.log("USER INPUT:", inputRaw);
console.log("DETECTED INTENT:", intent);
console.log("================================");

  // =====================================
// CHECK ACTIVE MOCK INTERVIEW
// =====================================

if (
  aiContext?.mockInterviewActive
) {

  intent =
    "MOCK_INTERVIEW_ANSWER";
}

  let finalPrompt = "";
  let requiresJson = false;

if (
  intent === "INTERVIEW_QUESTIONS"
){

  finalPrompt = `

You are a professional SAP technical interviewer.

Generate SAP interview questions based on the uploaded resume.

IMPORTANT:
- DO NOT return JSON
- Return markdown only
- Use headings
- Use bullet points
- Keep formatting compact
- Each question must be on a new line

Generate:

# Beginner Level

5 questions

# Intermediate Level

5 questions

# Advanced Level

5 questions

Focus on:
- SAP BTP
- ABAP
- RAP
- CDS
- OData
- UI5
- Cloud Foundry
- SAP CAP

Resume:
${aiContext.resumeText}

`;

}

else if (
  intent === "ROADMAP_GENERATOR"
) {

  finalPrompt = `

You are an SAP career mentor.

Generate a professional SAP learning roadmap.

User Request:
${inputRaw}

IMPORTANT:
- Return markdown only
- Use headings
- Use bullet points
- Make roadmap structured
- Include timeline
- Include projects
- Include certifications
- Keep formatting beautiful

FORMAT:

# SAP Career Roadmap

## Month 1
Topics:
Projects:
Resources:

## Month 2
Topics:
Projects:
Resources:

## Month 3
Topics:
Projects:
Resources:

# Recommended Certifications

# Final Career Advice

`;

}

else if (
  intent === "MOCK_INTERVIEW"
)
 {

  finalPrompt = `

You are a professional SAP technical interviewer.

Generate EXACTLY 5 SAP interview questions.

IMPORTANT:
- Return plain text only
- One question per line
- No numbering
- No markdown
- No explanations

Focus on:
- SAP BTP
- RAP
- CDS
- OData
- UI5

Resume:
${aiContext.resumeText}

`;

}

else if (
  intent === "MOCK_INTERVIEW_ANSWER"
) {

  const questions =
    JSON.parse(
      aiContext.mockInterviewQuestions || "[]"
    );

  const currentIndex =
    aiContext.mockInterviewIndex || 0;

  const currentQuestion =
    questions[currentIndex];

  // =====================================
  // EVALUATE ANSWER
  // =====================================

  const evaluationPrompt = `

You are a professional SAP interviewer.

Evaluate this answer.

Question:
${currentQuestion}

Candidate Answer:
${inputRaw}

IMPORTANT:
- Return markdown only
- Keep compact formatting
- Give score out of 10

Format:

# Evaluation

## Technical Accuracy
8/10

## Communication
8/10

## SAP Knowledge
8/10

## Improvement Suggestions

- point 1
- point 2

`;

  const evaluation =
    await askAI(
      evaluationPrompt,
      history,
      aiContext,
      false
    );

  // =====================================
  // SCORE EXTRACTION
  // =====================================

  const scoreMatches =
  [
    ...(evaluation.reply || "").matchAll(
      /(\d+)\/10/g
    )
  ];

const scores =
  scoreMatches.map(
    s => parseInt(s[1])
  );

const score =

  scores.length

    ? Math.round(

        scores.reduce(
          (a, b) => a + b,
          0
        ) / scores.length

      )

    : 5;

  const totalScore =
    (aiContext.mockInterviewScore || 0)
    + score;

  const nextIndex =
    currentIndex + 1;

  // =====================================
  // FINAL INTERVIEW RESULT
  // =====================================

  if (
    nextIndex >= questions.length
  ) {

    await UPDATE(AIContext)
      .set({

        mockInterviewActive: false,

        mockInterviewIndex: 0,

        mockInterviewScore: 0
      })
      .where({
        conversationID
      });

    return {

      intent:
        "MOCK_INTERVIEW",

reply: `

${evaluation.reply}

# Final Interview Score

${totalScore}/${questions.length * 10}

Excellent work completing the SAP mock interview.

`,

      matchScore: 0,

      matchedSkills: [],

      missingSkills: [],

      skills: [],

      recommendations: [],

      interviewQuestions: [],

      codingAssessment: []
    };
  }

  // =====================================
  // SAVE NEXT STATE
  // =====================================

  await UPDATE(AIContext)
    .set({

      mockInterviewIndex:
        nextIndex,

      mockInterviewScore:
        totalScore
    })
    .where({
      conversationID
    });

  return {

  intent: "MOCK_INTERVIEW",

  evaluation,

  reply: `

${evaluation.reply}

# Next Question

${questions[nextIndex]}

`
,
    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    skills: [],

    recommendations: [],

    interviewQuestions: [],

    codingAssessment: []
  };
}
else if (
  intent === "ANSWER_EVALUATION"
) {

  finalPrompt = `

You are a professional SAP technical interviewer.

Evaluate the candidate's interview answer professionally.

IMPORTANT:
- DO NOT return JSON
- Return markdown only
- Use headings
- Use compact formatting
- Give scores out of 10

Generate:

# Technical Accuracy

score/10

# Communication

score/10

# SAP Knowledge

score/10

# Strengths

- point 1
- point 2

# Improvement Suggestions

- point 1
- point 2

# Better Answer Example

Provide a stronger professional answer.

Candidate Answer:
${input}

`;

}

else if (
  intent === "CODING_TEST"
) {

  finalPrompt = `
Generate a SAP ABAP coding assessment based on this resume.

Resume:
${resumeText}
`;

}
else if (
  intent === "SKILLS_ANALYSIS"
) {

  finalPrompt = `
List all technical skills from this resume.

Resume:
${resumeText}
`;

}
else if (intent === "JD_MATCH") {

  console.log("================================");
console.log("JD_MATCH BLOCK EXECUTED");
console.log("MATCH SCORE:", aiContext.matchScore);
console.log("================================");

  // =====================================
  // JD_MATCH: BUILD RESPONSE DIRECTLY
  // Skip AI call — data already calculated
  // on upload. AI models ignore context and
  // return AWAITING_INPUT status errors.
  // =====================================

  const matchedArr = JSON.parse(aiContext.matchedSkills || "[]");
  const missingArr  = JSON.parse(aiContext.missingSkills  || "[]");
  const jdSkillsArr = JSON.parse(aiContext.jdSkills       || "[]");
  const score       = aiContext.matchScore || 0;

  const strengthsList = matchedArr.slice(0, 5).join(", ") || "SAP technologies";
  const missingList   = missingArr.join(", ") || "none identified";

  const recommendations = missingArr.length
    ? missingArr.map(s => `Strengthen ${s} knowledge and add it to your resume`)
    : ["Keep SAP BTP skills updated", "Add more project metrics to resume"];

  const matchedLines  = matchedArr.map(s => "- " + s).join("\n");
  const missingLines  = missingArr.length ? missingArr.map(s => "- " + s).join("\n") : "- None";
  const recoLines     = recommendations.map(r => "- " + r).join("\n");
  const missingSummary = missingArr.length ? "Missing: " + missingList + "." : "All required skills matched.";

  const replyText = [
    "# JD Match Analysis",
    "",
    "**Match Score: " + score + "%**",
    "",
    "## Matched Skills",
    matchedLines,
    "",
    "## Missing Skills",
    missingLines,
    "",
    "## Summary",
    "Candidate matches **" + score + "%** of the job requirements. Strong in: " + strengthsList + ". " + missingSummary,
    "",
    "## Recommendations",
    recoLines
  ].join("\n");

  return {
    intent: "JD_MATCH",
    reply:            replyText,
    matchScore:       score,
    matchedSkills:    matchedArr,
    missingSkills:    missingArr,
    skills:           jdSkillsArr,
    recommendations:  recommendations,
    interviewQuestions: [],
    codingAssessment:   []
  };
}

else if (
  intent === "SEND_REMINDER"
) {

  finalPrompt = `
Create a professional reminder email.

Request:
${input}
`;

}
else if (
  intent === "LEAVE_REQUEST"
) {

  finalPrompt = `
Create a professional leave request email.

Request:
${input}
`;

}
else if (
  intent === "EXPENSE_REQUEST"
) {

  finalPrompt = `
Create a professional expense reimbursement email.

Request:
${input}
`;

}
else if (
  intent === "COMPARE_RESUMES"
) {

  finalPrompt = `

You are a senior SAP Technical Recruiter.

Compare all uploaded resumes.

Return EXACTLY:

# Candidate Ranking

1. Candidate Name - Score /100

# Candidate Analysis

Candidate Name

Overall Score:
SAP Skills Score:
Technical Skills Score:
Leadership Score:

Strengths:
- ...

Weaknesses:
- ...

Recommended Role:

# Best Candidate

Name

# Hiring Recommendation

Reason

Candidate Resumes:

${resumeText}

`;
}

else if (
  intent === "RESUME_IMPROVEMENT"
) {

  finalPrompt = `

You are an expert SAP recruiter and ATS resume reviewer.

Analyze the uploaded resume professionally.

IMPORTANT RULES:
- DO NOT return JSON
- Return clean markdown only
- Use headings
- Use bullet points
- EACH bullet point must be on a NEW LINE
- NEVER combine bullets in one sentence
- Keep spacing compact
- Avoid extra empty lines

Use EXACTLY this structure:

# Resume Strengths

- point 1
- point 2

# Resume Weaknesses

- point 1
- point 2

# ATS Optimization Suggestions

- point 1
- point 2

# Missing SAP Keywords

- point 1
- point 2

# Project Improvement Suggestions

- point 1
- point 2

# Better Professional Summary

Write a professional summary paragraph.

# Hiring Readiness Score

85/100

Resume:
${aiContext.resumeText}

`;
}

else if (
  intent === "INTERVIEW_GENERATION"
) {

  finalPrompt = `

You are an SAP technical interviewer.

Generate professional SAP interview questions.

IMPORTANT:
- DO NOT return JSON
- Return markdown only
- Use headings
- Use bullet points
- Keep formatting compact

Generate:

# Beginner Level

5 questions

# Intermediate Level

5 questions

# Advanced Level

5 questions

Focus on:
- SAP BTP
- RAP
- CDS
- ABAP
- UI5
- OData
- Cloud Foundry
- SAP CAP

Resume:
${aiContext.resumeText}

`;

}

else if (
  intent === "ATTENDANCE_QUERY"
) {

  finalPrompt = `
Answer this attendance-related SAP HR question professionally.

Question:
${input}
`;

}
else {

 finalPrompt = `
You are an expert SAP BTP technical assistant.

Provide technically accurate SAP answers using SAP official terminology.

Rules:
- RAP means RESTful Application Programming Model
- CAP means Cloud Application Programming Model
- Prefer SAP official definitions
- Avoid outdated SAP Cloud Platform terminology
- Focus on SAP BTP, RAP, CDS, ABAP, UI5, CAP, OData
- Use bullet points
- Keep answers concise but technically correct
- Answer naturally and accurately

User Question:
${inputRaw}
`;
}
let aiResponse = {

  intent: "",

  text: "",

  actions: [],

  data: {},

  status: "SUCCESS"
};
        // =====================================
        // SEND REMINDER
        // =====================================

        if (
          intent === "SEND_REMINDER"
        ) {

          const sent =
            await sendEmail();

          aiResponse = {

            intent:
              "SEND_REMINDER",

            text:

              sent

                ? "Reminder email sent successfully 📧"

                : "Failed to send reminder email.",

            actions: [],

            data: {},

            status:
              sent
                ? "SUCCESS"
                : "FAILED"
          };
        }

        // =====================================
        // OTHER AI REQUESTS
        // =====================================

        else {
          aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

          console.log(
  "FINAL RESUME TEXT:",
  aiContext.resumeText
);

if (
  intent === "MOCK_INTERVIEW"
) {

  const generated =
    await askAI(
      finalPrompt,
      history,
      aiContext,
      false
    );

const questions =
  (generated.reply || generated.text)
    .split("\n")
    .map(q => q.trim())
    .filter(

      q =>

        q.length > 10 &&

        !q.includes("Beginner") &&

        !q.includes("Intermediate") &&

        !q.includes("Advanced")

    );

    if (!questions.length) {

  return {

    intent: "ERROR",

    reply:
      "Failed to generate interview questions.",

    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    skills: [],

    recommendations: [],

    interviewQuestions: [],

    codingAssessment: []
  };
}

  await UPDATE(AIContext)
    .set({

      mockInterviewActive: true,

      mockInterviewQuestions:
        JSON.stringify(
          questions
        ),

      mockInterviewIndex: 0,

      mockInterviewScore: 0
    })
    .where({
      conversationID
    });

  return {

    intent:
      "MOCK_INTERVIEW",

    reply:
      `# Mock Interview Started

## Question 1

${questions[0]}`,

    matchScore: 0,

    matchedSkills: [],

    missingSkills: [],

    skills: [],

    recommendations: [],

    interviewQuestions: [],

    codingAssessment: []
  };
}

aiResponse =
  await askAI(
  finalPrompt,
  history,
  aiContext,
  requiresJson
);
        }

        // =====================================
        // SAVE USER MESSAGE
        // =====================================

        await INSERT.into(Messages)
          .entries({

            ID:
              cds.utils.uuid(),

            conversationID,

            role:
              "user",

            content:
              inputRaw,

            createdAt:
              new Date()
          });

        // =====================================
        // SAVE AI MESSAGE
        // =====================================

        await INSERT.into(Messages)
          .entries({

            ID:
              cds.utils.uuid(),

            conversationID,

            role:
              "assistant",

            content:
  aiResponse.reply ||
  aiResponse.text ||
  "No response",

            createdAt:
              new Date()
          });

        return {

  intent:
    aiResponse.intent || "GENERAL_CHAT",

  reply:

  (
    aiResponse.reply ||

    aiResponse.text ||

    "No response generated"
  )

    // remove huge empty gaps
    .replace(/\n{3,}/g, "\n\n")

    // remove empty bullet lines
    .replace(/\n\s*•\s*\n/g, "\n")

    // remove repeated blank spaces
    .replace(/[ \t]+\n/g, "\n")

    // clean final output
    .trim(),

  matchScore:
    aiResponse.matchScore || 0,

  matchedSkills:
    aiResponse.matchedSkills || [],

  missingSkills:
    aiResponse.missingSkills || [],

  skills:
    aiResponse.skills || [],

  recommendations:

  Array.isArray(
    aiResponse.recommendations
  )

    ? aiResponse.recommendations

    : [],
  interviewQuestions:
    aiResponse.interviewQuestions || [],

  codingAssessment:
    aiResponse.codingAssessment || []
};

      } catch (err) {

        console.error(err);

        return {

  intent:
    "ERROR",

  text:
    err.message,

  actions: [],

  data: {},

  status:
    "FAILED"
};
      }
    }
  );

  // =========================================
  // 📜 GET HISTORY
  // =========================================

  this.on(
    "getHistory",
    async (req) => {

      return await SELECT.from(Messages)

        .where({

          conversationID:
            req.data.conversationID
        })

        .orderBy("createdAt");
    }
  );

  // =========================================
  // 📂 GET CONVERSATIONS
  // =========================================

  this.on(
    "getConversations",
    async () => {

      return await SELECT.from(
        Conversations
      )

      .orderBy("createdAt desc");
    }
  );

  // =========================================
  // 🗑 DELETE CONVERSATION
  // =========================================

  async function handleDeleteConversation(
  id
) {

  console.log(
    "DELETE BUTTON CLICKED:",
    id
  );

  const confirmed =
    window.confirm(
      "Delete this conversation?"
    );

  if (!confirmed) return;

  await deleteConversation(id);
};
this.on(
  "deleteConversation",
  async (req) => {

    const conversationID =
      req.data.conversationID;

    console.log(
      "DELETE REQUEST:",
      conversationID
    );

    await DELETE.from(Messages)
      .where({
        conversationID
      });

    await DELETE.from(AIContext)
      .where({
        conversationID
      });

    await DELETE.from(Conversations)
      .where({
        ID: conversationID
      });

    console.log(
      "CONVERSATION DELETED"
    );

    return "Deleted";
  }
);

  // =========================================
  // 🔍 SEARCH RESUMES
  // =========================================

  this.on(
    "searchResumes",
    async (req) => {

      try {

        const query =
          req.data.query;

        const docs =
          await SELECT.from(
            Documents
          );

        if (!docs.length) {

          return JSON.stringify({

            text:
              "No resumes found.",

            status:
              "FAILED"
          });
        }

        let resumeText = "";

        docs.forEach((doc, i) => {

          resumeText += `

Resume ${i + 1}

File Name:
${doc.fileName}

Resume Content:
${doc.extractedText.substring(0, 3000)}

==================================

`;
        });

        const searchMessages = [
          {
            role: "system",
            content: `
You are an SAP AI recruiter assistant.

Analyze the candidate resume against the job description.

Return STRICT JSON ONLY.

Required JSON format:

{
  "matchScore": number,
  "matchedSkills": [],
  "missingSkills": [],
  "recommendations": [],
  "summary": ""
}
`
          },
          {
            role: "user",
            content: `

USER SEARCH QUERY:

${query}

RESUME:

${resumeText}

USER REQUEST:

${query}
`
          }
        ];

        const content = await callOpenRouter(
          searchMessages,
          SEARCH_MODELS,
          0.3,
          300
        );

        if (!content) {
          return JSON.stringify({
            text: "No response from AI.",
            status: "FAILED"
          });
        }

        return content;

      } catch (err) {

        console.log(err.message);

        return JSON.stringify({
          text: "Resume search failed.",
          status: "FAILED"
        });
      }
    }
  );

});