const express =
  require("express");

const multer =
  require("multer");

const path =
  require("path");

const fs =
  require("fs");

const pdfParse =
  require("pdf-parse-fork");

const mammoth =
  require("mammoth");

const cds =
  require("@sap/cds");

const {
  INSERT,
  SELECT,
  UPDATE
} = cds.ql;

const router =
  express.Router();

  let Documents;
let AIContext;

cds.on("served", async () => {

  const db =
    await cds.connect.to("db");
    
const entities =
  cds.entities("copilot");
  Documents =
    entities.Documents;

  AIContext =
    entities.AIContext;
});

// =====================================
// STORAGE
// =====================================

const storage =
  multer.diskStorage({

    destination:
      function (req, file, cb) {

        const uploadPath =
          path.join(
            __dirname,
            "uploads"
          );

        // CREATE FOLDER IF MISSING

        if (
          !fs.existsSync(
            uploadPath
          )
        ) {

          fs.mkdirSync(
            uploadPath,
            { recursive: true }
          );
        }

        cb(
          null,
          uploadPath
        );
      },

    filename:
      function (req, file, cb) {

        cb(
          null,
          Date.now() +
          "-" +
          file.originalname
        );
      }

  });

const upload =
  multer({ storage });

// =====================================
// UPLOAD ROUTE
// =====================================

router.post(
  "/",
  upload.any(),

  async (req, res) => {

    try {

      // =========================
      // VALIDATION
      // =========================

      if (
        !req.files ||
        !req.files.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "No file uploaded"
          });
      }

      // =========================
      // FILE
      // =========================

      const uploadedFile =
        req.files[0];

      console.log(
        "FILE RECEIVED:",
        uploadedFile.originalname
      );

      const filePath =
        uploadedFile.path;

      const fileName =
        uploadedFile.filename;

      const userID =
        req.body.userID ||
        "demo-user";
        const uploadType =
  req.body.type ||
  "resume";

  const conversationID =
  req.body.conversationID;

      let extractedText =
        "";

      // =========================
      // PDF
      // =========================

      if (
        uploadedFile.mimetype ===
        "application/pdf"
      ) {

        const dataBuffer =
          fs.readFileSync(
            filePath
          );

        const pdfData =
          await pdfParse(
            dataBuffer
          );

        extractedText =
          pdfData.text;
      }

      // =========================
      // DOCX
      // =========================

      else if (

        uploadedFile.mimetype.includes(
          "word"
        )

      ) {

        const result =
          await mammoth.extractRawText({

            path: filePath

          });

        extractedText =
          result.value;
      }

      // =========================
      // TXT
      // =========================

      else {

        extractedText =
          fs.readFileSync(
            filePath,
            "utf8"
          );
      }

      // =========================
      // SAVE
      // =========================

      // =========================
// AI CONTEXT
// =========================

const commonSkills = [

  "SAP BTP",
  "SAP",
  "ABAP",
  "RAP",
  "UI5",
  "Fiori",
  "OData",
  "CDS",
  "CAP",
  "Cloud Foundry",
  "HANA",
  "HANA Cloud",
  "REST API",
  "REST APIs",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Git",
  "Agile",
  "SAPUI5",
  "Backend",
  "Frontend"
];

console.log(
  "EXTRACTED TEXT:",
  extractedText
);

console.log(
  "UPLOAD TYPE:",
  uploadType
);
const extractedSkills =
  commonSkills.filter(
    (skill) =>

      extractedText
        .toLowerCase()
        .includes(
          skill.toLowerCase()
        )
  );

console.log(
  "EXTRACTED SKILLS:",
  extractedSkills
);

// =========================
// RESUME
// =========================
let aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

// Create AIContext if missing

if (!aiContext) {

  await INSERT.into(AIContext)
    .entries({

      conversationID,

      userID,

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

      createdAt:
        new Date(),

      updatedAt:
        new Date()
    });

  aiContext =
    await SELECT.one
      .from(AIContext)
      .where({
        conversationID
      });
}

// =========================
// SAVE RESUME / JD TEXT
// =========================
if (uploadType === "resume") {

  const latestContext =
    await SELECT.one
      .from(AIContext)
      .where({
        conversationID
      });

  await UPDATE(AIContext)
    .set({

      resumeText:

        (latestContext.resumeText || "") +

        `

================ CANDIDATE RESUME ================

Candidate:
${uploadedFile.originalname}

Resume Content:

${extractedText}

==================================================

`,

      updatedAt:
        new Date()
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
// =========================
// SAVE SKILLS
// =========================

if (uploadType === "resume") {

  const existingSkills =
    JSON.parse(
      aiContext.resumeSkills || "[]"
    );

  existingSkills.push({

    candidate:
      uploadedFile.originalname,

    skills:
      extractedSkills
  });

  await UPDATE(AIContext)
    .set({

      resumeSkills:
        JSON.stringify(
          existingSkills
        ),

      updatedAt:
        new Date()
    })
    .where({
      conversationID
    });

}
else {

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

// =========================
// RELOAD CONTEXT
// =========================

aiContext =
  await SELECT.one
    .from(AIContext)
    .where({
      conversationID
    });

    console.log(
  "AI CONTEXT:",
  aiContext
);
const resumeSkills =
  JSON.parse(
    aiContext?.resumeSkills || "[]"
  );

const jdSkills =
  JSON.parse(
    aiContext?.jdSkills || "[]"
  );

// =========================
// MATCHING
// =========================

const allResumeSkills =
  resumeSkills.flatMap(
    (r) => r.skills || []
  );

const matchedSkills =
  allResumeSkills.filter(
    (skill) =>
      jdSkills.includes(skill)
  );

const missingSkills =
  jdSkills.filter(
    (skill) =>
      !allResumeSkills.includes(skill)
  );

const matchScore =

  jdSkills.length > 0

    ? Math.round(

        (
          matchedSkills.length /

          jdSkills.length

        ) * 100
      )

    : 0;

// =========================
// SAVE MATCH RESULTS
// =========================

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

console.log(
  "MATCH SCORE:",
  matchScore
);
      await INSERT.into(
        Documents
      ).entries({

        userID,

        fileName,

        extractedText,

        uploadedAt:
          new Date()

      });

    console.log(
  uploadType === "resume"
    ? "Resume uploaded successfully"
    : "JD uploaded successfully"
);

     return res.json({

  success: true,

  message:

    uploadType === "resume"

      ? "Resume uploaded successfully"

      : "JD uploaded successfully",

  extractedText,

  preview:
    extractedText.substring(
      0,
      500
    ),

  matchedSkills,

  missingSkills,

  matchScore
});

    } catch (err) {

      console.error(
        "UPLOAD ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          error:
            "Resume upload failed"
        });
    }
  }
);
module.exports =
  router;