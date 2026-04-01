const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt'); // Added for later user password hashing
const db = require('./db'); // Import DB connection pool
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up Hostinger SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper to generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. Send OTP
app.post('/send-otp', async (req, res) => {
  const { email, reason } = req.body;

  if (!email || !reason) {
    return res.status(400).json({ error: 'Email and reason are required' });
  }

  try {
    // Check user existence depending on the reason
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (reason === 'signup' && existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (reason === 'reset' && existing.length === 0) {
      return res.status(400).json({ error: 'Email not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 1. Save OTP to DB
    await db.query(
      'INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    // 2. Send email via Hostinger
    const subjectTitle = reason === 'signup' ? 'Your Verdict Verification Code' : 'Your Password Reset OTP';
    await transporter.sendMail({
      from: `"Verdict App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subjectTitle,
      text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
      html: `<b>Your OTP is: ${otp}</b><br>It will expire in 10 minutes.`,
    });

    console.log(`OTP (${reason}) sent and saved for:`, email);
    
    // SECURE: We no longer return the OTP in the response
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error in /send-otp:', error);
    res.status(500).json({ error: 'Failed to process OTP request' });
  }
});

// 2. Verify OTP and Reset Password
app.post('/verify-otp', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, Code, and newPassword are required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash the new password and update the user's record
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // In case the user doesn't exist yet, we still delete OTP. 
    // Ideally check if user exists first.
    await db.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);
    
    await db.query('DELETE FROM otps WHERE email = ?', [email]);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in /verify-otp:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// 3. User Signup
app.post('/signup', async (req, res) => {
  const { fullName, email, password, role, code } = req.body;

  if (!fullName || !email || !password || !code) {
    return res.status(400).json({ error: 'All fields and OTP code are required' });
  }

  try {
    // 1. Check if user already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Verify OTP
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Save to DB
    await db.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [fullName, email, passwordHash, role || 'client']
    );

    // 5. Clean up OTP
    await db.query('DELETE FROM otps WHERE email = ?', [email]);

    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('Error in /signup:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// 4. User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Success (In a real app, generate a JWT here)
    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Initialize Database tables
const initializeDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database tables verified/initialized.');
  } catch (error) {
    console.error('Failed to initialize tables:', error);
  }
};
initializeDb();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
