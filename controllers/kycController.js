const axios = require("axios");
const PanVerification = require("../models/PanVerification");
const DigilockerVerification = require("../models/DigilockerVerification");

// ======================================
// VERIFY PAN
// ======================================

const verifyPAN = async (req, res) => {
  try {
    console.log("\n========== PAN PREMIUM VERIFICATION START ==========");

    // 1. PAN validation
    const { panNumber } = req.body;

    console.log("[1] Validating PAN...");

    if (!panNumber || typeof panNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "PAN number is required",
      });
    }

    const pan = panNumber.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (!panRegex.test(pan)) {
      console.log("[1] Invalid PAN format");

      return res.status(400).json({
        success: false,
        message: "Invalid PAN number format",
      });
    }

    console.log("[1] PAN format valid");

    // 2. Authenticated user
    console.log("[2] Checking authenticated user...");

    const userId = req.user?._id;

    if (!userId) {
      console.log("[2] User not authenticated");

      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    console.log("[2] User authenticated");

    // 3. Check environment variables
    console.log("[3] Checking IndiConnect configuration...");

    const {
      INDICONNECT_BASE_URL,
      INDICONNECT_SERVICE_KEY,
      INDICONNECT_SECRET_KEY,
      INDICONNECT_ACCESS_KEY,
      INDICONNECT_PROVIDER_CODE_V4,
    } = process.env;

    console.log({
      baseURL: INDICONNECT_BASE_URL,
      serviceKeyPresent: !!INDICONNECT_SERVICE_KEY,
      secretKeyPresent: !!INDICONNECT_SECRET_KEY,
      accessKeyPresent: !!INDICONNECT_ACCESS_KEY,
      providerCodePresent: !!INDICONNECT_PROVIDER_CODE_V4,
    });

    if (
      !INDICONNECT_BASE_URL ||
      !INDICONNECT_SERVICE_KEY ||
      !INDICONNECT_SECRET_KEY ||
      !INDICONNECT_ACCESS_KEY ||
      !INDICONNECT_PROVIDER_CODE_V4
    ) {
      console.log("[3] Missing IndiConnect configuration");

      return res.status(500).json({
        success: false,
        message: "IndiConnect configuration missing",
      });
    }

    // 4. Prepare API URL and authorization
    const apiUrl = `${INDICONNECT_BASE_URL.replace(/\/+$/, "")}/idverifygr/verification`;

    const authorization = `x-api-access ${INDICONNECT_SECRET_KEY}:${INDICONNECT_ACCESS_KEY}`;

    console.log("[4] API URL:", apiUrl);
    console.log(
      "[4] Authorization prefix valid:",
      authorization.startsWith("x-api-access "),
    );

    // 5. GraphQL mutation from your cURL
    const query = `
      mutation VerifyPanPremium($input: VerifyInput!) {
        verify(input: $input) {
          ok
          message
          status
          result {
            __typename
            ... on BTPanPremiumResult {
              txn_id
              api_name
              api_category
              billable
              message
              status
              datetime
              pan_number
              full_name
              full_name_split
              masked_aadhaar
              address {
                district_code
                district_name
                district_name_vernacular
                state
                state_code
              }
              email
              phone_number
              gender
              dob
              aadhaar_linked
              category
              less_info
              is_director {
                found
                info
              }
              is_sole_proprietor {
                found
                info
              }
              doi
              raw
            }
          }
          error {
            status
            message
            raw
          }
        }
      }
    `;

    // 6. GraphQL request body
    const requestBody = {
      query,
      variables: {
        input: {
          documentType: "verify-pan-premium",
          pan,
        },
      },
    };

    console.log("[5] GraphQL request prepared");
    console.log("[5] Document type: verify-pan-premium");
    console.log("[5] PAN available:", !!pan);

    // 7. Call IndiConnect GraphQL API
    console.log("[6] Calling IndiConnect PAN Premium API...");

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        "service-key": INDICONNECT_SERVICE_KEY,
        Authorization: authorization,
        providercode: INDICONNECT_PROVIDER_CODE_V4,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("[6] Provider HTTP status:", response.status);

    const providerData = response.data;

    // GraphQL can return HTTP 200 with errors.
    if (providerData?.errors?.length) {
      console.error(
        "[6] GraphQL errors:",
        providerData.errors.map((item) => item.message),
      );

      return res.status(502).json({
        success: false,
        message: "IndiConnect GraphQL request failed",
        providerMessage: providerData.errors.map((item) => item.message),
      });
    }

    // 8. Extract GraphQL verification response
    console.log("[7] Extracting provider verification result...");

    const verifyResult = providerData?.data?.verify;

    if (!verifyResult) {
      console.log("[7] Missing data.verify in provider response");

      return res.status(502).json({
        success: false,
        message: "Invalid response received from PAN provider",
      });
    }

    console.log("[7] Provider OK:", verifyResult.ok);
    console.log("[7] Provider status:", verifyResult.status);
    console.log("[7] Provider message:", verifyResult.message);

    // 9. Check verification status
    if (verifyResult.ok !== true) {
      console.log("[8] PAN verification unsuccessful");

      return res.status(422).json({
        success: false,
        message:
          verifyResult.error?.message ||
          verifyResult.message ||
          "PAN verification unsuccessful",
        providerStatus: verifyResult.error?.status || verifyResult.status,
      });
    }

    const panResult = verifyResult.result;

    if (!panResult) {
      console.log("[8] Provider result missing");

      return res.status(502).json({
        success: false,
        message: "PAN verification result missing",
      });
    }

    console.log("[8] PAN verification successful");
    console.log("[8] Transaction ID:", panResult.txn_id);
    console.log("[8] API name:", panResult.api_name);

    // 10. Mask PAN
    const fullPAN = pan;

    console.log("[9] Masked PAN generated");

    // 11. Save verification in MongoDB
    console.log("[10] Saving verification in MongoDB...");

    const verification = await PanVerification.create({
      userId,
      panNumber: fullPAN,
      provider: "indiconnect",
      documentType: "PAN Premium",
      verificationStatus: "verified",
      providerReferenceId: panResult.txn_id || null,
      providerResponse: providerData,
      verifiedAt: new Date(),
    });

    console.log("[10] MongoDB save successful");
    console.log("[10] Verification ID:", verification._id);

    // 12. Send response
    console.log("========== PAN PREMIUM VERIFICATION SUCCESS ==========\n");

    return res.status(200).json({
      success: true,
      message: verifyResult.message || "PAN verification successful",
      verificationId: verification._id,
      data: {
        txn_id: panResult.txn_id,
        api_name: panResult.api_name,
        status: panResult.status,
        message: panResult.message,
        pan_number: panResult.pan_number,
        full_name: panResult.full_name,
        full_name_split: panResult.full_name_split,
        masked_aadhaar: panResult.masked_aadhaar,
        address: panResult.address,
        email: panResult.email,
        phone_number: panResult.phone_number,
        gender: panResult.gender,
        dob: panResult.dob,
        aadhaar_linked: panResult.aadhaar_linked,
        category: panResult.category,
        is_director: panResult.is_director,
        is_sole_proprietor: panResult.is_sole_proprietor,
        doi: panResult.doi,
      },
    });
  } catch (error) {
    console.error("\n========== PAN PREMIUM VERIFICATION ERROR ==========");

    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("HTTP status:", error.response?.status);

    console.error(
      "Provider error:",
      error.response?.data?.errors?.map((item) => item.message) ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "No provider error message",
    );

    console.error("====================================================\n");

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "PAN API request timeout",
      });
    }

    if (error.response) {
      return res.status(502).json({
        success: false,
        message: "PAN provider API failed",
        providerStatus: error.response.status,
        providerMessage:
          error.response.data?.message ||
          error.response.data?.error ||
          "Provider request failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================
// GET PAN VERIFICATION HISTORY
// ======================================
const getPANHistory = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const history = await PanVerification.find({ userId })
      .select("-providerResponse")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("PAN History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch PAN history",
    });
  }
};

