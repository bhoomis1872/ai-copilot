namespace copilot;

entity Alerts {

  key ID        : UUID;

      type      : String;

      message   : String;

      status    : String;

      createdAt : Timestamp;
}

entity Documents {

  key ID          : UUID;

  userID          : String;

  fileName        : String;

  mimeType        : String;

  extractedText   : LargeString;

  uploadedAt      : Timestamp;
}

entity UserMemory {

  key ID          : UUID;

  userID          : String;

  memory          : LargeString;

  createdAt       : Timestamp;
}

// =====================================
// NEW ENTITY
// =====================================

entity AIContext {

  key conversationID : UUID;

  userID             : String;

  resumeText         : LargeString;

  jdText             : LargeString;

  resumeSkills       : LargeString;

  jdSkills           : LargeString;

  matchedSkills      : LargeString;

  missingSkills      : LargeString;

  recommendations    : LargeString;

  interviewQuestions : LargeString;

  codingAssessment   : LargeString;

  matchScore         : Integer;

  createdAt          : Timestamp;

  updatedAt          : Timestamp;
  mockInterviewActive : Boolean;
mockInterviewQuestions : LargeString;
mockInterviewIndex : Integer;
mockInterviewScore : Integer;
}

entity Conversations {

  key ID        : UUID;

      title     : String;

      createdAt : Timestamp;
}

entity Messages {

  key ID              : UUID;

      conversationID  : UUID;

      role            : String;

      content         : LargeString;

      createdAt       : Timestamp;
}