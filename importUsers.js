require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('./models/User');

// --- Configuration ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/userimport';
const MAILTRAP_USER = process.env.MAILTRAP_USER || 'your_user';
const MAILTRAP_PASS = process.env.MAILTRAP_PASS || 'your_pass';

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: MAILTRAP_USER,
    pass: MAILTRAP_PASS
  }
});

// --- Helper Functions ---
function generatePassword(length = 16) {
  // Simple random string generator
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendEmail(email, password) {
  const mailOptions = {
    from: '"Super Social Admin" <admin@social.com>',
    to: email,
    subject: `Your Account Credentials - ${new Date().toLocaleDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4A90E2;">Welcome to the Platform!</h2>
        <p>Hello,</p>
        <p>Your account has been created successfully. Below are your temporary credentials:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="padding: 2px 4px; background-color: #eee; border-radius: 3px;">${password}</code></p>
        </div>
        <p style="color: #d9534f;"><strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
        <p>Best regards,<br>The Engineering Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Error sending email to ${email}:`, error.message);
    throw error;
  }
}

// --- Main Script ---
async function importUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB.');

    // Create Excel file if not exists for demo purposes
    if (!require('fs').existsSync('user.xlsx')) {
        console.log('Excel file not found. Creating a sample user.xlsx...');
        const data = [
            ['username', 'email'],
            ['user01', 'user01@example.com'],
            ['user02', 'user02@example.com'],
            ['user03', 'user03@example.com'],
            ['user04', 'user04@example.com'],
            ['user05', 'user05@example.com']
        ];
        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Users');
        xlsx.writeFile(wb, 'user.xlsx');
    }

    const workbook = xlsx.readFile('user.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`🚀 Starting import of ${data.length} users...`);

    for (const row of data) {
      const { username, email } = row;
      
      if (!username || !email) {
        console.warn('⚠️ Skipping row with missing username or email.');
        continue;
      }

      const password = generatePassword();
      const existingUser = await User.findOne({ username });

      if (existingUser) {
        console.log(`ℹ️ User ${username} already exists, skipping...`);
        continue;
      }

      // Hash password before saving to DB
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role: 'user'
      });

      await newUser.save();
      console.log(`👤 User ${username} created in database.`);

      // Send the clear-text password to user via email
      await sendEmail(email, password);
    }

    console.log('✅ Import process completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

importUsers();
