import crypto from 'crypto';

export class UrlGenerator {
  private static BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static LENGTH = 7;
  private static counter = BigInt(Date.now());

  static generateAlias(longUrl: string): string {
    // Increment counter atomically
    const currentCount = this.counter++;
    
    // Combine URL and counter to create unique input
    const input = `${longUrl}${currentCount}`;
    
    // Create SHA-256 hash
    const hash = crypto.createHash('sha256').update(input).digest();
    
    // Take first 6 bytes (48 bits) of hash
    let num = BigInt('0x' + hash.slice(0, 6).toString('hex'));
    
    // Convert to base62
    let alias = '';
    while (num > 0n) {
      const remainder = Number(num % 62n);
      alias = this.BASE62[remainder] + alias;
      num = num / 62n;
    }
    
    // Pad with random character if needed
    while (alias.length < this.LENGTH) {
      alias = this.BASE62[Math.floor(Math.random() * 62)] + alias;
    }
    
    return alias.slice(0, this.LENGTH);
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  // Add method to validate custom aliases
  static isValidCustomAlias(alias: string): boolean {
    const validPattern = /^[a-zA-Z0-9-_]{4,20}$/;
    return validPattern.test(alias);
  }
}