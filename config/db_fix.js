const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:%40MillionaireBy2026@db.mpjezwlweapgltrimtqy.supabase.co:5432/postgres',
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase Database successfully!');

    // 1. Fix the schema mismatch
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'wifi_users' 
          AND column_name = 'current_package_id'
        ) THEN
          ALTER TABLE wifi_users RENAME COLUMN current_package_id TO package_id;
        END IF;
      END $$;
    `);
    console.log('✅ Schema mismatches fixed automatically.');

    // 2. Fetch Owner Credentials
    const adminsRes = await client.query(`SELECT email, username, full_name FROM admins WHERE owner_id IS NOT NULL`);
    console.log('👤 Registered Owners:', adminsRes.rows);

    if (adminsRes.rows.length > 0) {
      const ownerUsername = adminsRes.rows[0].username;
      
      // 3. Force reset the first owner's password to password123
      await client.query(`
        UPDATE system_credentials
        SET password_hash = crypt('password123', gen_salt('bf'))
        WHERE username = $1
      `, [ownerUsername]);
      
      console.log('🔑 Password for your Owner Account (' + ownerUsername + ') has been successfully reset to: password123');
    } else {
      console.log('⚠️ No existing owners found in the database. You will need to click Register Owner to create one.');
    }

  } catch (err) {
    console.error('Database connection or query error:', err.message);
  } finally {
    await client.end();
  }
}

run();
