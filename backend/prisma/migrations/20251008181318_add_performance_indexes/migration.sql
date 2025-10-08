/*
  Warnings:

  - You are about to drop the column `group` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "grades" ADD COLUMN "recommendations" TEXT;

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "groups_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "notes" TEXT,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "students_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "students_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_students" ("createdAt", "fullName", "id", "notes", "teacherId", "updatedAt") SELECT "createdAt", "fullName", "id", "notes", "teacherId", "updatedAt" FROM "students";
DROP TABLE "students";
ALTER TABLE "new_students" RENAME TO "students";
CREATE INDEX "students_teacherId_idx" ON "students"("teacherId");
CREATE INDEX "students_groupId_idx" ON "students"("groupId");
CREATE INDEX "students_teacherId_groupId_idx" ON "students"("teacherId", "groupId");
CREATE INDEX "students_fullName_idx" ON "students"("fullName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "groups_teacherId_idx" ON "groups"("teacherId");

-- CreateIndex
CREATE INDEX "groups_name_idx" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_teacherId_key" ON "groups"("name", "teacherId");

-- CreateIndex
CREATE INDEX "attachments_gradeId_idx" ON "attachments"("gradeId");

-- CreateIndex
CREATE INDEX "criteria_order_idx" ON "criteria"("order");

-- CreateIndex
CREATE INDEX "criterion_grades_gradeId_idx" ON "criterion_grades"("gradeId");

-- CreateIndex
CREATE INDEX "criterion_grades_criterionId_idx" ON "criterion_grades"("criterionId");

-- CreateIndex
CREATE INDEX "grades_studentId_idx" ON "grades"("studentId");

-- CreateIndex
CREATE INDEX "grades_yearId_idx" ON "grades"("yearId");

-- CreateIndex
CREATE INDEX "grades_month_idx" ON "grades"("month");

-- CreateIndex
CREATE INDEX "grades_studentId_yearId_idx" ON "grades"("studentId", "yearId");

-- CreateIndex
CREATE INDEX "grades_yearId_month_idx" ON "grades"("yearId", "month");

-- CreateIndex
CREATE INDEX "grades_createdAt_idx" ON "grades"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "years_createdBy_idx" ON "years"("createdBy");

-- CreateIndex
CREATE INDEX "years_year_idx" ON "years"("year");
