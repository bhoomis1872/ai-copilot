export async function generateRoadmap(
  missingSkills: string[],
  targetRole: string
) {

  const response = await fetch(

    "/copilot/generateLearningPath",

    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        missingSkills,
        targetRole
      })
    }
  );

  const result =
    await response.json();

  console.log(
    "ROADMAP API RAW:",
    result
  );

  /*
    OData returns:
    {
      value: "json-string"
    }

    OR directly object depending on CAP version
  */

  if (result.value) {

    return JSON.parse(
      result.value
    );
  }

  return result;
}