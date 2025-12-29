import { getPool, closePool } from '../config/database';
import * as readline from 'readline';

async function setAdminUser(email: string) {
  const pool = getPool();
  
  try {
    // Check if user exists
    const userResult = await pool.query('SELECT email, role FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }
    
    const currentRole = userResult.rows[0].role;
    
    if (currentRole === 'admin') {
      console.log(`ℹ️  User "${email}" is already an admin`);
      return;
    }
    
    // Update user to admin
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
    
    console.log(`✅ Successfully set "${email}" as admin`);
    
    // Verify
    const verifyResult = await pool.query('SELECT email, role FROM users WHERE email = $1', [email]);
    console.log(`Verified: ${verifyResult.rows[0].email} is now ${verifyResult.rows[0].role}`);
    
  } catch (error) {
    console.error('Error setting admin user:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: npm run set-admin -- <email>');
  console.error('Example: npm run set-admin -- hans@niels.nl');
  process.exit(1);
}

setAdminUser(email);
