import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DEMO_CATEGORIES = [
  { name: 'Student Achievement', slug: 'student-achievement', sort_order: 1 },
  { name: 'Staff & Staffing', slug: 'staff-staffing', sort_order: 2 },
  { name: 'Finance & Resources', slug: 'finance-resources', sort_order: 3 },
  { name: 'Community & Engagement', slug: 'community-engagement', sort_order: 4 },
];

const DEMO_PROBLEMS = [
  {
    category_slug: 'student-achievement',
    code: 'MATH-GAP',
    label: 'Closing math achievement gaps',
    description: 'Addressing persistent disparities in math performance across student subgroups',
    sort_order: 1,
  },
  {
    category_slug: 'student-achievement',
    code: 'READ-EARLY',
    label: 'Early literacy intervention',
    description: 'Implementing effective early reading programs for K-3 students',
    sort_order: 2,
  },
  {
    category_slug: 'staff-staffing',
    code: 'TEACHER-RETAIN',
    label: 'Teacher recruitment and retention',
    description: 'Attracting and retaining qualified teachers, especially in high-need subjects',
    sort_order: 1,
  },
  {
    category_slug: 'staff-staffing',
    code: 'SPECIAL-ED-STAFF',
    label: 'Special education staffing',
    description: 'Ensuring adequate staffing for special education services',
    sort_order: 2,
  },
  {
    category_slug: 'finance-resources',
    code: 'BUDGET-CUTS',
    label: 'Managing budget reductions',
    description: 'Maintaining program quality while managing funding constraints',
    sort_order: 1,
  },
  {
    category_slug: 'community-engagement',
    code: 'FAMILY-ENGAGE',
    label: 'Family and community engagement',
    description: 'Building stronger connections between schools and families',
    sort_order: 1,
  },
];

const DEMO_USERS = [
  {
    email: 'demo.alice@springfield-usd.edu',
    full_name: 'Alice Johnson',
    professional_role: 'Superintendent',
    bio: 'Led Springfield USD for 8 years. Focused on closing achievement gaps and building strong community partnerships.',
    district_slug: 'springfield-unified',
    primary_problem_code: 'MATH-GAP',
    secondary_problem_codes: ['TEACHER-RETAIN', 'FAMILY-ENGAGE'],
  },
  {
    email: 'demo.bob@riverside-rural.edu',
    full_name: 'Bob Martinez',
    professional_role: 'Curriculum Director',
    bio: 'Former classroom teacher, now focused on literacy curriculum in rural Texas. Strong advocate for bilingual programs.',
    district_slug: 'riverside-rural',
    primary_problem_code: 'READ-EARLY',
    secondary_problem_codes: ['MATH-GAP', 'FAMILY-ENGAGE'],
  },
  {
    email: 'demo.carol@metro-heights.edu',
    full_name: 'Carol Chen',
    professional_role: 'Assistant Superintendent',
    bio: 'Overseeing HR and operations for Metro Heights. Working on innovative teacher retention strategies.',
    district_slug: 'metro-heights',
    primary_problem_code: 'TEACHER-RETAIN',
    secondary_problem_codes: ['SPECIAL-ED-STAFF', 'BUDGET-CUTS'],
  },
  {
    email: 'demo.david@lakewood.edu',
    full_name: 'David Kim',
    professional_role: 'Special Education Director',
    bio: 'Dedicated to ensuring all students with disabilities receive high-quality services and support.',
    district_slug: 'lakewood-suburban',
    primary_problem_code: 'SPECIAL-ED-STAFF',
    secondary_problem_codes: ['BUDGET-CUTS'],
  },
  {
    email: 'demo.eve@mountain-view.edu',
    full_name: 'Eve Rodriguez',
    professional_role: 'Principal',
    bio: 'Charter school principal in Denver. Passionate about family engagement and project-based learning.',
    district_slug: 'mountain-view-charter',
    primary_problem_code: 'FAMILY-ENGAGE',
    secondary_problem_codes: ['READ-EARLY', 'MATH-GAP'],
  },
];

async function seedDemo() {
  const client = await pool.connect();
  try {
    console.log('Seeding demo data...');

    // Seed problem categories
    const categoryIds = new Map<string, string>();
    for (const cat of DEMO_CATEGORIES) {
      const result = await client.query(
        `INSERT INTO problem_categories (name, slug, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [cat.name, cat.slug, cat.sort_order]
      );
      categoryIds.set(cat.slug, result.rows[0].id);
      console.log(`  Category: ${cat.name}`);
    }

    // Seed problem statements
    const problemIds = new Map<string, string>();
    for (const prob of DEMO_PROBLEMS) {
      const categoryId = categoryIds.get(prob.category_slug);
      if (!categoryId) continue;

      const result = await client.query(
        `INSERT INTO problem_statements (category_id, code, label, description, status, sort_order)
         VALUES ($1, $2, $3, $4, 'active', $5)
         ON CONFLICT (code) DO UPDATE
           SET label = EXCLUDED.label,
               description = EXCLUDED.description,
               status = 'active'
         RETURNING id`,
        [categoryId, prob.code, prob.label, prob.description, prob.sort_order]
      );
      problemIds.set(prob.code, result.rows[0].id);
      console.log(`  Problem: ${prob.code}`);
    }

    // Get district IDs
    const districtIds = new Map<string, string>();
    const districtResult = await client.query('SELECT id, slug FROM districts');
    for (const row of districtResult.rows) {
      districtIds.set(row.slug, row.id);
    }

    // Seed demo users
    const demoPassword = await bcrypt.hash('demo-password-123', 10);

    for (const userData of DEMO_USERS) {
      const districtId = districtIds.get(userData.district_slug);
      if (!districtId) {
        console.warn(`  District not found: ${userData.district_slug} — run ingest:districts first`);
        continue;
      }

      // Insert demo user
      const userResult = await client.query(
        `INSERT INTO users
         (email, password_hash, full_name, professional_role, bio, district_id,
          membership_status, is_demo_profile, profile_completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', true, now())
         ON CONFLICT (email) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               professional_role = EXCLUDED.professional_role,
               bio = EXCLUDED.bio,
               district_id = EXCLUDED.district_id,
               membership_status = 'approved',
               is_demo_profile = true,
               profile_completed_at = COALESCE(users.profile_completed_at, now())
         RETURNING id`,
        [
          userData.email,
          demoPassword,
          userData.full_name,
          userData.professional_role,
          userData.bio,
          districtId,
        ]
      );

      const userId = userResult.rows[0].id;
      console.log(`  User: ${userData.full_name} (${userId})`);

      // Set primary problem
      const primaryId = problemIds.get(userData.primary_problem_code);
      if (primaryId) {
        await client.query(
          `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (user_id, problem_statement_id) DO UPDATE SET is_primary = true`,
          [userId, primaryId]
        );
        // Clear other primaries
        await client.query(
          `UPDATE user_problem_selections SET is_primary = false
           WHERE user_id = $1 AND problem_statement_id != $2 AND is_primary = true`,
          [userId, primaryId]
        );
      }

      // Set secondary problems
      for (const code of userData.secondary_problem_codes) {
        const probId = problemIds.get(code);
        if (!probId) continue;
        await client.query(
          `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
           VALUES ($1, $2, false)
           ON CONFLICT (user_id, problem_statement_id) DO NOTHING`,
          [userId, probId]
        );
      }
    }

    console.log('Demo seeding complete.');
    console.log('Demo user password: demo-password-123');
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo().catch((err) => {
  console.error('Demo seeding failed:', err);
  process.exit(1);
});
