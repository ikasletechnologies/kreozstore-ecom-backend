import * as dotenv from 'dotenv';
import * as path from 'node:path';

// Loaded before any test file/module (including ConfigModule) so e2e runs point at the
// dedicated ecommerce_test database instead of dev data — see .env.test's header comment.
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), quiet: true });
