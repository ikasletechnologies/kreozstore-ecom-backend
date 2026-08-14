import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DESCRIPTION = `Nuru Botanicz is a 100% natural, unrefined shea butter cream made from pure Shea Butter (Vitellaria nilotica) — rich in Vitamins A, E & F and naturally occurring fatty acids. A single jar works as a deep-moisturizing treatment for face, body, lips and hair.

Benefits
- Deeply moisturizes & nourishes dry skin
- Helps treat eczema & soothes itching
- Helps reduce stretch marks & improves skin elasticity
- Helps fade scars, dark spots & marks
- Safe & effective for pregnant women
- Softens rough elbows, knees & heels
- Soothes sunburn & irritated skin
- Suitable for skin, lips & hair
- Rich in Vitamins A, E & F and fatty acids

Directions for use
Take a small amount and warm between palms, then apply to face, body, lips or hair. Use daily for best results.

For external use only. Store in a cool, dry place. Keep away from direct sunlight.

100% Natural & Unrefined. No Chemicals. No Preservatives.`;

const SHORT_DESCRIPTION =
  'Deeply moisturizing unrefined shea butter cream for face, body, lips & hair. 100% natural, unrefined — no chemicals, no preservatives.';

async function main() {
  console.log('Seeding KREOZ brand...');
  const brand = await prisma.brand.upsert({
    where: { slug: 'kreoz' },
    update: {
      name: 'KREOZ',
      description: 'KREOZ — natural skin & hair care essentials.',
      status: 'PUBLISHED',
    },
    create: {
      name: 'KREOZ',
      slug: 'kreoz',
      description: 'KREOZ — natural skin & hair care essentials.',
      status: 'PUBLISHED',
    },
  });

  console.log('Seeding category...');
  const category = await prisma.category.upsert({
    where: { slug: 'skin-hair-care' },
    update: {
      name: 'Skin & Hair Care',
      status: 'PUBLISHED',
    },
    create: {
      name: 'Skin & Hair Care',
      slug: 'skin-hair-care',
      description: 'Natural skin and hair care essentials.',
      status: 'PUBLISHED',
    },
  });

  console.log('Seeding Nuru Botanicz product...');
  const existing = await prisma.product.findUnique({ where: { slug: 'nuru-botanicz' } });

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: 'Nuru Botanicz Natural Shea Butter',
          description: DESCRIPTION,
          shortDescription: SHORT_DESCRIPTION,
          categoryId: category.id,
          brandId: brand.id,
          status: 'PUBLISHED',
          isFeatured: true,
          isBestSeller: true,
          metaTitle: 'Nuru Botanicz Natural Shea Butter Cream | KREOZ',
          metaDescription: SHORT_DESCRIPTION,
        },
      })
    : await prisma.product.create({
        data: {
          title: 'Nuru Botanicz Natural Shea Butter',
          slug: 'nuru-botanicz',
          description: DESCRIPTION,
          shortDescription: SHORT_DESCRIPTION,
          categoryId: category.id,
          brandId: brand.id,
          status: 'PUBLISHED',
          isFeatured: true,
          isBestSeller: true,
          metaTitle: 'Nuru Botanicz Natural Shea Butter Cream | KREOZ',
          metaDescription: SHORT_DESCRIPTION,
        },
      });

  console.log('Seeding default variant...');
  const sku = 'NURU-BOTANICZ-50G';
  const existingVariant = await prisma.productVariant.findUnique({ where: { sku } });
  const sellingPrice = 599;

  if (existingVariant) {
    await prisma.productVariant.update({
      where: { id: existingVariant.id },
      data: {
        mrp: 699,
        sellingPrice,
        costPrice: 250,
        gstRatePct: 18,
        weightGrams: 50,
        isDefault: true,
      },
    });
  } else {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        mrp: 699,
        sellingPrice,
        costPrice: 250,
        gstRatePct: 18,
        weightGrams: 50,
        isDefault: true,
      },
    });
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { minPrice: sellingPrice },
  });

  console.log('  =============================================================');
  console.log('   NURU BOTANICZ PRODUCT READY');
  console.log(`   Slug:  nuru-botanicz`);
  console.log(`   Price: MRP 699 / Selling 599 (placeholder — update via admin panel)`);
  console.log('  =============================================================');
  console.log('Seed complete. Run prisma/add-product-images.ts once product photos are available.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
