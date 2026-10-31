import Merchant from '../models/Merchant.js';

// મર્ચન્ટ્સ ની યાદી મેળવો (List Merchants)
export async function listMerchants(req, res) {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const merchants = await Merchant.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: merchants.length,
      merchants
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return res.status(500).json({
      success: false,
      message: 'મર્ચન્ટ્સ લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// એક મર્ચન્ટ ની વિગતો મેળવો (Get Single Merchant)
export async function getMerchant(req, res) {
  try {
    const merchant = await Merchant.findById(req.params.id);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'મર્ચન્ટ મળ્યા નથી (Merchant not found)'
      });
    }

    return res.json({ success: true, merchant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// નવો મર્ચન્ટ ઉમેરો (Create / Add Merchant)
export async function createMerchant(req, res) {
  try {
    const { name, address, mobileNumber } = req.body;

    if (!name || !address || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'નામ, સરનામું અને મોબાઇલ નંબર જરૂરી છે. (Name, address, and mobile number are required.)'
      });
    }

    const merchant = await Merchant.create({
      name: name.trim(),
      address: address.trim(),
      mobileNumber: mobileNumber.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'નવો મર્ચન્ટ સફળતાપૂર્વક ઉમેરાઈ ગયો! (Merchant added successfully!)',
      merchant
    });
  } catch (error) {
    console.error('Error creating merchant:', error);
    return res.status(500).json({
      success: false,
      message: 'મર્ચન્ટ ઉમેરવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// મર્ચન્ટ ની વિગતો અપડેટ કરો (Update Merchant)
export async function updateMerchant(req, res) {
  try {
    const { name, address, mobileNumber } = req.body;
    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'મર્ચન્ટ મળ્યા નથી (Merchant not found)'
      });
    }

    if (name) merchant.name = name.trim();
    if (address) merchant.address = address.trim();
    if (mobileNumber) merchant.mobileNumber = mobileNumber.trim();

    await merchant.save();

    return res.json({
      success: true,
      message: 'મર્ચન્ટની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ! (Merchant updated successfully!)',
      merchant
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// મર્ચન્ટ ડિલીટ કરો (Delete Merchant)
export async function deleteMerchant(req, res) {
  try {
    const merchant = await Merchant.findByIdAndDelete(req.params.id);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'મર્ચન્ટ મળ્યા નથી (Merchant not found)'
      });
    }

    return res.json({
      success: true,
      message: 'મર્ચન્ટ સફળતાપૂર્વક ડિલીટ થઈ ગયો! (Merchant deleted successfully!)'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

