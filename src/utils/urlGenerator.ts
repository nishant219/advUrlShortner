export class UrlGenerator {
    private static BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    private static LENGTH = 7;
  
    static generateAlias(): string {
      let alias = '';
      for (let i = 0; i < this.LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * this.BASE62.length);
        alias += this.BASE62[randomIndex];
      }
      return alias;
    }
  
    static isValidUrl(url: string): boolean {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
}
  