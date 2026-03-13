import { createPrivateKey, X509Certificate } from 'crypto';

export interface WechatDiagnostics {
  enabledFlag: boolean;
  hasRequiredEnv: boolean;
  initializationPossible: boolean;
  checks: {
    appIdPresent: boolean;
    mchIdPresent: boolean;
    merchantCertSerialPresent: boolean;
    merchantCertSerialFormatOk: boolean;
    platformSerialPresent: boolean;
    platformSerialFormatOk: boolean;
    privateKeyPresent: boolean;
    privateKeyPemMarkersOk: boolean;
    privateKeyParseOk: boolean;
    privateKeyParseError?: string;
    platformCertPresent: boolean;
    platformCertPemMarkersOk: boolean;
    platformCertParseOk: boolean;
    platformCertParseError?: string;
    platformSerialMatchesCert: boolean;
    platformCertSerialFromPem?: string;
    merchantKeySerialCheck: 'not_checked_missing_merchant_cert' | 'unknown';
  };
  issues: string[];
}

export interface WechatConfigInputs {
  appId: string;
  mchId: string;
  certSerial: string;
  platformSerial: string;
  privateKeyPem: string;
  platformCertPem: string;
}

const normalizePem = (value: string | undefined): string => (value ?? '').replace(/\\n/g, '\n').trim();
const normalizeSerial = (value: string | undefined): string => (value ?? '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

export const getWechatConfigInputs = (): WechatConfigInputs => ({
  appId: (process.env.WECHAT_APP_ID ?? '').trim(),
  mchId: (process.env.WECHAT_MCH_ID ?? '').trim(),
  certSerial: (process.env.WECHAT_CERT_SERIAL ?? '').trim(),
  platformSerial: (process.env.WECHAT_PLATFORM_SERIAL ?? '').trim(),
  privateKeyPem: normalizePem(process.env.WECHAT_PRIVATE_KEY),
  platformCertPem: normalizePem(process.env.WECHAT_PLATFORM_CERT),
});

export const getWechatDiagnostics = (): WechatDiagnostics => {
  const cfg = getWechatConfigInputs();
  const issues: string[] = [];

  const merchantSerialNormalized = normalizeSerial(cfg.certSerial);
  const platformSerialNormalized = normalizeSerial(cfg.platformSerial);

  const appIdPresent = !!cfg.appId;
  const mchIdPresent = !!cfg.mchId;
  const merchantCertSerialPresent = !!cfg.certSerial;
  const platformSerialPresent = !!cfg.platformSerial;
  const merchantCertSerialFormatOk = merchantSerialNormalized.length >= 16;
  const platformSerialFormatOk = platformSerialNormalized.length >= 16;

  const privateKeyPresent = !!cfg.privateKeyPem;
  const privateKeyPemMarkersOk =
    cfg.privateKeyPem.includes('-----BEGIN PRIVATE KEY-----') &&
    cfg.privateKeyPem.includes('-----END PRIVATE KEY-----');
  let privateKeyParseOk = false;
  let privateKeyParseError: string | undefined;
  if (privateKeyPresent) {
    try {
      createPrivateKey(cfg.privateKeyPem);
      privateKeyParseOk = true;
    } catch (error: any) {
      privateKeyParseError = error?.message ?? String(error);
    }
  }

  const platformCertPresent = !!cfg.platformCertPem;
  const platformCertPemMarkersOk =
    cfg.platformCertPem.includes('-----BEGIN CERTIFICATE-----') &&
    cfg.platformCertPem.includes('-----END CERTIFICATE-----');
  let platformCertParseOk = false;
  let platformCertParseError: string | undefined;
  let platformCertSerialFromPem: string | undefined;
  if (platformCertPresent) {
    try {
      const cert = new X509Certificate(cfg.platformCertPem);
      platformCertSerialFromPem = normalizeSerial(cert.serialNumber);
      platformCertParseOk = true;
    } catch (error: any) {
      platformCertParseError = error?.message ?? String(error);
    }
  }

  const platformSerialMatchesCert =
    !!platformCertSerialFromPem &&
    !!platformSerialNormalized &&
    platformCertSerialFromPem === platformSerialNormalized;

  const hasRequiredEnv =
    appIdPresent &&
    mchIdPresent &&
    merchantCertSerialPresent &&
    platformSerialPresent &&
    privateKeyPresent &&
    platformCertPresent;

  if (!appIdPresent) issues.push('WECHAT_APP_ID is missing');
  if (!mchIdPresent) issues.push('WECHAT_MCH_ID is missing');
  if (!merchantCertSerialPresent) issues.push('WECHAT_CERT_SERIAL is missing');
  if (!merchantCertSerialFormatOk) issues.push('WECHAT_CERT_SERIAL format looks invalid');
  if (!platformSerialPresent) issues.push('WECHAT_PLATFORM_SERIAL is missing');
  if (!platformSerialFormatOk) issues.push('WECHAT_PLATFORM_SERIAL format looks invalid');
  if (!privateKeyPresent) issues.push('WECHAT_PRIVATE_KEY is missing');
  if (privateKeyPresent && !privateKeyPemMarkersOk) issues.push('WECHAT_PRIVATE_KEY PEM markers are invalid');
  if (privateKeyPresent && !privateKeyParseOk) issues.push(`WECHAT_PRIVATE_KEY parse failed: ${privateKeyParseError}`);
  if (!platformCertPresent) issues.push('WECHAT_PLATFORM_CERT is missing');
  if (platformCertPresent && !platformCertPemMarkersOk) issues.push('WECHAT_PLATFORM_CERT PEM markers are invalid');
  if (platformCertPresent && !platformCertParseOk) issues.push(`WECHAT_PLATFORM_CERT parse failed: ${platformCertParseError}`);
  if (platformCertParseOk && platformSerialPresent && !platformSerialMatchesCert) {
    issues.push('WECHAT_PLATFORM_SERIAL does not match certificate serial');
  }

  const enabledFlag = process.env.WECHAT_ENABLED === 'true';
  const initializationPossible =
    enabledFlag &&
    hasRequiredEnv &&
    merchantCertSerialFormatOk &&
    platformSerialFormatOk &&
    privateKeyPemMarkersOk &&
    privateKeyParseOk &&
    platformCertPemMarkersOk &&
    platformCertParseOk &&
    platformSerialMatchesCert;

  return {
    enabledFlag,
    hasRequiredEnv,
    initializationPossible,
    checks: {
      appIdPresent,
      mchIdPresent,
      merchantCertSerialPresent,
      merchantCertSerialFormatOk,
      platformSerialPresent,
      platformSerialFormatOk,
      privateKeyPresent,
      privateKeyPemMarkersOk,
      privateKeyParseOk,
      privateKeyParseError,
      platformCertPresent,
      platformCertPemMarkersOk,
      platformCertParseOk,
      platformCertParseError,
      platformSerialMatchesCert,
      platformCertSerialFromPem,
      merchantKeySerialCheck: 'not_checked_missing_merchant_cert',
    },
    issues,
  };
};
