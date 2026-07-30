-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_TOP', 'SIDEBAR', 'CHECKOUT');

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" "BannerPosition" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_position_isActive_idx" ON "banners"("position", "isActive");
