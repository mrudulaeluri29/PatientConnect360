"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioServiceSid = exports.twilioClient = void 0;
const twilio_1 = __importDefault(require("twilio"));
exports.twilioClient = null;
exports.twilioServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    if (!process.env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
        console.warn("TWILIO_ACCOUNT_SID does not start with AC; Twilio client will not be initialized");
    }
    else {
        exports.twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
}
else {
    console.warn("Twilio credentials not provided; OTP endpoints will fail if called");
}
