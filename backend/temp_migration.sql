-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropIndex
DROP INDEX "public"."client_relations_client_id_idx";

-- DropIndex
DROP INDEX "public"."client_relations_related_client_id_idx";

-- DropIndex
DROP INDEX "public"."client_relations_client_id_relation_type_idx";

-- DropIndex
DROP INDEX "public"."subscriptions_client_id_status_idx";

-- DropIndex
DROP INDEX "public"."payments_client_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."invoices_client_id_status_idx";

