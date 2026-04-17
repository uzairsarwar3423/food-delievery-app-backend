-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "applicability_rules" JSONB,
ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gradient_colors" JSONB,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maximum_discount_amount" DECIMAL(10,2),
ADD COLUMN     "subtitle" VARCHAR(200),
ADD COLUMN     "terms_conditions" TEXT,
ADD COLUMN     "usage_limit" INTEGER,
ADD COLUMN     "usage_limit_per_user" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deal_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deal_id" UUID,
ADD COLUMN     "deal_name" VARCHAR(200);

-- CreateTable
CREATE TABLE "deal_usage" (
    "id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deals_is_featured_idx" ON "deals"("is_featured");

-- CreateIndex
CREATE INDEX "deal_usage_deal_id_idx" ON "deal_usage"("deal_id");

-- CreateIndex
CREATE INDEX "deal_usage_user_id_idx" ON "deal_usage"("user_id");

-- CreateIndex
CREATE INDEX "deal_usage_order_id_idx" ON "deal_usage"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_usage_deal_id_order_id_key" ON "deal_usage"("deal_id", "order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usage" ADD CONSTRAINT "deal_usage_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usage" ADD CONSTRAINT "deal_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_usage" ADD CONSTRAINT "deal_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
