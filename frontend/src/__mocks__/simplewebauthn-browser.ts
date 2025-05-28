export const startRegistration = jest.fn();
export const startAuthentication = jest.fn();
export const browserSupportsWebAuthn = jest.fn(() => true);
export const browserSupportsWebAuthnAutofill = jest.fn(() => true);
export const platformAuthenticatorIsAvailable = jest.fn(() => true);

export class WebAuthnAbortService {
  static abort() {}
  static createNewAbortSignal() {
    return new AbortController().signal;
  }
}

export class WebAuthnError extends Error {
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'WebAuthnError';
    if (code) this.code = code;
  }
  code?: string;
}

export const base64URLStringToBuffer = jest.fn((base64URLString: string) => new Uint8Array());
export const bufferToBase64URLString = jest.fn((buffer: ArrayBuffer) => ''); 