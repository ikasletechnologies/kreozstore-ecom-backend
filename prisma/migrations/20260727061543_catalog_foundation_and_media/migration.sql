-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED',
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

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoPath" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedBy" UUID,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "swatchHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "type" "MediaType" NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "uploadedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "brands"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_name_key" ON "attributes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attributeId_value_key" ON "attribute_values"("attributeId", "value");

-- CreateIndex
CREATE INDEX "media_assets_entityType_entityId_idx" ON "media_assets"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
