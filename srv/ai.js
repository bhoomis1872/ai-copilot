const express = require("express");
const cds = require("@sap/cds");
const axios = require("axios");

const router = express.Router();

const { INSERT, SELECT } = cds.ql;

// =====================================
// AI CHAT
// =====================================

router.post("/", async (req, res) => {

  const db = await cds.connect.to("db");

  const {
    Messages,
    Conversations,
    Documents,
    UserMemory
  } = cds.entities("copilot");

  try {

    // =================================
    // USER DATA
    // =================================

    const userMessage =
      req.body.message;

    const conversationID =
      req.body.conversationID || "default";

    const userID =
      req.body.userID || "demo-user";

    // =================================
    // VALIDATION
    // =================================

    if (!userMessage) {

      return res.json({
        reply: "Please enter a message."
      });
    }

    // =================================
    // CREATE CONVERSATION
    // =================================

    const exists = await SELECT.one
      .from(Conversations)
      .where({
        ID: conversationID
      });

    if (!exists) {

      await INSERT.into(Conversations).entries({

        ID: conversationID,

        title: userMessage.substring(0, 40),

        createdAt: new Date()
      });
    }

    // =================================
    // SAVE USER MESSAGE
    // =================================

    await INSERT.into(Messages).entries({

      conversationID,

      role: "USER",

      content: userMessage,

      createdAt: new Date()
    });

    const msg =
      userMessage.toLowerCase();

    // =================================
    // DETECT INTENT
    // =================================

    let intent = "general_chat";

    // CERTIFICATION ADVISOR

if (
  msg.includes("certification") ||
  msg.includes("certificate") ||
  msg.includes("which sap certification") ||
  msg.includes("take next certification")
) {
  intent = "certification_advisor";
}

    // MEMORY

    if (

      msg.includes("remember") ||

      msg.includes("my name is") ||

      msg.includes("call me")

    ) {

      intent = "memory";
    }

    // RESUME ANALYSIS

    if (

      msg.includes("resume") ||

      msg.includes("cv") ||

      msg.includes("ats") ||

      msg.includes("score") ||

      msg.includes("analyze my resume") ||

      msg.includes("analyze resume") ||

      msg.includes("resume analysis")

    ) {

      intent = "resume_analysis";
    }

    // RESUME REWRITE

if (

  msg.includes("rewrite my resume") ||

  msg.includes("improve my resume") ||

  msg.includes("optimize my resume") ||

  msg.includes("ats optimized resume") ||

  msg.includes("rewrite resume")

) {

  intent = "resume_rewrite";

}
    // JOB MATCHING

    if (

      msg.includes("match") ||

      msg.includes("job description") ||

      msg.includes("jd")

    ) {

      intent = "job_matching";
    }

    // CODE GENERATION

    if (

      msg.includes("code") ||

      msg.includes("sapui5") ||

      msg.includes("fiori") ||

      msg.includes("cds") ||

      msg.includes("cap") ||

      msg.includes("btp") ||

      msg.includes("abap")

    ) {

      intent = "code_generation";
    }

    // =================================
// CERTIFICATION ADVISOR
// =================================

else if (intent === "certification_advisor") {

  const document = await SELECT.one
    .from(Documents)
    .where({ userID })
    .orderBy("uploadedAt desc");

  const resumeText =
    document?.extractedText?.substring(0, 5000) || "";

  prompt = `

You are a senior SAP Career Advisor.

Analyze the candidate resume.

Candidate Resume:

${resumeText}

Task:

Recommend exactly ONE SAP certification.

Return in this format:

# Recommended Certification

Certification Name

# Why This Certification

Explain why it matches the candidate skills.

# Learning Duration

Estimated preparation time.

# Difficulty

Beginner / Intermediate / Advanced

# Career Impact

How it helps the candidate.

# Next Certification

Suggest the next certification after completing this one.

`;

}
    // =================================
    // MEMORY SAVE
    // =================================

    if (intent === "memory") {

      await INSERT.into(UserMemory).entries({

        userID,

        memory: userMessage,

        createdAt: new Date()

      });

      return res.json({

        reply:
          "✅ I will remember that."
      });
    }

    // =================================
    // FETCH CHAT HISTORY
    // =================================

    const history = await SELECT.from(Messages)

      .where({
        conversationID
      })

      .orderBy("createdAt desc")

      .limit(10);

    const formattedHistory = history

      .reverse()

      .map(msg => ({

        role:
          msg.role === "USER"
            ? "user"
            : "assistant",

        content: msg.content
      }));

    // =================================
    // FETCH USER MEMORIES
    // =================================

    const memories = await SELECT.from(UserMemory)

      .where({
        userID
      })

      .orderBy("createdAt desc")

      .limit(5);

    const memoryText = memories

      .map(m => m.memory)

      .join("\n");

    // =================================
    // PROMPT
    // =================================

    let prompt = "";

    // =================================
    // RESUME ANALYSIS
    // =================================

    if (intent === "resume_analysis") {

      const document = await SELECT.one

        .from(Documents)

        .where({
          userID
        })

        .orderBy("uploadedAt desc");

      // NO DOCUMENT

      if (!document) {

        return res.json({

          reply:
            "❌ Please upload your resume first."
        });
      }

      const resumeText =

        document.extractedText
          .substring(0, 12000);

      prompt = `

You are an expert ATS Resume Analyzer.

Analyze the resume below.

Return a professional response with:

1. Resume Score out of 10
2. Technical Skills
3. Strengths
4. Weaknesses
5. Missing Keywords
6. Improvement Suggestions
7. Interview Questions
8. Professional Summary

RESUME:

${resumeText}

USER REQUEST:

${userMessage}

`;
    }

    // =================================
    // JOB MATCHING
    // =================================

    else if (intent === "job_matching") {

      const document = await SELECT.one

        .from(Documents)

        .where({
          userID
        })

        .orderBy("uploadedAt desc");

      if (!document) {

        return res.json({

          reply:
            "❌ Please upload your resume first before matching jobs."
        });
      }

      const resumeText =

        document.extractedText
          .substring(0, 10000);

      prompt = `

You are an AI Job Matching Assistant.

Compare the following resume with the job description.

Provide:

1. Match Percentage
2. Matching Skills
3. Missing Skills
4. Suggestions to improve match
5. Hiring probability

RESUME:

${resumeText}

JOB DESCRIPTION:

${userMessage}

`;
    }

    // =================================
    // CODE GENERATION
    // =================================

    else if (intent === "code_generation") {

      prompt = `

You are SAP AI Copilot.

Generate clean and professional SAP code.

Rules:
- Give complete code
- Use proper formatting
- Add comments
- Use beginner-friendly explanations

USER REQUEST:

${userMessage}

`;
    }

    // =================================
// RESUME REWRITE
// =================================

else if (
  intent === "resume_rewrite"
) {

  const document =
    await SELECT.one
      .from(Documents)
      .where({ userID })
      .orderBy("uploadedAt desc");

  if (!document) {

    return res.json({

      reply:
        "❌ Please upload your resume first."

    });

  }

  const resumeText =

    document.extractedText
      .substring(0, 12000);

  prompt = `

You are an ATS Resume Expert.

Analyze the resume.

Rewrite it for SAP BTP Developer roles.

Provide:

# Professional Summary

# Improved Skills Section

# Improved Project Descriptions

# Missing SAP Keywords

# ATS Optimization Suggestions

# Final Resume Score

Resume:

${resumeText}

`;

}

    // =================================
    // GENERAL CHAT
    // =================================

    else {

      prompt = `

You are SAP AI Copilot.

You are expert in:

- SAP BTP
- SAP CAP
- SAP CDS
- SAPUI5
- SAP Fiori
- ABAP
- SAP HANA
- OData
- SAP Integration

USER MEMORY:
${memoryText}

USER QUESTION:
${userMessage}

Give clear and professional answers.

`;
    }

    // =================================
    // OPENROUTER API
    // =================================
    const response = await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        model: "openai/gpt-3.5-turbo",

        messages: [

          {

            role: "system",

            content:
              "You are SAP AI Copilot."
          },

          ...formattedHistory,

          {

            role: "user",

            content: prompt
          }
        ]
      },

      {

        headers: {

          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://sap-ai-copilot.local",

          "X-Title":
            "SAP AI Copilot"
        }
      }
    );

    // =================================
    // AI RESPONSE
    // =================================

    const aiText =
  response?.data
    ?.choices?.[0]
    ?.message?.content || "";

    // =================================
    // SAVE AI MESSAGE
    // =================================

    await INSERT.into(Messages).entries({

      conversationID,

      role: "AI",

      content: aiText,

      createdAt: new Date()
    });

    // =================================
    // SEND RESPONSE
    // =================================

    return res.json({

      reply: aiText
    });

  } catch (err) {

    console.log(
      err.response?.data ||
      err.message
    );

    return res.json({

      reply:
        "❌ AI service unavailable right now."
    });
  }
});

module.exports = router;