export async function sendChatMessage(

  message: string,

  conversationID: string,

  history: string,

  resumeText: string,

  jobDescription: string

) {

  console.log(
    "SENDING CONVERSATION ID:",
    conversationID
  );

  const response = await fetch(

    "/copilot/analyzeEvent",

    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        message,

        conversationID,

        history,

        resumeText,

        jobDescription

      })
    }
  );

  // =========================
  // HANDLE API FAILURE
  // =========================

  if (!response.ok) {

    throw new Error(
      "Failed to connect to AI backend"
    );
  }

  // =========================
  // PARSE RESPONSE
  // =========================

  const result =
    await response.json();

  console.log(
    "RAW API RESULT:",
    result
  );

  console.log(
    "FULL RESPONSE:",
    JSON.stringify(result, null, 2)
  );

  // =========================
  // HANDLE ODATA RESPONSE
  // =========================

  let payload = result;

  if (result.value) {

    try {

      payload =
        JSON.parse(result.value);

    } catch {

      payload = {
        reply: result.value
      };
    }
  }

  // =========================
  // NORMALIZED RESPONSE
  // =========================

  return {

    reply:

      payload.reply ||

      payload.text ||

      "No response generated",

    matchScore:

      payload.matchScore || 0,

    matchedSkills:

      payload.matchedSkills || [],

    missingSkills:

      payload.missingSkills || [],

    recommendations:

      payload.recommendations || [],

    interviewQuestions:

      payload.interviewQuestions || [],

    codingAssessment:

      payload.codingAssessment || [],

    skills:

      payload.skills || [],

    status:

      payload.status || "SUCCESS",

    intent:

      payload.intent || "GENERAL_CHAT"
  };
}

// =====================================
// DELETE CONVERSATION
// =====================================

export async function deleteConversation(
  conversationID: string
) {

  const response = await fetch(
    "/copilot/deleteConversation",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        conversationID
      })
    }
  );

  return response.json();
}