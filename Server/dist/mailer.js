"use strict";
// Mailer stub: SendGrid removed; exports no-op helpers
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailerReady = void 0;
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.mailerReady = Promise.resolve(true);
async function sendEmail(_options) {
    // no email transport configured
    console.warn("sendEmail called but mailer is disabled");
    return { success: false };
}
async function sendPasswordResetEmail(_email, _otp, _userName) {
    console.warn("sendPasswordResetEmail called but mailer is disabled");
    return { success: false };
}
