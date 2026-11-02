import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/env.js';

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        success: false,
        message: 'નામ અને ઇમેઇલ જરૂરી છે; પાસવર્ડ 8 થી 72 bytes વચ્ચે હોવો જોઈએ. (Name and email are required; password must be between 8 and 72 bytes.)'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'યોગ્ય ઇમેઇલ આપો. (Please provide a valid email address.)'
      });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: 'આ ઇમેઇલ સાથે વપરાશકર્તા પહેલેથી હાજર છે. (User already exists with this email.)'
      });
    }

    const isFirstUser = (await User.countDocuments()) === 0;
    const role = isFirstUser ? 'Owner & Admin' : 'Operator';
    const roleGuj = isFirstUser ? 'માલિક અને એડમિન' : 'ઓપરેટર';
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role,
      roleGuj
    });
    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    return res.status(201).json({
      success: true,
      message: 'MongoDB માં નવું એકાઉન્ટ સફળતાપૂર્વક બન્યું! (User registered in MongoDB successfully!)',
      token,
      authToken: token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        roleGuj: newUser.roleGuj
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'આ ઇમેઇલ સાથે વપરાશકર્તા પહેલેથી હાજર છે. (User already exists with this email.)'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'સર્વર ભૂલ આવી. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો. (Server error occurred.)'
    });
  }
}

export async function login(req, res) {
  try {
    const rawEmail = req.body.email || req.body.username;
    const { password } = req.body;
    if (typeof rawEmail !== 'string' || typeof password !== 'string' || !rawEmail.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'ઇમેઇલ અને પાસવર્ડ બંને જરૂરી છે. (Email/Username and password are required.)'
      });
    }

    const searchKey = rawEmail.trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: searchKey },
        { email: `${searchKey}@swastikart.com` },
        { name: { $regex: new RegExp(`^${searchKey}$`, 'i') } }
      ]
    }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'ઇમેઇલ અથવા પાસવર્ડ ખોટો છે. (Invalid email or password.)'
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    return res.status(200).json({
      success: true,
      message: 'સફળતાપૂર્વક લોગિન થયું! (Login successful!)',
      token,
      authToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleGuj: user.roleGuj
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'સર્વર ભૂલ આવી. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો. (Server error occurred.)'
    });
  }
}
