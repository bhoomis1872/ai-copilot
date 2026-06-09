import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  CircularProgressbar
} from
"react-circular-progressbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Mic } from "lucide-react";

import LearningPath from "./components/LearningPath";

import {
  generateRoadmap
} from "./lib/learningPath";

import "react-circular-progressbar/dist/styles.css";
import {
  Bar
} from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

import {
  sendChatMessage,
  deleteConversation
} from "./lib/api";

export default function App() {

  const [messages, setMessages] = useState<any[]>([]);

const [
  bestCandidate,
  setBestCandidate
] = useState("");

const [
  rankingScores,
  setRankingScores
] = useState<any[]>([]);
  
  const [
  uploadedResumeText,
  setUploadedResumeText
] = useState("");

const [
  uploadedJDText,
  setUploadedJDText
] = useState("");

  const [aiResult, setAiResult] =
  useState<any>(null);
  const [skills, setSkills] =
  useState<string[]>([]);

  const [

  interviewEvaluation,

  setInterviewEvaluation

] = useState<any>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);

  const [
  listening,
  setListening
] = useState(false);
const [roadmap, setRoadmap] =
  useState<any>(null);

const conversationRef = useRef(
  crypto.randomUUID()
);

const [conversationID, setConversationID] =
  useState<string>(
    conversationRef.current
  );

const [conversations, setConversations] =
  useState<any[]>([]);

const [matchScore, setMatchScore] =
  useState<number | null>(null);

const [showAnalysis, setShowAnalysis] =
  useState(false);
const [
  matchedSkills,
  setMatchedSkills
] = useState<string[]>([]);

const [
  missingSkills,
  setMissingSkills
] = useState<string[]>([]);

const [
  resumeSkills,
  setResumeSkills
] = useState<string[]>([]);

const [
  recommendations,
  setRecommendations
] = useState<string[]>([]);

const [
  readinessScore,
  setReadinessScore
] = useState(85);

const [
  interviewQuestions,
  setInterviewQuestions
] = useState<string[]>([]);

const [
  codingAssessment,
  setCodingAssessment
] = useState<string[]>([]);

const chartData = {
  labels: [
    "Matched",
    "Missing",
    "Resume"
  ],

  datasets: [
    {
      label: "Skills",

      data: [
        matchedSkills.length,
        missingSkills.length,
        skills.length
      ],

      backgroundColor: [
        "#16a34a",
        "#dc2626",
        "#2563eb"
      ],

      borderRadius: 10
    }
  ]
};

const chartOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      display: false
    }
  },

  scales: {
    y: {
      beginAtZero: true
    }
  }
};

