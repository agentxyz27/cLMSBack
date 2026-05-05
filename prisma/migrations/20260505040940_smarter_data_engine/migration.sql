-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('DRAG_MATCH', 'FILL_STEP', 'VISUAL_GROUPING', 'NUMBER_LINE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttemptEventType" AS ENUM ('SESSION_STARTED', 'HINT_OPENED', 'ANSWER_CHANGED', 'ATTEMPT_SUBMITTED', 'SESSION_FINISHED');

-- CreateTable
CREATE TABLE "Grade" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lrn" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "prerequisiteTopicId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpRequired" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" JSONB,
    "classRoomId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "templateType" "TemplateType" NOT NULL,
    "contentJson" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "topicId" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "interactionType" "TemplateType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "teacherId" INTEGER,
    "sourceTemplateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttemptSession" (
    "id" SERIAL NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "correct" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "QuestionAttemptSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttemptEvent" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "eventType" "AttemptEventType" NOT NULL,
    "stepNumber" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttemptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedActivity" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "assignedById" INTEGER,
    "sourceTopicId" INTEGER,
    "sourceSnapshotId" INTEGER,
    "reason" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignedActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLessonSnapshot" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "mps" DOUBLE PRECISION NOT NULL,
    "avgAttempts" DOUBLE PRECISION NOT NULL,
    "avgHintsUsed" DOUBLE PRECISION NOT NULL,
    "isAtRisk" BOOLEAN NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLessonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLessonSnapshot" (
    "id" SERIAL NOT NULL,
    "classRoomId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "triggeredById" INTEGER,
    "totalStudents" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "avgMps" DOUBLE PRECISION NOT NULL,
    "lowestMps" DOUBLE PRECISION NOT NULL,
    "highestMps" DOUBLE PRECISION NOT NULL,
    "atRiskCount" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassLessonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "badgeId" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_level_key" ON "Grade"("level");

-- CreateIndex
CREATE INDEX "Section_gradeId_idx" ON "Section"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_gradeId_name_key" ON "Section"("gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_lrn_key" ON "Student"("lrn");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_sectionId_idx" ON "Student"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "Topic_subjectId_idx" ON "Topic"("subjectId");

-- CreateIndex
CREATE INDEX "Topic_prerequisiteTopicId_idx" ON "Topic"("prerequisiteTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subjectId_name_key" ON "Topic"("subjectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "ClassRoom_teacherId_idx" ON "ClassRoom"("teacherId");

-- CreateIndex
CREATE INDEX "ClassRoom_subjectId_idx" ON "ClassRoom"("subjectId");

-- CreateIndex
CREATE INDEX "ClassRoom_sectionId_idx" ON "ClassRoom"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_teacherId_subjectId_sectionId_key" ON "ClassRoom"("teacherId", "subjectId", "sectionId");

-- CreateIndex
CREATE INDEX "Lesson_classRoomId_idx" ON "Lesson"("classRoomId");

-- CreateIndex
CREATE INDEX "Question_lessonId_idx" ON "Question"("lessonId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_lessonId_order_key" ON "Question"("lessonId", "order");

-- CreateIndex
CREATE INDEX "Template_topicId_idx" ON "Template"("topicId");

-- CreateIndex
CREATE INDEX "Template_teacherId_idx" ON "Template"("teacherId");

-- CreateIndex
CREATE INDEX "Template_interactionType_idx" ON "Template"("interactionType");

-- CreateIndex
CREATE INDEX "Template_sourceTemplateId_idx" ON "Template"("sourceTemplateId");

-- CreateIndex
CREATE INDEX "Template_topicId_difficulty_idx" ON "Template"("topicId", "difficulty");

-- CreateIndex
CREATE INDEX "Progress_studentId_idx" ON "Progress"("studentId");

-- CreateIndex
CREATE INDEX "Progress_lessonId_idx" ON "Progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_studentId_lessonId_key" ON "Progress"("studentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttemptSession_sessionToken_key" ON "QuestionAttemptSession"("sessionToken");

-- CreateIndex
CREATE INDEX "QuestionAttemptSession_studentId_idx" ON "QuestionAttemptSession"("studentId");

-- CreateIndex
CREATE INDEX "QuestionAttemptSession_questionId_idx" ON "QuestionAttemptSession"("questionId");

-- CreateIndex
CREATE INDEX "QuestionAttemptSession_studentId_questionId_idx" ON "QuestionAttemptSession"("studentId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionAttemptSession_startedAt_idx" ON "QuestionAttemptSession"("startedAt");

-- CreateIndex
CREATE INDEX "QuestionAttemptSession_submittedAt_idx" ON "QuestionAttemptSession"("submittedAt");

-- CreateIndex
CREATE INDEX "QuestionAttemptEvent_sessionId_idx" ON "QuestionAttemptEvent"("sessionId");

-- CreateIndex
CREATE INDEX "QuestionAttemptEvent_eventType_idx" ON "QuestionAttemptEvent"("eventType");

-- CreateIndex
CREATE INDEX "QuestionAttemptEvent_createdAt_idx" ON "QuestionAttemptEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttemptEvent_sessionId_stepNumber_key" ON "QuestionAttemptEvent"("sessionId", "stepNumber");

-- CreateIndex
CREATE INDEX "AssignedActivity_studentId_idx" ON "AssignedActivity"("studentId");

-- CreateIndex
CREATE INDEX "AssignedActivity_templateId_idx" ON "AssignedActivity"("templateId");

-- CreateIndex
CREATE INDEX "AssignedActivity_assignedById_idx" ON "AssignedActivity"("assignedById");

-- CreateIndex
CREATE INDEX "AssignedActivity_status_idx" ON "AssignedActivity"("status");

-- CreateIndex
CREATE INDEX "AssignedActivity_sourceTopicId_idx" ON "AssignedActivity"("sourceTopicId");

-- CreateIndex
CREATE INDEX "AssignedActivity_sourceSnapshotId_idx" ON "AssignedActivity"("sourceSnapshotId");

-- CreateIndex
CREATE INDEX "StudentLessonSnapshot_studentId_idx" ON "StudentLessonSnapshot"("studentId");

-- CreateIndex
CREATE INDEX "StudentLessonSnapshot_lessonId_idx" ON "StudentLessonSnapshot"("lessonId");

-- CreateIndex
CREATE INDEX "StudentLessonSnapshot_snapshotAt_idx" ON "StudentLessonSnapshot"("snapshotAt");

-- CreateIndex
CREATE INDEX "StudentLessonSnapshot_isAtRisk_idx" ON "StudentLessonSnapshot"("isAtRisk");

-- CreateIndex
CREATE INDEX "ClassLessonSnapshot_classRoomId_idx" ON "ClassLessonSnapshot"("classRoomId");

-- CreateIndex
CREATE INDEX "ClassLessonSnapshot_lessonId_idx" ON "ClassLessonSnapshot"("lessonId");

-- CreateIndex
CREATE INDEX "ClassLessonSnapshot_triggeredById_idx" ON "ClassLessonSnapshot"("triggeredById");

-- CreateIndex
CREATE INDEX "ClassLessonSnapshot_snapshotAt_idx" ON "ClassLessonSnapshot"("snapshotAt");

-- CreateIndex
CREATE INDEX "ClassLessonSnapshot_classRoomId_lessonId_snapshotAt_idx" ON "ClassLessonSnapshot"("classRoomId", "lessonId", "snapshotAt");

-- CreateIndex
CREATE INDEX "StudentBadge_studentId_idx" ON "StudentBadge"("studentId");

-- CreateIndex
CREATE INDEX "StudentBadge_badgeId_idx" ON "StudentBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBadge_studentId_badgeId_key" ON "StudentBadge"("studentId", "badgeId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_prerequisiteTopicId_fkey" FOREIGN KEY ("prerequisiteTopicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttemptSession" ADD CONSTRAINT "QuestionAttemptSession_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttemptSession" ADD CONSTRAINT "QuestionAttemptSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttemptEvent" ADD CONSTRAINT "QuestionAttemptEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuestionAttemptSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_sourceTopicId_fkey" FOREIGN KEY ("sourceTopicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedActivity" ADD CONSTRAINT "AssignedActivity_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "StudentLessonSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLessonSnapshot" ADD CONSTRAINT "StudentLessonSnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLessonSnapshot" ADD CONSTRAINT "StudentLessonSnapshot_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLessonSnapshot" ADD CONSTRAINT "ClassLessonSnapshot_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLessonSnapshot" ADD CONSTRAINT "ClassLessonSnapshot_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLessonSnapshot" ADD CONSTRAINT "ClassLessonSnapshot_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
