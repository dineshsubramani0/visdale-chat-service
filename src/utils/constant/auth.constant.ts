// src/utils/constant/auth.constant.ts
export const AUTH_MESSAGES = {
  // Account / Registration
  ACCOUNT_ALREADY_CREATED: 'Account already created. Please log in.',
  ACCOUNT_CREATED_SUCCESS: 'Account created successfully.',
  EMAIL_NOT_VERIFIED: 'Email not verified yet. Please verify OTP first.',

  // OTP related
  OTP_NOT_REQUESTED: 'OTP not requested. Please request OTP first.',
  OTP_NOT_GENERATED: 'OTP not generated.',
  OTP_EXPIRED: 'OTP expired.',
  INVALID_OTP: 'Invalid OTP.',
  OTP_SENT_SUCCESS: 'OTP sent to email successfully.',
  OTP_SEND_FAILED: 'Failed to send OTP email. Please try again later.',
  EMAIL_VERIFIED_SUCCESS:
    'Email verified successfully. You can now create your account.',

  // Login / Auth
  INVALID_CREDENTIALS: 'Invalid email or password.',
  REFRESH_TOKEN_INVALID: 'Refresh token is invalid or expired.',
  LOGOUT_SUCCESS: 'Logged out successfully.',

  // User
  USER_NOT_FOUND: 'User not found.',
};
