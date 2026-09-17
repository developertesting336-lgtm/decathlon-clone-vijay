import Address from "../models/Address.js";

const addAddress = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      mobile,
      houseBuilding,
      streetLocality,
      landmark,
      pincode,
      cityState,
      addressType,
      isDefault,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !mobile ||
      !houseBuilding ||
      !streetLocality ||
      !pincode ||
      !cityState
    ) {
      return res.status(400).json({
        message: "Please fill all required address fields",
      });
    }

    if (isDefault === true) {
      await Address.updateMany(
        { user: req.user.id },
        { $set: { isDefault: false } },
      );
    }

    const address = await Address.create({
      user: req.user.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim(),
      houseBuilding: houseBuilding.trim(),
      streetLocality: streetLocality.trim(),
      landmark: landmark?.trim() || "",
      pincode: pincode.trim(),
      cityState: cityState.trim(),
      addressType: addressType || "Home",
      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    console.error("Add Address Error:", error);

    return res.status(500).json({
      message: "Failed to add address",
      error: error.message,
    });
  }
};

const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({
      user: req.user.id,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    console.error("Get Addresses Error:", error);

    return res.status(500).json({
      message: "Failed to fetch addresses",
      error: error.message,
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      firstName,
      lastName,
      mobile,
      houseBuilding,
      streetLocality,
      landmark,
      pincode,
      cityState,
      addressType,
      isDefault,
    } = req.body;

    const address = await Address.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    if (isDefault === true) {
      await Address.updateMany(
        {
          user: req.user.id,
          _id: { $ne: id },
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    if (firstName !== undefined) {
      address.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      address.lastName = lastName.trim();
    }

    if (mobile !== undefined) {
      address.mobile = mobile.trim();
    }

    if (houseBuilding !== undefined) {
      address.houseBuilding = houseBuilding.trim();
    }

    if (streetLocality !== undefined) {
      address.streetLocality = streetLocality.trim();
    }

    if (landmark !== undefined) {
      address.landmark = landmark.trim();
    }

    if (pincode !== undefined) {
      address.pincode = pincode.trim();
    }

    if (cityState !== undefined) {
      address.cityState = cityState.trim();
    }

    if (addressType !== undefined) {
      address.addressType = addressType;
    }

    if (isDefault !== undefined) {
      address.isDefault = Boolean(isDefault);
    }

    await address.save();

    return res.status(200).json({
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update Address Error:", error);

    return res.status(500).json({
      message: "Failed to update address",
      error: error.message,
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    await Address.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete Address Error:", error);

    return res.status(500).json({
      message: "Failed to delete address",
      error: error.message,
    });
  }
};

export { addAddress, getAddresses, updateAddress, deleteAddress };
