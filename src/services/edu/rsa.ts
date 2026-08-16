/**
 * 正方教务系统登录用 RSA 加密（纯 JS，无第三方依赖，基于 Hermes 原生 BigInt）。
 *
 * 正方登录页 login_slogin.html 的 JS 流程：
 *   GET login_getPublicKey.html → { modulus, exponent }（Base64）
 *   setPublic(b64tohex(modulus), b64tohex(exponent))
 *   mm = hex2b64(rsaKey.encrypt(密码明文))
 *
 * 本质是「PKCS#1 v1.5 (type 2) 填充 + 原始 RSA（modPow）」，
 * 与正方自带的 jsbn pkcs1pad2 / 主流 Python 抓包脚本的 rsa.encrypt 一致。
 *
 * 注意：填充串 PS 用 0xFF 代替随机非零字节——PKCS#1 解密端不校验 PS 的随机性，
 * 确定性填充便于调试且完全兼容（字节数正确、非零即可）。
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** 字节数组 → Base64 字符串。 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 0x3f] : '=';
  }
  return out;
}

/** Base64 字符串 → 字节数组（容忍 URL-safe 变体、非法字符与填充）。 */
function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === '=') break;
    const val = B64_ALPHABET.indexOf(ch);
    if (val < 0) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** UTF-8 编码字符串（密码可能含中文，需正确处理多字节）。 */
function utf8ToBytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
        i += 1;
        continue;
      }
      out.push(0xef, 0xbf, 0xbd); // 无效代理对 → U+FFFD
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

/** 字节数组（大端）→ BigInt。 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex ? BigInt(`0x${hex}`) : 0n;
}

/** BigInt → 固定长度 length 字节（大端，左补零）。 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  const raw = new Uint8Array(hex.length / 2);
  for (let i = 0; i < raw.length; i += 1) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const start = length - raw.length;
  if (start < 0) throw new Error('RSA 加密结果超出模长');
  const out = new Uint8Array(length);
  out.set(raw, start);
  return out;
}

/** 模幂 base^exp mod mod（平方-乘算法）。 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

/** PKCS#1 v1.5 type-2 填充到 k 字节：0x00 || 0x02 || PS(非零) || 0x00 || 明文。 */
function pkcs1Pad(message: Uint8Array, k: number): Uint8Array {
  const psLen = k - message.length - 3;
  if (psLen < 8) throw new Error('密码过长，无法进行 RSA 填充');
  const out = new Uint8Array(k);
  out[0] = 0x00;
  out[1] = 0x02;
  for (let i = 0; i < psLen; i += 1) out[2 + i] = 0xff; // 非零即可，解密端不校验随机性
  out[2 + psLen] = 0x00;
  out.set(message, 3 + psLen);
  return out;
}

/**
 * 用教务系统公钥加密密码，返回 Base64 密文（登录 POST 的 mm 参数）。
 *
 * @param password   明文密码
 * @param modulusB64  login_getPublicKey.html 返回的 modulus（Base64）
 * @param exponentB64 login_getPublicKey.html 返回的 exponent（Base64，通常 "AQAB"=65537）
 */
export function encryptPassword(password: string, modulusB64: string, exponentB64: string): string {
  const nBytes = base64ToBytes(modulusB64);
  const n = bytesToBigInt(nBytes);
  // 模数位长对应的字节数。Java BigInteger.toByteArray() 会给 1024 位模数补一个前导 0x00 符号字节，
  // 使 nBytes.length 变成 129；而 PKCS#1 填充长度 k 应按真实位长算：1024 位 → 128 字节。
  // 对齐正方 jsbn 的 (bitLength()+7)>>3。若直接取 nBytes.length 会多算 1 字节，导致服务端解密失败。
  const k = (n.toString(2).length + 7) >> 3;

  const exponentBytes = base64ToBytes(exponentB64 || 'AQAB');
  const e = exponentBytes.length > 0 ? bytesToBigInt(exponentBytes) : 65537n;

  const padded = pkcs1Pad(utf8ToBytes(password), k);
  const m = bytesToBigInt(padded);
  const c = modPow(m, e, n);

  return bytesToBase64(bigIntToBytes(c, k));
}