const skillChartData = [

  {
    name: "Matched",
    value:
      matchedSkills.length,
  },

  {
    name: "Missing",
    value:
      missingSkills.length,
  },

  {
    name: "Resume",
    value:
      resumeSkills.length,
  },
];

  const fileInputRef =
    useRef<HTMLInputElement>(null);
    const jdInputRef =
  useRef<HTMLInputElement>(null);

    const bottomRef =
  useRef<HTMLDivElement>(null);

  // =========================================
  // LOAD CONVERSATIONS
  // =========================================

  async function loadConversations() {

    try {

      const response = await fetch(
        "/copilot/getConversations",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      setConversations(data.value || []);

    } catch (err) {

      console.log(err);
    }
  }

const handleGenerateRoadmap =
  async () => {

    console.log(
      "ROADMAP BUTTON CLICKED"
    );

    const missingSkillsForRoadmap =

  missingSkills.length > 0

    ? missingSkills

    : [
        "SAP HANA",
        "Launchpad",
        "SAP RAP"
      ];

    console.log(
      "Missing Skills:",
      missingSkills
    );

    const roadmap =
  await generateRoadmap(
    missingSkillsForRoadmap,
    "SAP BTP Developer"
  );

    console.log(
      "ROADMAP RESULT:",
      roadmap
    );

    setRoadmap(
      roadmap
    );
};

  // =========================================
  // LOAD HISTORY
  // =========================================

  async function handleDeleteConversation(
  id: string
) {

  const confirmed = window.confirm(
    "Delete this conversation?"
  );

  if (!confirmed) return;

  try {

    await deleteConversation(id);

    setConversations(prev =>
      prev.filter(
        (chat: any) => chat.ID !== id
      )
    );

    if (conversationID === id) {

      createNewChat();

      setMessages([]);
    }

  } catch (err) {

    console.error(err);

    alert(
      "Failed to delete conversation"
    );
  }
}

  async function loadHistory(id: string) {

    try {

      const response = await fetch(
        "/copilot/getHistory",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            conversationID: id,
          }),
        }
      );

      const data = await response.json();

      const history =
        (data.value || []).map((msg: any) => {

          if (msg.role === "assistant") {

            try {

              const parsed =
                JSON.parse(msg.content);

              return {
                role: "assistant",
                content:
                parsed.reply ||
                parsed.text ||
                "No response",
              };

            } catch {

              return {
                role: "assistant",
                content: msg.content,
              };
            }
          }

          return {
            role: msg.role,
            content: msg.content,
          };
        });

      setMessages(history);

    } catch (err) {

      console.log(err);
    }
  }

  // =========================================
  // NEW CHAT
  // =========================================

 function createNewChat() {

  const newID =
    crypto.randomUUID();

  conversationRef.current =
    newID;

  setMessages([]);

  setConversationID(newID);
}
  // =========================================
  // SEND MESSAGE
  // =========================================

  function startVoiceInput() {

  // =====================================
  // SPEECH API
  // =====================================

  const SpeechRecognition =

    (
      window as any
    ).SpeechRecognition ||

    (
      window as any
    ).webkitSpeechRecognition;

  // =====================================
  // BROWSER SUPPORT CHECK
  // =====================================

  if (!SpeechRecognition) {

    alert(
      "Speech Recognition is not supported in this browser."
    );

    return;
  }

  // =====================================
  // CREATE RECOGNITION INSTANCE
  // =====================================

  const recognition =
    new SpeechRecognition();

  // =====================================
  // CONFIGURATION
  // =====================================

  recognition.lang = "en-US";

  recognition.continuous = false;

  recognition.interimResults = false;

  // =====================================
  // START LISTENING
  // =====================================

  setListening(true);

  recognition.start();

  // =====================================
  // HANDLE RESULT
  // =====================================

  recognition.onresult = (
    event: any
  ) => {

    const transcript =

      event.results[0][0]
        .transcript;

    console.log(
      "VOICE TRANSCRIPT:",
      transcript
    );

    // AUTO FILL INPUT
    setPrompt(transcript);

    setListening(false);
  };

  // =====================================
  // HANDLE ERROR
  // =====================================

  recognition.onerror = (
    event: any
  ) => {

    console.log(
      "VOICE ERROR:",
      event
    );

    setListening(false);
  };

  // =====================================
  // HANDLE END
  // =====================================

  recognition.onend = () => {

    setListening(false);
  };
}

  async function sendMessage() {

    if (!prompt.trim()) return;

    const userMessage = prompt;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setPrompt("");

    setLoading(true);

    try {

     const response = await sendChatMessage(

      

prompt,

 conversationRef.current,

  JSON.stringify(messages),

  uploadedResumeText,

  uploadedJDText
);

let displayReply = response.reply;

try {

  const parsed =
    JSON.parse(response.reply);

  if (parsed.CandidateRanking) {

    displayReply =
`🏆 Candidate Ranking

${Object.keys(
  parsed.CandidateRanking
).join("\n")}

Best Candidate:
${parsed.BestCandidate?.Name || ""}`;

  }

} catch {

  // normal response

}

setAiResult(response);

if (
  (response as any).evaluation
) {

  setInterviewEvaluation(

    (response as any).evaluation

  );
}

        console.log("AI API RESPONSE:", response);

        if (
  userMessage.toLowerCase().includes("interview")
) {

  const questions =
    response.reply
      .split("\n")
      .filter((q: string) =>
        q.trim().length > 5
      );

  setInterviewQuestions(
    questions
  );
}

if (
  userMessage.toLowerCase().includes("assessment") ||
  userMessage.toLowerCase().includes("coding")
) {

  const tasks =
    response.reply
      .split("\n")
      .filter((q: string) =>
        q.trim().length > 5
      );

  setCodingAssessment(
    tasks
  );
}

const score =
  Number(response.matchScore);

console.log(
  "SETTING MATCH SCORE:",
  score
);

const shouldShowAnalysis =

  userMessage
    .toLowerCase()
    .includes("resume")

  ||

  userMessage
    .toLowerCase()
    .includes("jd")

  ||

  userMessage
    .toLowerCase()
    .includes("match")

  ||

  response.reply
    ?.toLowerCase()
    .includes("strengths");

if (shouldShowAnalysis) {

  setShowAnalysis(true);

  setMatchScore(
    response.matchScore || 85
  );
  const replyText =
  response.reply || "";

const extractSection = (
  title: string
) => {

  const regex = new RegExp(
    `${title}([\\s\\S]*?)(Resume Strengths|Resume Weaknesses|ATS Optimization Suggestions|Recommended Role|$)`,
    "i"
  );

  const match =
    replyText.match(regex);

  if (!match) return [];

  return match[1]
    .split("\n")
    .map((line: string) =>
      line
        .replace(/^[-•]\s*/, "")
        .trim()
    )
    .filter(
      (line: string) =>
        line.length > 0
    );
};
const parsedMatchedSkills =
  extractSection(
    "Resume Strengths"
  )
  .filter(
    (x: string) => x.length < 40
  )
  .slice(0, 10);

  console.log(
  "PARSED MATCHED:",
  parsedMatchedSkills
);

console.log(
  "FULL AI RESPONSE:",
  response.reply
);

const parsedMissingSkills =
  extractSection(
    "Resume Weaknesses"
  )
  .filter(
    (x: string) => x.length < 40
  )
  .slice(0, 10);

  console.log(
  "PARSED MISSING:",
  parsedMissingSkills
);

const parsedRecommendations =
  extractSection(
    "ATS Optimization Suggestions"
  );

 let parsedRanking: any[] = [];

const rankingMatches = [
  ...replyText.matchAll(
    /(\d+)\.\s*(.*?)\s*-\s*(\d+)\/100/g
  )
];

parsedRanking = rankingMatches.map(
  (match) => ({
    name: match[2].trim(),
    score: Number(match[3])
  })
);
const bestCandidateMatch =
  replyText.match(
    /Best Candidate\s*\n+\s*(.*)/i
  );

if (
  bestCandidateMatch?.[1]
) {
  setBestCandidate(
    bestCandidateMatch[1].trim()
  );
}

// ======================
// SET DASHBOARD DATA
// ======================

setShowAnalysis(true);

// ======================================
// AUTO EXTRACT SCORE FROM AI REPLY
// ======================================

const scoreMatch =
  response.reply?.match(
    /(\d+)\/100/
  );

const extractedScore =
  scoreMatch
    ? Number(scoreMatch[1])
    : 85;

// ======================================
// SET MATCH SCORE
// ======================================

setMatchScore(

  Number(response.matchScore) > 0

    ? Number(response.matchScore)

    : extractedScore
);
setMatchedSkills(

  response.matchedSkills?.length

    ? response.matchedSkills

    : parsedMatchedSkills
);

setMissingSkills(

  response.missingSkills?.length

    ? response.missingSkills

    : parsedMissingSkills
);

setRecommendations(

  response.recommendations?.length

    ? response.recommendations

    : parsedRecommendations
);

setResumeSkills(
  response.skills || []
);

  setMatchedSkills(
  response.matchedSkills?.length
    ? response.matchedSkills
    : parsedMatchedSkills
);
     
setMissingSkills(
  response.missingSkills?.length
    ? response.missingSkills
    : parsedMissingSkills
);

  setResumeSkills(
    response.skills || [
      "SAP BTP",
      "ABAP",
      "OData"
    ]
  );

 setRecommendations(
  response.recommendations?.length
    ? response.recommendations
    : parsedRecommendations
);

console.log(
  "PARSED RANKING:",
  parsedRanking
);

setRankingScores(
  parsedRanking
);

if (parsedRanking.length > 0) {

  setMatchedSkills([
    "Candidate Ranking Available",
    "Resume Comparison Complete"
  ]);

}

if (
  parsedRanking.length > 0
) {

  setBestCandidate(
    parsedRanking[0].name
  );
}

} else {

  setShowAnalysis(false);

  setMatchScore(null);

  setMatchedSkills([]);

  setMissingSkills([]);

  setResumeSkills([]);

  setRecommendations([]);

  setInterviewQuestions([]);

  setCodingAssessment([]);
}
// SHOW CHAT MESSAGE

const assistantMessage = {

  role: "assistant",

  content:
    displayReply || "",

  skills:
    response.skills || [],

  matchedSkills:
    response.matchedSkills || [],

  missingSkills:
    response.missingSkills || [],

  recommendations:
    response.recommendations || [],

  interviewQuestions:
    response.interviewQuestions || [],

  codingAssessment:
    response.codingAssessment || [],

  matchScore: matchScore,
};

setMessages((prev) => [
  ...prev,
  assistantMessage
]);

      loadConversations();

    } catch (error) {

      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "❌ Error connecting to AI service.",
        },
      ]);
    } finally {

      setLoading(false);
    }
  }

  // =========================================
  // UPLOAD RESUME
  // =========================================

  async function uploadResume(
    e: any
  ) {

    const file = e.target.files[0];

    if (!file) return;

    const formData =
      new FormData();

    formData.append(
  "file",
  file
);

const activeConversationID =
  conversationRef.current;

formData.append(
  "conversationID",
  activeConversationID
);

formData.append(
  "type",
  "resume"
);

    try {

      const response = await fetch(
  "/upload",
  {
    method: "POST",
    body: formData,
  }
);

if (!response.ok) {

  const error =
    await response.text();

  console.error(error);

  throw new Error(
    "Upload failed"
  );
}

const result =
  await response.json();

localStorage.setItem(
  "resumeText",
  result.extractedText ||
  result.text ||
  ""
);


console.log(
  "UPLOAD RESULT:",
  result
);

setUploadedResumeText(
  result.extractedText ||
  result.text ||
  ""
);

console.log(
  "RESUME TEXT SAVED:",
  result.extractedText
);
     setMessages((prev) => [

  ...prev,

  {

    role: "assistant",

    content:
      "✅ Resume uploaded successfully.",
  },
]);

    } catch (err) {

      console.log(err);

      alert(
        "Upload failed"
      );
    }
  }

  async function uploadJD(
  e: any
) {

  const file =
    e.target.files[0];

  if (!file) return;

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );


