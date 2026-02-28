const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,120}$/

export function isStrongPassword(password: string) {
  return STRONG_PASSWORD_REGEX.test(password)
}

export function passwordPolicyMessage() {
  return 'Password must be 8-120 chars and include letters and numbers.'
}