// ============================================
// GENERATE DIGILOCKER KYC LINK
// ============================================

const generateDigilockerLink = async (req, res) => {
  try {
    console.log("\n========== DIGILOCKER GENERATION START ==========");

    // 1. Get request body
    const {
      firstName,
      lastName,
      mobile,
      emailId,
      redirectionUrl,
      webhookUrl,
      isSendOtp = true,
      isHideExplanationScreen = true,
      failOnDocNotFound = false,
      expiry = "345600000",
    } = req.body;

    console.log("[1] Validating request data...");

    // 2. Validate required fields
    if (
      !firstName ||
      !lastName ||
      !mobile ||
      !emailId ||
      !redirectionUrl ||
      !webhookUrl
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, mobile, email, redirection URL and webhook URL are required",
      });
    }

    const cleanFirstName = String(firstName).trim();
    const cleanLastName = String(lastName).trim();
    const cleanMobile = String(mobile).trim();
    const cleanEmail = String(emailId).trim().toLowerCase();

    const mobileRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number",
      });
    }

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate URLs
    try {
      const redirect = new URL(redirectionUrl);
      const webhook = new URL(webhookUrl);

      if (
        !["http:", "https:"].includes(redirect.protocol) ||
        !["http:", "https:"].includes(webhook.protocol)
      ) {
        throw new Error("Invalid URL protocol");
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid redirection URL or webhook URL",
      });
    }

    const expiryValue = String(expiry);

    if (!/^\d+$/.test(expiryValue) || Number(expiryValue) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry value",
      });
    }

    console.log("[1] Request validation successful");

    // 3. Authenticated user
    console.log("[2] Checking authenticated user...");

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    console.log("[2] User authenticated");

    // 4. Check environment configuration
    console.log("[3] Checking IndiConnect configuration...");

    const {
      INDICONNECT_BASE_URL,
      INDICONNECT_SERVICE_KEY,
      INDICONNECT_SECRET_KEY,
      INDICONNECT_ACCESS_KEY,
      INDICONNECT_PROVIDER_CODE_V2,
    } = process.env;

    if (
      !INDICONNECT_BASE_URL ||
      !INDICONNECT_SERVICE_KEY ||
      !INDICONNECT_SECRET_KEY ||
      !INDICONNECT_ACCESS_KEY ||
      !INDICONNECT_PROVIDER_CODE_V2
    ) {
      console.log("[3] Missing environment variables");

      return res.status(500).json({
        success: false,
        message: "IndiConnect configuration missing",
      });
    }

    console.log("[3] Configuration available");

    // 5. Prepare API URL
    const apiUrl = `${INDICONNECT_BASE_URL.replace(/\/+$/, "")}/idverifygr/verification`;

    // 6. Prepare authorization
    const authorization = `x-api-access ${INDICONNECT_SECRET_KEY}:${INDICONNECT_ACCESS_KEY}`;

    console.log("[4] API URL:", apiUrl);

    // 7. GraphQL mutation
    const query = `
      mutation GenerateDigilockerLink($input: VerifyInput!) {
        verify(input: $input) {
          ok
          message
          status
          result {
            ... on DTDigilockerUrlResult {
              code
              url
              transactionId
              kycUrl
            }
          }
          error {
            status
            message
          }
        }
      }
    `;

    // 8. GraphQL variables
    const variables = {
      input: {
        documentType: "digilocker-generate-link-dt",
        firstName: cleanFirstName,
        lastName: cleanLastName,
        mobile: cleanMobile,
        emailId: cleanEmail,
        redirectionUrl,
        webhookUrl,
        isSendOtp: Boolean(isSendOtp),
        isHideExplanationScreen: Boolean(isHideExplanationScreen),
        failOnDocNotFound: Boolean(failOnDocNotFound),
        expiry: expiryValue,
      },
    };

    const requestBody = {
      query,
      variables,
    };

    console.log("[5] GraphQL request prepared");
    console.log("[5] Document type: digilocker-generate-link-dt");
    console.log("[5] Mobile provided:", !!cleanMobile);
    console.log("[5] Email provided:", !!cleanEmail);

    // 9. Call IndiConnect API
    console.log("[6] Calling IndiConnect DigiLocker API...");

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        "service-key": INDICONNECT_SERVICE_KEY,
        Authorization: authorization,
        providercode: INDICONNECT_PROVIDER_CODE_V2,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("[6] Provider HTTP status:", response.status);

    const providerData = response.data;

    // 10. Check GraphQL errors
    if (providerData?.errors?.length) {
      console.error(
        "[7] GraphQL errors:",
        providerData.errors.map((item) => item.message),
      );

      return res.status(502).json({
        success: false,
        message: "DigiLocker GraphQL request failed",
        providerMessage: providerData.errors.map((item) => item.message),
      });
    }

    // 11. Extract verification result
    const verifyResult = providerData?.data?.verify;

    if (!verifyResult) {
      console.log("[7] Invalid provider response");

      return res.status(502).json({
        success: false,
        message: "Invalid response received from IndiConnect",
      });
    }

    console.log("[7] Provider OK:", verifyResult.ok);
    console.log("[7] Provider status:", verifyResult.status);
    console.log("[7] Provider message:", verifyResult.message);

    // 12. Check provider success
    if (verifyResult.ok !== true) {
      console.log("[8] DigiLocker link generation failed");

      return res.status(422).json({
        success: false,
        message:
          verifyResult.error?.message ||
          verifyResult.message ||
          "Unable to generate DigiLocker link",
        providerStatus: verifyResult.error?.status || verifyResult.status,
      });
    }

    // 13. Extract DigiLocker result
    const result = verifyResult.result;

    if (!result?.url && !result?.kycUrl) {
      console.log("[8] DigiLocker URL missing");

      return res.status(502).json({
        success: false,
        message: "DigiLocker URL not received from provider",
      });
    }

    console.log("[8] DigiLocker link generated successfully");
    console.log("[8] Transaction ID:", result.transactionId);

    // 14. Calculate expiry
    const expiresAt = new Date(Date.now() + Number(expiryValue));

    // 15. Save transaction in MongoDB
    console.log("[9] Saving DigiLocker details...");

    const verification = await DigilockerVerification.create({
      userId,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      mobile: cleanMobile,
      emailId: cleanEmail,
      transactionId: result.transactionId || null,
      code: result.code || null,
      digilockerUrl: result.url || null,
      kycUrl: result.kycUrl || null,
      verificationStatus: "pending",
      expiry: expiryValue,
      expiresAt,
      provider: "indiconnect",
    });

    console.log("[9] MongoDB save successful");
    console.log("[9] Verification ID:", verification._id);

    // 16. Return generated link
    console.log("========== DIGILOCKER GENERATION SUCCESS ==========\n");

    return res.status(200).json({
      success: true,
      message: verifyResult.message || "DigiLocker link generated successfully",
      verificationId: verification._id,
      data: {
        transactionId: result.transactionId,
        code: result.code,
        url: result.url,
        kycUrl: result.kycUrl,
        verificationStatus: "pending",
        expiresAt,
      },
    });
  } catch (error) {
    console.error("\n========== DIGILOCKER API ERROR ==========");

    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("HTTP status:", error.response?.status);

    console.error(
      "Provider error:",
      error.response?.data?.errors?.map((item) => item.message) ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "No provider error message",
    );

    console.error("==========================================\n");

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "DigiLocker API request timeout",
      });
    }

    if (error.response) {
      return res.status(502).json({
        success: false,
        message: "DigiLocker provider API failed",
        providerStatus: error.response.status,
        providerMessage:
          error.response.data?.message ||
          error.response.data?.error ||
          "Provider request failed",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllPANVerifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }

    const [data, total] = await Promise.all([
      PanVerification.find(filter)
        .select("-providerResponse")
        .populate("userId", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      PanVerification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "All PAN verifications fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (error) {
    console.error("Admin PAN History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch PAN verification records",
    });
  }
};

// ============================================
// ADMIN - GET ALL EMPLOYEES DIGILOCKER HISTORY
// GET /api/admin/kyc/digilocker
// ============================================

const getAllDigilockerVerifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }

    const [data, total] = await Promise.all([
      DigilockerVerification.find(filter)
        .populate("userId", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      DigilockerVerification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "All DigiLocker verifications fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (error) {
    console.error("Admin DigiLocker History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch DigiLocker verification records",
    });
  }
};

module.exports = {
  verifyPAN,
  getPANHistory,
  generateDigilockerLink,
  // Admin APIs
  getAllPANVerifications,
  getAllDigilockerVerifications,
};
