-- ========================================
-- MIGRATION: Add Soft Delete Support for Students
-- ========================================

-- 1. Add soft delete fields to students table
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deletedBy" UUID REFERENCES "users"("id") ON DELETE SET NULL;

-- 2. Add deactivation fields to personal_schedule_slots
ALTER TABLE "personal_schedule_slots"
ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deactivationReason" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "studentName" VARCHAR(255); -- Preserve name for history

-- 3. Add cancellation fields to completed_lessons
ALTER TABLE "completed_lessons"
ADD COLUMN IF NOT EXISTS "cancelled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "cancelReason" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- 4. Create archived students table for hard deletes
CREATE TABLE IF NOT EXISTS "archived_students" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "originalId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "archivedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "reason" VARCHAR(255),

    CONSTRAINT "archived_students_originalId_key" UNIQUE ("originalId")
);

-- 5. Create index for soft deleted students
CREATE INDEX IF NOT EXISTS "idx_students_isDeleted" ON "students"("isDeleted");
CREATE INDEX IF NOT EXISTS "idx_students_deletedAt" ON "students"("deletedAt");

-- 6. Create index for deactivated slots
CREATE INDEX IF NOT EXISTS "idx_slots_deactivatedAt" ON "personal_schedule_slots"("deactivatedAt");
CREATE INDEX IF NOT EXISTS "idx_slots_deactivationReason" ON "personal_schedule_slots"("deactivationReason");

-- 7. Update views to exclude soft deleted students by default
CREATE OR REPLACE VIEW "active_students" AS
SELECT * FROM "students"
WHERE "isDeleted" = FALSE OR "isDeleted" IS NULL;

-- 8. Fix existing orphaned slots (one-time cleanup)
UPDATE "personal_schedule_slots"
SET
    "isActive" = FALSE,
    "deactivatedAt" = CURRENT_TIMESTAMP,
    "deactivationReason" = 'orphaned_slot_cleanup',
    "studentName" = COALESCE(
        (SELECT "fullName" FROM "students" WHERE "students"."id" = "personal_schedule_slots"."studentId"),
        'Удаленный ученик'
    )
WHERE "studentId" IS NULL AND "isActive" = TRUE;

-- 9. Create function to automatically handle student deletion
CREATE OR REPLACE FUNCTION handle_student_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a student is soft deleted
    IF NEW."isDeleted" = TRUE AND OLD."isDeleted" = FALSE THEN
        -- Deactivate all active schedule slots
        UPDATE "personal_schedule_slots"
        SET
            "isActive" = FALSE,
            "deactivatedAt" = CURRENT_TIMESTAMP,
            "deactivationReason" = 'student_deleted',
            "studentName" = OLD."fullName"
        WHERE "studentId" = NEW."id" AND "isActive" = TRUE;

        -- Cancel all future lessons
        UPDATE "completed_lessons" cl
        SET
            "cancelled" = TRUE,
            "cancelReason" = 'student_deleted',
            "metadata" = jsonb_build_object(
                'cancelledAt', CURRENT_TIMESTAMP,
                'studentName', OLD."fullName"
            )
        FROM "personal_schedule_slots" pss
        WHERE cl."scheduleSlotId" = pss."id"
            AND pss."studentId" = NEW."id"
            AND cl."weekStart" >= CURRENT_DATE
            AND cl."completed" = FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS student_deletion_trigger ON "students";
CREATE TRIGGER student_deletion_trigger
AFTER UPDATE ON "students"
FOR EACH ROW
WHEN (OLD."isDeleted" IS DISTINCT FROM NEW."isDeleted")
EXECUTE FUNCTION handle_student_deletion();

-- 11. Add comment explaining the strategy
COMMENT ON COLUMN "students"."isDeleted" IS 'Soft delete flag - when TRUE, student is considered deleted but data is preserved';
COMMENT ON COLUMN "students"."deletedAt" IS 'Timestamp when student was soft deleted';
COMMENT ON COLUMN "personal_schedule_slots"."studentName" IS 'Preserved student name for historical reference when student is deleted';