formData.append(
  "type",
  "jd"
);

formData.append(
  "conversationID",
  conversationRef.current
);
  try {

    const response =
      await fetch(
        "/upload",
        {
          method: "POST",
          body: formData,
        }
      );

    const result =
      await response.json();

    console.log(
      "JD UPLOAD RESULT:",
      result
    );
setUploadedJDText(
  result.extractedText ||
  result.text ||
  ""
);

console.log(
  "JD TEXT SAVED:",
  result.extractedText
);

// SAVE JD TEXT
localStorage.setItem(
  "jobDescription",
  result.extractedText ||
  result.text ||
  ""
);

    setMessages((prev) => [

  ...prev,

  {

    role: "assistant",

    content:
      "✅ JD uploaded successfully.",
  },
]);

  } catch (err) {

    console.error(err);

    alert(
      "JD upload failed"
    );
  }
}

  useEffect(() => {

    loadConversations();

  }, []);

  useEffect(() => {

  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });

}, [messages]);

const downloadPDF = async () => {

  if (!reportRef.current) return;

  const canvas = await html2canvas(
    reportRef.current
  );

  const imgData =
    canvas.toDataURL("image/png");

  const pdf = new jsPDF(
    "p",
    "mm",
    "a4"
  );

  const pdfWidth =
    pdf.internal.pageSize.getWidth();

  const pdfHeight =
    (canvas.height * pdfWidth) /
    canvas.width;

  pdf.addImage(
    imgData,
    "PNG",
    0,
    0,
    pdfWidth,
    pdfHeight
  );

  pdf.save(
    "SAP_AI_Report.pdf"
  );
};

 return (

<div className="flex h-screen w-screen bg-gray-100 overflow-hidden">

    {/* SIDEBAR */}

    <div className="w-72 min-w-[288px] bg-[#07142b] text-white flex flex-col p-6 shrink-0">

      <h1 className="text-4xl font-bold mb-12">
        SAP AI Copilot
      </h1>

      <button
        className="mb-4"
        onClick={() => {
          setMessages([]);
          createNewChat();
        }}
      >
        New Chat
      </button>

      <button
        className="mb-4"
        onClick={() =>
          fileInputRef.current?.click()
        }
      >
        Upload Resume
      </button>

      <input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={uploadResume}
      />

      <button
        className="mb-8"
        onClick={() =>
          jdInputRef.current?.click()
        }
      >
        Upload JD
      </button>

      <input
        type="file"
        hidden
        ref={jdInputRef}
        onChange={uploadJD}
      />

      <h2 className="text-3xl font-bold mb-4">
        Chats
      </h2>

      <div className="space-y-3 overflow-y-auto">

   {conversations.map((chat: any) => (

  <div
    key={chat.ID}
    className="
      bg-[#13203a]
      p-4
      rounded-xl
      hover:bg-[#1d2d4d]
      flex
      justify-between
      items-center
    "
  >

    <div
      className="cursor-pointer flex-1"
      onClick={() => {

        setConversationID(chat.ID);

        loadHistory(chat.ID);
      }}
    >
      {chat.title}
    </div>

    <button
      onClick={(e) => {

        e.stopPropagation();

        handleDeleteConversation(
          chat.ID
        );
      }}
      className="
        ml-3
        text-red-400
        hover:text-red-600
      "
    >
      🗑
    </button>

  </div>

))}

      </div>

      <div className="mt-auto text-sm opacity-70">
        Powered by SAP AI
      </div>

    </div>

{/* MAIN CHAT */}

<div
  ref={reportRef}
  className="
    flex-1
    flex
    flex-col
    h-screen
    overflow-hidden
  "
>

  {/* HEADER */}

  <div className="bg-white border-b p-5 shrink-0 flex justify-between items-center">

  <div>
  <h1 className="text-4xl font-bold">
    AI Assistant
  </h1>
</div>

<button
  onClick={downloadPDF}
  className="bg-green-600 hover:bg-green-700"
>
  Download AI Report
</button>

  </div>

{/* CHAT + ANALYSIS */}

<div className="flex flex-1 overflow-hidden">

  {/* LEFT CHAT AREA */}

  <div className="flex-[2] flex flex-col bg-[#f5f6fa]">

    {/* MESSAGES */}

    <div className="flex-1 overflow-y-auto p-4 space-y-2">

      {messages.map((msg: any, index: number) => {

        const content =
          msg.content ||
          msg.reply ||
          "";

        // USER MESSAGE

        if (msg.role === "user") {

          return (

            <div
              key={index}
              className="flex justify-end"
            >

              <div className="bg-blue-900 text-white px-5 py-3 rounded-2xl max-w-[45%] shadow">

                {content}

              </div>

            </div>
          );
        }

        // AI MESSAGE

return (

  <div
    key={index}
    className="flex justify-start"
  >

    <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-3 max-w-4xl">

      <div
        className="
          text-gray-800
          leading-6
          text-[15px]

          [&_h1]:text-2xl
          [&_h1]:font-bold
          [&_h1]:mb-2

          [&_h2]:text-xl
          [&_h2]:font-semibold
          [&_h2]:mb-2

          [&_h3]:text-lg
          [&_h3]:font-medium
          [&_h3]:mb-1

          [&_p]:mb-2

          [&_ul]:ml-5
          [&_ul]:list-disc

          [&_li]:mb-1
        "
      >

        <ReactMarkdown>
          {content}
        </ReactMarkdown>

      </div>

    </div>
  

  </div>
);
      })}

      <div ref={bottomRef} />

    </div>

    {/* INPUT */}

<div className="bg-white border-t p-4 shrink-0 flex gap-3 items-center">

  <input
    value={prompt}
    onChange={(e) =>
      setPrompt(e.target.value)
    }
    placeholder="Ask SAP AI Copilot..."
    className="h-14 rounded-xl flex-1"
    onKeyDown={(e) => {

      if (e.key === "Enter") {

        sendMessage();
      }
    }}
  />

  <button
  onClick={handleGenerateRoadmap}

  className="
    bg-blue-600
    hover:bg-blue-700
    text-white
    px-5
    py-3
    rounded-xl
    font-semibold
    mt-4
  "
>

  Generate AI Learning Path

</button>

  {/* MIC BUTTON */}

  <button
    onClick={startVoiceInput}
    className={`
      h-14 w-14 rounded-xl text-white
      transition-all duration-300

      ${listening
        ? "bg-red-500 hover:bg-red-600 animate-pulse"
        : "bg-gray-700 hover:bg-gray-800"}
    `}
  >
    🎤
  </button>

  {/* SEND BUTTON */}

  <button
    onClick={sendMessage}
    className="
      h-14 px-6 rounded-xl
      bg-blue-700 hover:bg-blue-800
    "
  >
    Send
  </button>

</div>

{/* END LEFT CHAT AREA */}

</div>

  {/* RIGHT ANALYTICS */}

{showAnalysis && (
  <div className="w-[420px] bg-[#f8fafc] border-l overflow-y-auto p-6">
      <div className="sticky top-0 space-y-5">

        {/* MATCH SCORE */}

        <div className="bg-white rounded-2xl shadow-sm border p-5">

          <h2 className="text-2xl font-bold mb-6">
            JD Match Score
          </h2>

          <div className="flex justify-center">

            <div className="w-44 h-44">

              <CircularProgressbar
               value={matchScore || 0}
                text={`${matchScore || 0}%`}
              />

            </div>

          </div>

        </div>

   {/* SKILLS */}

<div className="bg-white rounded-2xl shadow-sm border p-5">

  <h2 className="text-2xl font-bold mb-4">
    Skills Analytics
  </h2>

  <div className="h-[300px]">

    <Bar
      data={chartData}
      options={chartOptions}
    />

  </div>

</div>

{/* MATCHED SKILLS */}

<div className="bg-white rounded-2xl shadow-sm border p-5">

  <h2 className="text-2xl font-bold text-green-700 mb-3">
    Matched Skills
  </h2>

  <div className="flex flex-wrap gap-2">

    {matchedSkills.map(
      (skill: string) => (

        <span
          key={skill}
          className="
            bg-green-100
            text-green-700
            px-3
            py-1
            rounded-full
            text-sm
          "
        >
          {skill}
        </span>

      )
    )}

  </div>

</div>
 {/* BEST CANDIDATE */}

<div className="bg-white rounded-2xl shadow-sm border p-5">

  <h2 className="text-2xl font-bold text-green-700 mb-3">
    🏆 Best Candidate
  </h2>

  <div className="text-lg font-semibold">
    {bestCandidate || "No candidate ranked yet"}
  </div>

</div>

{/* CANDIDATE SCORES */}

<div className="bg-white rounded-2xl shadow-sm border p-5 mt-5">

  <h2 className="text-2xl font-bold mb-4">
    Candidate Scores
  </h2>

  {rankingScores.map(
    (candidate: any, index: number) => (

      <div
        key={index}
        className="
          flex
          justify-between
          border-b
          py-2
        "
      >

        <span>
          {candidate.name}
        </span>

        <span className="font-bold">
          {candidate.score}/100
        </span>

      </div>

    )
  )}

</div>

        {/* MISSING */}

        <div className="bg-white rounded-2xl shadow-sm border p-5">

          <h2 className="text-2xl font-bold text-red-700 mb-3">
            Missing Skills
          </h2>

          <div className="flex flex-wrap gap-2">

            {missingSkills.map((skill: string) => (

              <span
                key={skill}
                className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>

            ))}

          </div>

        </div>

   {/* RECOMMENDATIONS */}

<div className="bg-white rounded-2xl shadow-sm border p-5">

  <h2 className="text-2xl font-bold mb-4">
    Recommendations
  </h2>

  <ul className="space-y-3">

    {recommendations.map(
      (
        item: string,
        index: number
      ) => {

        return (

          <li
            key={index}
            className="
              bg-gray-100
              p-3
              rounded-lg
            "
          >
            {item}
          </li>

        );
      }
    )}

  </ul>

</div>
<LearningPath roadmap={roadmap} />

      </div> {/* END STICKY */}

    </div>   

  )} 

</div> {/* END CHAT + ANALYTICS */}

</div> {/* END MAIN CHAT */}

</div>

);
}