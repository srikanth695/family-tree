-- Drop references to media that no longer exists before adding the constraint.
UPDATE "people" SET "profile_media_id" = NULL
WHERE "profile_media_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "media" WHERE "media"."id" = "people"."profile_media_id");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_profile_media_id_fkey" FOREIGN KEY ("profile_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
