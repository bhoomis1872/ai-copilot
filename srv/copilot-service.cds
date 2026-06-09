using { copilot as db } from '../db/schema';

service CopilotService @(path:'/copilot') {

  entity Alerts
    as projection on db.Alerts;

  entity Documents
    as projection on db.Documents;

  entity UserMemory
    as projection on db.UserMemory;

  entity Messages {

    key ID : UUID;

    conversationID : String;

    role : String;

    content : String;

    createdAt : Timestamp;
  }

  entity Conversations {

    key ID : String;

    title : String;

    createdAt : Timestamp;
  }

  // =========================
  // AI CONTEXT
  // =========================

  entity AIContext {

    key conversationID : String;

    userID : String;

    resumeText : LargeString;

    jdText : LargeString;

    resumeSkills : LargeString;

    jdSkills : LargeString;

    matchedSkills : LargeString;

    missingSkills : LargeString;

    recommendations : LargeString;

    interviewQuestions : LargeString;

    codingAssessment : LargeString;

    matchScore : Integer;

    mockInterviewActive : Boolean;

    mockInterviewQuestions : LargeString;

    mockInterviewIndex : Integer;

    mockInterviewScore : Integer;

    createdAt : Timestamp;

    updatedAt : Timestamp;
  }

  action analyzeEvent(
    message : String,
    conversationID : String,
    history : String,
    resumeText : String,
    jobDescription : String,
  ) returns String;

  action getHistory(
    conversationID : String
  ) returns array of Messages;

  action getConversations()
    returns array of Conversations;

  action deleteConversation(
    conversationID : String
  ) returns String;

  action searchResumes(
    query : String
  ) returns String;

  action generateLearningPath(
    missingSkills : array of String,
    targetRole : String
  ) returns String;

}