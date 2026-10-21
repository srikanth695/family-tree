-- AlterTable
ALTER TABLE "family_trees" ADD COLUMN "layout" JSONB;

-- CreateIndex
CREATE INDEX "family_trees_owner_id_idx" ON "family_trees"("owner_id");

-- CreateIndex
CREATE INDEX "tree_members_user_id_idx" ON "tree_members"("user_id");

-- CreateIndex
CREATE INDEX "people_tree_id_idx" ON "people"("tree_id");

-- CreateIndex
CREATE INDEX "relationships_tree_id_idx" ON "relationships"("tree_id");

-- CreateIndex
CREATE INDEX "relationships_person_a_id_idx" ON "relationships"("person_a_id");

-- CreateIndex
CREATE INDEX "relationships_person_b_id_idx" ON "relationships"("person_b_id");

-- CreateIndex
CREATE INDEX "life_events_person_id_idx" ON "life_events"("person_id");

-- CreateIndex
CREATE INDEX "media_tree_id_idx" ON "media"("tree_id");

-- CreateIndex
CREATE INDEX "media_person_id_idx" ON "media"("person_id");

-- CreateIndex
CREATE INDEX "sources_tree_id_idx" ON "sources"("tree_id");

-- CreateIndex
CREATE INDEX "stories_tree_id_idx" ON "stories"("tree_id");

-- CreateIndex
CREATE INDEX "stories_person_id_idx" ON "stories"("person_id");
