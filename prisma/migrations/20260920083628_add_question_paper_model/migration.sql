-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "semester" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitTest" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "maxMarks" TEXT NOT NULL,
    "minMarks" TEXT NOT NULL,
    "examination" TEXT NOT NULL,
    "questionsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
