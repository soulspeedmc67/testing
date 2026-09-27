/**
 * DASHit Backend API Server
 * 
 * Provides:
 * 1. GET /api/health
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

// Load .env and .env.local if not already in process.env
const loadEnv = (filename) => {
  const envPath = path.resolve(__dirname, filename);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
};

loadEnv(".env.local");
loadEnv(".env");

const PORT = process.env.PORT || 5001;

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
};

// ---------------------------------------------------------------------------
// WhatsApp OTP Challenge Store & Helpers
// ---------------------------------------------------------------------------
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory store: Map<mobileNumber, { code, expiresAt, attempts, lastSentAt }>
const whatsappChallenges = new Map();

// Helper to parse JSON request bodies
const parseJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Request payload too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Malformed JSON payload"));
      }
    });
    req.on("error", reject);
  });
};

// Normalize mobile to 10 digits and E.164 (without plus for Meta: 919876543210)
const normalizeMobile = (mobile) => {
  const digits = String(mobile || "").replace(/\D/g, "");
  const tenDigits = digits.slice(-10);
  return {
    raw10: tenDigits,
    metaFormat: `91${tenDigits}`,
    e164: `+91${tenDigits}`,
  };
};

/**
 * Dispatches WhatsApp message via Meta WhatsApp Business Cloud API
 */
async function dispatchMetaWhatsappOtp(recipientNumber, code) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "dashit_auth_otp";
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";

  if (!token || !phoneNumberId) {
    return {
      sent: false,
      isDev: true,
      message: "Meta WhatsApp credentials not set. Simulated in Dev Sandbox.",
    };
  }

  const endpoint = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  // Try official authentication template first
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: String(code) }],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: String(code) }],
        },
      ],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("Meta WhatsApp API Error:", data?.error?.message || data);
      return {
        sent: false,
        isDev: false,
        error: data?.error?.message || "WhatsApp delivery failed via Meta API",
      };
    }

    return { sent: true, messageId: data?.messages?.[0]?.id };
  } catch (error) {
    console.error("Meta WhatsApp Network Error:", error);
    return { sent: false, isDev: false, error: error.message };
  }
}

const handleApiRequest = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const url = req.url.split("?")[0];

  // 1. Health check
  if (req.method === "GET" && (url === "/" || url === "/api/health")) {
    return sendJson(res, 200, {
      status: "ok",
      service: "dashit-backend",
      whatsappService: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      mode: "cash-on-delivery",
    });
  }

  // 2. WhatsApp OTP - Send
  if (req.method === "POST" && url === "/api/auth/whatsapp/send-otp") {
    try {
      const body = await parseJsonBody(req);
      const { mobile } = body;
      const { raw10, metaFormat, e164 } = normalizeMobile(mobile);

      if (!raw10 || raw10.length !== 10) {
        return sendJson(res, 400, {
          success: false,
          message: "Please enter a valid 10-digit mobile number.",
        });
      }

      // Check resend cooldown
      const existing = whatsappChallenges.get(raw10);
      const now = Date.now();
      if (existing && existing.lastSentAt && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        return sendJson(res, 429, {
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new code.`,
          retryAfter: remaining,
        });
      }

      // Generate 4-digit code (or fixed if in dev testing)
      const code = process.env.NEXT_PUBLIC_OTP_FIXED === "1"
        ? (process.env.DEV_OTP || "1234")
        : String(Math.floor(1000 + Math.random() * 9000));

      // Attempt Meta WhatsApp dispatch
      const dispatchResult = await dispatchMetaWhatsappOtp(metaFormat, code);

      // Record challenge
      whatsappChallenges.set(raw10, {
        code,
        mobile: e164,
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
      });

      console.log(`[WhatsApp OTP] Code ${code} issued for ${e164} (Sent via Meta: ${dispatchResult.sent ? "YES" : "NO/DEV"})`);

      return sendJson(res, 200, {
        success: true,
        message: dispatchResult.sent
          ? `Verification code sent to WhatsApp (${e164})`
          : `Code sent! (Dev Sandbox: ${code})`,
        devOtp: dispatchResult.sent ? undefined : code,
        isDev: !dispatchResult.sent,
        mobile: e164,
      });
    } catch (err) {
      console.error("send-otp error:", err);
      return sendJson(res, 500, { success: false, message: "Internal server error" });
    }
  }

  // 3. WhatsApp OTP - Verify
  if (req.method === "POST" && url === "/api/auth/whatsapp/verify-otp") {
    try {
      const body = await parseJsonBody(req);
      const { mobile, otp } = body;
      const { raw10, e164 } = normalizeMobile(mobile);

      if (!raw10 || !otp) {
        return sendJson(res, 400, {
          success: false,
          message: "Mobile number and OTP code are required.",
        });
      }

      const challenge = whatsappChallenges.get(raw10);
      if (!challenge) {
        return sendJson(res, 400, {
          success: false,
          message: "No pending verification code found. Please request a new OTP.",
        });
      }

      if (Date.now() > challenge.expiresAt) {
        whatsappChallenges.delete(raw10);
        return sendJson(res, 400, {
          success: false,
          message: "Verification code expired. Please request a new code.",
        });
      }

      challenge.attempts += 1;
      if (challenge.attempts > MAX_VERIFY_ATTEMPTS) {
        whatsappChallenges.delete(raw10);
        return sendJson(res, 400, {
          success: false,
          message: "Too many failed attempts. Please request a new code.",
        });
      }

      if (String(otp).trim() !== challenge.code) {
        return sendJson(res, 400, {
          success: false,
          message: "Incorrect verification code. Please check your WhatsApp.",
        });
      }

      // Successfully verified
      whatsappChallenges.delete(raw10);

      return sendJson(res, 200, {
        success: true,
        verified: true,
        mobile: e164,
        raw10,
        message: "Mobile number verified successfully.",
      });
    } catch (err) {
      console.error("verify-otp error:", err);
      return sendJson(res, 500, { success: false, message: "Internal server error" });
    }
  }

  return sendJson(res, 404, { error: "Endpoint not found" });
};

const server = http.createServer(handleApiRequest);

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 DASHit backend server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { server, handleApiRequest, handleRazorpayRequest: handleApiRequest };
