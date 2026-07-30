-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE_IN', 'SALE_OUT', 'RESERVATION', 'RELEASE_RESERVATION', 'ADJUSTMENT', 'DAMAGE', 'RETURN_IN', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductRelationType" AS ENUM ('RELATED', 'CROSS_SELL', 'UP_SELL');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "categoryId" UUID NOT NULL,
    "brandId" UUID,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "altText" TEXT,
    "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "mrp" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "gstRatePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "weightGrams" INTEGER,
    "lengthMm" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_attribute_values" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "attributeValueId" UUID NOT NULL,

    CONSTRAINT "product_variant_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_relations" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "type" "ProductRelationType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_status_deletedAt_idx" ON "products"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_attribute_values_variantId_attributeValueId_key" ON "product_variant_attribute_values"("variantId", "attributeValueId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_productId_tagId_key" ON "product_tags"("productId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "product_relations_sourceId_targetId_type_key" ON "product_relations"("sourceId", "targetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_warehouseId_idx" ON "purchase_orders"("warehouseId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_variantId_idx" ON "purchase_order_items"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_variantId_warehouseId_key" ON "stock_items"("variantId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_movements_variantId_createdAt_idx" ON "stock_movements"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_warehouseId_idx" ON "stock_movements"("warehouseId");

-- CreateIndex
CREATE INDEX "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_attribute_values" ADD CONSTRAINT "product_variant_attribute_values_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_attribute_values" ADD CONSTRAINT "product_variant_attribute_values_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
