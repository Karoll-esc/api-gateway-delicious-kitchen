
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Validators {
  static isEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }

  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  static validateEmail(email: string): { valid: boolean; message?: string } {
    if (this.isEmpty(email)) {
      return { valid: false, message: 'El email es requerido' };
    }
    if (!this.isEmail(email)) {
      return { valid: false, message: 'El formato del email no es válido' };
    }
    return { valid: true };
  }

  static validateRequired(value: any, fieldName: string): { valid: boolean; message?: string } {
    if (this.isEmpty(value)) {
      return { valid: false, message: `${fieldName} es requerido` };
    }
    return { valid: true };
  }

  static validateArray(value: any, fieldName: string, minLength: number = 1): { valid: boolean; message?: string } {
    if (!Array.isArray(value)) {
      return { valid: false, message: `${fieldName} debe ser un array` };
    }
    if (value.length < minLength) {
      return { valid: false, message: `${fieldName} debe contener al menos ${minLength} elemento(s)` };
    }
    return { valid: true };
  }
}

