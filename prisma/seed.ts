import 'dotenv/config';
import { PrismaClient, type UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface ModuleDef {
  module: string;
  actions: string[];
}

// Mirrors the module list in docs/07-MODULE-BREAKDOWN.md. Extended module-by-module
// as later phases add real domain tables; permission codes are `${module}.${action}`.
const MODULES: ModuleDef[] = [
  { module: 'users', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'roles', actions: ['read', 'update'] },
  { module: 'permissions', actions: ['read', 'update'] },
  { module: 'categories', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'brands', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'attributes', actions: ['create', 'read', 'update', 'delete'] },
  {
    module: 'products',
    actions: ['create', 'read', 'update', 'delete', 'import', 'export'],
  },
  { module: 'inventory', actions: ['read', 'update'] },
  { module: 'warehouses', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'purchase-orders', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'coupons', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'gift-cards', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'offers', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'flash-sales', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'orders', actions: ['read', 'update'] },
  { module: 'payments', actions: ['read', 'refund'] },
  { module: 'shipping', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'taxes', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'reviews', actions: ['read', 'moderate'] },
  { module: 'returns', actions: ['read', 'update'] },
  { module: 'banners', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'cms', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'seo', actions: ['read', 'update'] },
  { module: 'newsletter', actions: ['create', 'read', 'update', 'delete'] },
  { module: 'media', actions: ['upload', 'read', 'delete'] },
  { module: 'reports', actions: ['read'] },
  { module: 'settings', actions: ['read', 'update'] },
  { module: 'notifications', actions: ['read'] },
  { module: 'logs', actions: ['read'] },
];

function expand(codes: string[]): string[] {
  const result = new Set<string>();
  for (const code of codes) {
    if (code.endsWith('.*')) {
      const moduleName = code.slice(0, -2);
      const def = MODULES.find((m) => m.module === moduleName);
      if (!def) throw new Error(`Unknown module in permission bundle: ${moduleName}`);
      for (const action of def.actions) result.add(`${moduleName}.${action}`);
    } else {
      result.add(code);
    }
  }
  return [...result];
}

function allModulesExcept(exclude: string[]): string[] {
  return MODULES.filter((m) => !exclude.includes(m.module)).map((m) => `${m.module}.*`);
}

interface RoleDef {
  name: UserRole;
  label: string;
  description: string;
  bundle: string[];
}

// Default permission bundles per docs/09-AUTH-RBAC.md §7. Super Admin is special-cased
// to the full permission catalog rather than listed here.
const ROLE_DEFS: RoleDef[] = [
  {
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    description:
      'Full system access, including role/permission management and system settings.',
    bundle: [],
  },
  {
    name: 'ADMIN',
    label: 'Admin',
    description: 'Full operational access except role/permission management.',
    bundle: allModulesExcept(['roles', 'permissions']),
  },
  {
    name: 'INVENTORY_MANAGER',
    label: 'Inventory Manager',
    description: 'Manages products, stock, warehouses, suppliers, and purchase orders.',
    bundle: ['products.*', 'inventory.*', 'warehouses.*', 'suppliers.*', 'purchase-orders.*'],
  },
  {
    name: 'SALES_MANAGER',
    label: 'Sales Manager',
    description: 'Manages coupons, offers, and flash sales; views orders and reports.',
    bundle: ['orders.read', 'coupons.*', 'offers.*', 'flash-sales.*', 'reports.read'],
  },
  {
    name: 'ORDER_MANAGER',
    label: 'Order Manager',
    description: 'Manages the order lifecycle, returns/exchanges, and shipping.',
    bundle: ['orders.*', 'returns.*', 'shipping.read'],
  },
  {
    name: 'CUSTOMER_SUPPORT',
    label: 'Customer Support',
    description: 'Views orders/customers, moderates reviews, issues limited refunds.',
    bundle: ['orders.read', 'users.read', 'reviews.moderate', 'payments.refund'],
  },
  {
    name: 'MARKETING',
    label: 'Marketing',
    description: 'Manages CMS content, banners, newsletter, SEO, and offers.',
    bundle: ['cms.*', 'banners.*', 'newsletter.*', 'seo.*', 'offers.*'],
  },
  {
    name: 'CUSTOMER',
    label: 'Customer',
    description: 'Storefront access only — no admin permissions.',
    bundle: [],
  },
];

async function seedPermissions() {
  console.log('Seeding permission catalog...');
  const permissionRecords = MODULES.flatMap((m) =>
    m.actions.map((action) => ({
      code: `${m.module}.${action}`,
      module: m.module,
      action,
      description: `${action} access to ${m.module}`,
    })),
  );

  for (const perm of permissionRecords) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
    });
  }

  console.log(`  ${permissionRecords.length} permissions in catalog.`);
  return permissionRecords;
}

async function seedRolesAndBundles(permissionCodes: string[]) {
  console.log('Seeding roles...');
  for (const def of ROLE_DEFS) {
    await prisma.role.upsert({
      where: { name: def.name },
      create: { name: def.name, label: def.label, description: def.description },
      update: { label: def.label, description: def.description },
    });
  }

  const allRoles = await prisma.role.findMany();
  const roleByName = new Map(allRoles.map((r) => [r.name, r]));
  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p]));

  console.log('Assigning role permission bundles...');
  for (const def of ROLE_DEFS) {
    const role = roleByName.get(def.name);
    if (!role) throw new Error(`Role not found after upsert: ${def.name}`);

    const codes = def.name === 'SUPER_ADMIN' ? permissionCodes : expand(def.bundle);
    const permissionIds = codes
      .map((c) => permissionByCode.get(c)?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    console.log(`  ${def.name}: ${permissionIds.length} permissions`);
  }
}

async function seedSuperAdmin() {
  console.log('Seeding Super Admin user...');
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@gmail.com';
  const defaultPassword = 'Admin@123456';
  const passwordHash = await bcrypt.hash(
    defaultPassword,
    Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  );

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('  =============================================================');
  console.log('   SUPER ADMIN READY');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${defaultPassword}`);
  console.log('  =============================================================');
}

async function main() {
  const permissionRecords = await seedPermissions();
  await seedRolesAndBundles(permissionRecords.map((p) => p.code));
  await seedSuperAdmin();
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
