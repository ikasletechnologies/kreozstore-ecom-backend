-- AlterTable
ALTER TABLE "products" ADD COLUMN     "minPrice" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "products_minPrice_idx" ON "products"("minPrice");
