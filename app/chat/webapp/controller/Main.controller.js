sap.ui.define([

  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"

], function (

  Controller,
  MessageToast

) {

  "use strict";

  return Controller.extend(

    "chat.controller.Main",

    {

      // =====================================
      // INIT
      // =====================================
      onInit: function () {

        console.log(
          "SAP AI Copilot Loaded"
        );
      },

      // =====================================
      // AI RESUME SEARCH
      // =====================================
      onSearchResumes: async function () {

        try {

          const query =
            this.byId(
              "resumeSearchInput"
            ).getValue();

          if (!query) {

            MessageToast.show(
              "Enter search query"
            );

            return;
          }

          // =====================================
          // CALL BACKEND
          // =====================================
          const response =
            await fetch(

              "/copilot/searchResumes",

              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  query
                })
              }
            );

          const data =
            await response.json();

          console.log(
            "Search Response:",
            data
          );

          // =====================================
          // PARSE RESULT
          // =====================================
          let result = {};

          try {

            result =
              JSON.parse(
                data.value
              );

          } catch {

            result = data;
          }

          // =====================================
          // BUILD UI TEXT
          // =====================================
          let text = "";

          if (
            result.matches &&
            result.matches.length
          ) {

            result.matches.forEach(

              (m, i) => {

                text += `

${i + 1}. ${m.candidate}

⭐ Score:
${m.score}

📌 Reason:
${m.reason}

============================

`;
              }
            );

          } else {

            text =
              "No matching resumes found.";
          }

          // =====================================
          // SHOW RESULTS
          // =====================================
          this.byId(
            "searchResults"
          ).setText(text);

        } catch (err) {

          console.log(err);

          MessageToast.show(
            "Resume search failed"
          );
        }
      }

    }
  );
});