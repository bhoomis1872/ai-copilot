type Props = {
  roadmap: any;
};

export default function LearningPath({
  roadmap
}: Props) {

  if (!roadmap) return null;

  return (

    <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">

      <h2 className="text-2xl font-bold mb-4">
        SAP Learning Roadmap
      </h2>

      {/* PRIORITY SKILLS */}

      <div className="mb-6">

        <h3 className="font-semibold mb-2">
          Priority Skills
        </h3>

        <div className="flex flex-wrap gap-2">

          {roadmap.prioritySkills?.map(
            (skill: string, index: number) => (

              <span
                key={index}
                className="
                  bg-blue-100
                  text-blue-700
                  px-3
                  py-1
                  rounded-full
                "
              >
                {skill}
              </span>

            )
          )}

        </div>

      </div>

      {/* WEEKLY PLAN */}

      <div className="mb-6">

        <h3 className="font-semibold mb-2">
          Weekly Plan
        </h3>

        {roadmap.weeklyPlan?.map(
          (week: any, index: number) => (

            <div
              key={index}
              className="
                border-l-4
                border-blue-500
                pl-4
                mb-4
              "
            >
              <p className="font-semibold">
                Week {week.week}
              </p>

              <p>{week.focus}</p>

            </div>

          )
        )}

      </div>

      {/* CERTIFICATIONS */}

      <div className="mb-6">

        <h3 className="font-semibold mb-2">
          Certifications
        </h3>

        <ul className="list-disc ml-6">

          {roadmap.certifications?.map(
            (cert: string, index: number) => (

              <li key={index}>
                {cert}
              </li>

            )
          )}

        </ul>

      </div>

      {/* PROJECTS */}

      <div>

        <h3 className="font-semibold mb-2">
          Suggested Projects
        </h3>

        <ul className="list-disc ml-6">

          {roadmap.projects?.map(
            (project: string, index: number) => (

              <li key={index}>
                {project}
              </li>

            )
          )}

        </ul>

      </div>

    </div>

  );
}