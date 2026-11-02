import Profile from '../models/Profile.js';
import { DEFAULT_PROFILES } from '../config/defaultProfiles.js';

// બધી પ્રોફાઇલ્સ મેળવો (Get all firm profiles)
export async function listProfiles(req, res) {
  try {
    let profiles = await Profile.find().sort({ createdAt: -1 });

    // જો કોઈ પ્રોફાઇલ ન હોય તો ડિફોલ્ટ બંને ફર્મ ઓટોમેટીક સીડ કરો
    if (profiles.length === 0) {
      profiles = await Profile.insertMany(DEFAULT_PROFILES);
    }

    return res.json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return res.status(500).json({
      success: false,
      message: 'પ્રોફાઇલ મેળવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// સિંગલ પ્રોફાઇલ મેળવો (Get profile by ID)
export async function getProfile(req, res) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'પ્રોફાઇલ મળી નથી (Profile not found)'
      });
    }

    return res.json({ success: true, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// નવી ફર્મ પ્રોફાઇલ બનાવો (Create new firm profile)
export async function createProfile(req, res) {
  try {
    const {
      firmName,
      businessType,
      greeting,
      ownerName,
      mobileNumbers,
      address,
      gstin,
      panNo,
      stateCode,
      bankDetails,
      termsAndConditions,
      templateType,
      isDefault
    } = req.body;

    if (!firmName || !address) {
      return res.status(400).json({
        success: false,
        message: 'ફર્મનું નામ અને સરનામું જરૂરી છે (Firm name and address are required)'
      });
    }

    if (isDefault) {
      await Profile.updateMany({}, { isDefault: false });
    }

    const profile = await Profile.create({
      user: req.user ? req.user.id : undefined,
      firmName: firmName.trim(),
      businessType: businessType || 'All Types of Embroidery Job Work',
      greeting: greeting || '',
      ownerName: ownerName || '',
      mobileNumbers: Array.isArray(mobileNumbers) ? mobileNumbers : (mobileNumbers ? [mobileNumbers] : []),
      address: address.trim(),
      gstin: gstin ? gstin.trim() : '',
      panNo: panNo ? panNo.trim() : '',
      stateCode: stateCode || '24',
      bankDetails: bankDetails || {},
      termsAndConditions: Array.isArray(termsAndConditions) ? termsAndConditions : [],
      templateType: templateType || (gstin ? 'swastik' : 'astha'),
      isDefault: Boolean(isDefault)
    });

    return res.status(201).json({
      success: true,
      message: 'નવી ફર્મ પ્રોફાઇલ સફળતાપૂર્વક બની ગઈ! (Firm profile created successfully!)',
      profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'પ્રોફાઇલ બનાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// પ્રોફાઇલ અપડેટ કરો (Update firm profile)
export async function updateProfile(req, res) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'પ્રોફાઇલ મળી નથી (Profile not found)'
      });
    }

    const allowedFields = [
      'firmName',
      'businessType',
      'greeting',
      'ownerName',
      'mobileNumbers',
      'address',
      'gstin',
      'panNo',
      'stateCode',
      'bankDetails',
      'termsAndConditions',
      'templateType',
      'isDefault'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    if (req.body.isDefault === true) {
      await Profile.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    await profile.save();

    return res.json({
      success: true,
      message: 'પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ! (Profile updated successfully!)',
      profile
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// પ્રોફાઇલ ડિલીટ કરો (Delete firm profile)
export async function deleteProfile(req, res) {
  try {
    const profile = await Profile.findByIdAndDelete(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'પ્રોફાઇલ મળી નથી (Profile not found)'
      });
    }

    return res.json({
      success: true,
      message: 'પ્રોફાઇલ સફળતાપૂર્વક ડિલીટ થઈ ગઈ! (Profile deleted successfully!)'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ડિફોલ્ટ બંને ફર્મ્સ (Astha Fashion & Swastik Art) રીસેટ/સીડ કરો
export async function seedProfiles(req, res) {
  try {
    for (const item of DEFAULT_PROFILES) {
      const exists = await Profile.findOne({ firmName: item.firmName });
      if (!exists) {
        await Profile.create(item);
      }
    }

    const profiles = await Profile.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      message: 'ડિફોલ્ટ ફર્મ્સ સફળતાપૂર્વક સીડ થઈ ગઈ! (Default profiles seeded!)',
      profiles
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

