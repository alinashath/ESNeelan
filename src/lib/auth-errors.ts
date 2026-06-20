type AuthErrorContext = "send_otp_login" | "send_otp_signup" | "verify_otp";

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return "";
}

/** User-facing copy for Supabase phone OTP errors. */
export function authErrorMessage(error: unknown, context: AuthErrorContext): string {
  const msg = errorText(error).toLowerCase();
  const code = errorCode(error).toLowerCase();

  if (context === "verify_otp") {
    if (
      code === "otp_expired" ||
      msg.includes("expired") ||
      msg.includes("has expired")
    ) {
      return "This code has expired. Go back and request a new one.";
    }
    if (
      code === "invalid_otp" ||
      msg.includes("invalid otp") ||
      msg.includes("token has expired or is invalid") ||
      msg.includes("otp verification failed") ||
      (msg.includes("invalid") && msg.includes("token"))
    ) {
      return "That code doesn't match. Check the SMS and try again.";
    }
    if (msg.includes("too many") || code === "over_request_rate_limit") {
      return "Too many attempts. Wait a moment, then try again.";
    }
    return "We couldn't verify that code. Check the SMS and try again.";
  }

  if (context === "send_otp_login") {
    if (
      msg.includes("user not found") ||
      msg.includes("signups not allowed") ||
      code === "user_not_found"
    ) {
      return "No account found for this number. Sign up to create one.";
    }
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "This number already has an account. Log in instead.";
    }
    if (msg.includes("too many") || code === "over_request_rate_limit") {
      return "Too many code requests. Wait a moment, then try again.";
    }
    return "We couldn't send a code to this number. Check the number and try again.";
  }

  if (context === "send_otp_signup") {
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return "This number already has an account. Log in instead.";
    }
    if (msg.includes("signups not allowed") || code === "signup_disabled") {
      return "New sign-ups are not available right now.";
    }
    if (msg.includes("too many") || code === "over_request_rate_limit") {
      return "Too many code requests. Wait a moment, then try again.";
    }
    return "We couldn't send a code to this number. Check the number and try again.";
  }

  return "Something went wrong. Please try again.";
}
