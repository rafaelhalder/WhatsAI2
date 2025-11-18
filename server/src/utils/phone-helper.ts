/**
 * Phone Number Helper
 * 
 * Centralized phone number validation and formatting utilities using libphonenumber-js.
 * Provides consistent phone number handling across the application with support for
 * international formats and WhatsApp JID normalization.
 * 
 * Features:
 * - International phone number validation
 * - Multiple format outputs (E.164, international, national)
 * - Country code detection
 * - WhatsApp JID normalization
 * - Brazilian number handling with DDD support
 */

import { parsePhoneNumber, PhoneNumber, CountryCode } from 'libphonenumber-js';
import { normalizeWhatsAppNumber as normalizeWithBaileys } from './baileys-helpers';

/**
 * Validates if a phone number is valid according to libphonenumber-js rules
 * 
 * @param phoneNumber - Phone number to validate (can include country code)
 * @param defaultCountry - Default country code if not present in number (e.g., 'BR', 'US')
 * @returns true if valid, false otherwise
 * 
 * @example
 * validatePhone('+5511999999999') // true
 * validatePhone('11999999999', 'BR') // true
 * validatePhone('invalid') // false
 */
export function validatePhone(phoneNumber: string, defaultCountry?: CountryCode): boolean {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    return parsed?.isValid() ?? false;
  } catch (error) {
    return false;
  }
}

/**
 * Formats a phone number to the specified format
 * 
 * @param phoneNumber - Phone number to format
 * @param format - Output format: 'E164' (+5511999999999), 'INTERNATIONAL' (+55 11 99999-9999), 'NATIONAL' ((11) 99999-9999)
 * @param defaultCountry - Default country code if not present in number
 * @returns Formatted phone number or null if invalid
 * 
 * @example
 * formatPhone('11999999999', 'E164', 'BR') // '+5511999999999'
 * formatPhone('+5511999999999', 'INTERNATIONAL') // '+55 11 99999-9999'
 * formatPhone('5511999999999', 'NATIONAL', 'BR') // '(11) 99999-9999'
 */
export function formatPhone(
  phoneNumber: string,
  format: 'E164' | 'INTERNATIONAL' | 'NATIONAL' = 'E164',
  defaultCountry?: CountryCode
): string | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    if (!parsed?.isValid()) return null;

    switch (format) {
      case 'E164':
        return parsed.format('E.164');
      case 'INTERNATIONAL':
        return parsed.formatInternational();
      case 'NATIONAL':
        return parsed.formatNational();
      default:
        return parsed.format('E.164');
    }
  } catch (error) {
    return null;
  }
}

/**
 * Parses a phone number into a PhoneNumber object with detailed information
 * 
 * @param phoneNumber - Phone number to parse
 * @param defaultCountry - Default country code if not present in number
 * @returns PhoneNumber object or null if invalid
 * 
 * @example
 * const phone = parsePhone('+5511999999999');
 * // { country: 'BR', nationalNumber: '11999999999', countryCallingCode: '55', ... }
 */
export function parsePhone(phoneNumber: string, defaultCountry?: CountryCode): PhoneNumber | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    return parsed?.isValid() ? parsed : null;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts the country code (ISO 3166-1 alpha-2) from a phone number
 * 
 * @param phoneNumber - Phone number to analyze
 * @param defaultCountry - Default country code if not present in number
 * @returns Country code (e.g., 'BR', 'US', 'GB') or null if not detectable
 * 
 * @example
 * getCountryCode('+5511999999999') // 'BR'
 * getCountryCode('+14155552671') // 'US'
 * getCountryCode('11999999999', 'BR') // 'BR'
 */
export function getCountryCode(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    return parsed?.country ?? null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalizes a phone number to WhatsApp JID format
 * 
 * IMPORTANTE: Usa lógica do Baileys que adiciona automaticamente o 9º dígito
 * em números brasileiros antigos (554191188909 → 5541991188909)
 * 
 * Converts various phone number formats to WhatsApp's expected format:
 * - Removes all non-numeric characters except '+'
 * - Adds country code if missing (defaults to Brazil +55)
 * - Adds 9th digit to old Brazilian mobile numbers
 * - Formats as: {countryCode}{areaCode}{number}@s.whatsapp.net
 * - Preserves group JIDs (@g.us) and newsletter JIDs (@newsletter)
 * 
 * @param phoneNumber - Phone number or JID to normalize
 * @returns Normalized WhatsApp JID
 * 
 * @example
 * normalizeWhatsAppJid('+55 11 99999-9999') // '5511999999999@s.whatsapp.net'
 * normalizeWhatsAppJid('11999999999') // '5511999999999@s.whatsapp.net'
 * normalizeWhatsAppJid('554191188909') // '5541991188909@s.whatsapp.net' (adiciona 9º dígito)
 * normalizeWhatsAppJid('120363164787189624@g.us') // '120363164787189624@g.us' (unchanged)
 * normalizeWhatsAppJid('555180256535@s.whatsapp.net') // '555180256535@s.whatsapp.net' (unchanged)
 */
export function normalizeWhatsAppJid(phoneNumber: string): string {
  // Já é um JID válido (grupo, newsletter, ou já formatado)
  if (phoneNumber.includes('@')) {
    // Apenas passa pelo Baileys para normalizar (remove device IDs, adiciona 9º dígito BR)
    const isGroup = phoneNumber.includes('@g.us');
    return normalizeWithBaileys(phoneNumber, isGroup);
  }

  // Remove caracteres não numéricos
  let cleaned = phoneNumber.replace(/[^\d+]/g, '').replace(/\+/g, '');

  // Detecta se é grupo (contém traço no ID)
  const isGroup = cleaned.includes('-');

  // Adiciona código de país brasileiro se necessário
  if (!cleaned.startsWith('55') && !isGroup) {
    // Se tem 10-11 dígitos, é BR sem código de país
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }
    // Se tem 8-9 dígitos, adiciona DDD 11 padrão
    else if (cleaned.length === 8 || cleaned.length === 9) {
      cleaned = `5511${cleaned}`;
    }
  }

  // Adiciona sufixo apropriado antes de passar para o Baileys
  const withSuffix = isGroup ? `${cleaned}@g.us` : `${cleaned}@s.whatsapp.net`;
  
  // Usa lógica do Baileys que adiciona o 9º dígito automaticamente
  return normalizeWithBaileys(withSuffix, isGroup);
}

/**
 * Extracts phone number from WhatsApp JID
 * 
 * @param jid - WhatsApp JID (e.g., '5511999999999@s.whatsapp.net')
 * @returns Phone number without JID suffix
 * 
 * @example
 * extractPhoneFromJid('5511999999999@s.whatsapp.net') // '5511999999999'
 * extractPhoneFromJid('120363164787189624@g.us') // '120363164787189624'
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0] ?? jid;
}

/**
 * Checks if a JID is a group
 * 
 * @param jid - WhatsApp JID to check
 * @returns true if group JID, false otherwise
 * 
 * @example
 * isGroupJid('120363164787189624@g.us') // true
 * isGroupJid('5511999999999@s.whatsapp.net') // false
 */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

/**
 * Checks if a JID is a newsletter
 * 
 * @param jid - WhatsApp JID to check
 * @returns true if newsletter JID, false otherwise
 * 
 * @example
 * isNewsletterJid('123456789@newsletter') // true
 * isNewsletterJid('5511999999999@s.whatsapp.net') // false
 */
export function isNewsletterJid(jid: string): boolean {
  return jid.endsWith('@newsletter');
}

/**
 * Formats a phone number for display in the UI
 * 
 * @param phoneNumber - Phone number or JID to format
 * @param preferredFormat - Preferred format ('INTERNATIONAL' or 'NATIONAL')
 * @returns Formatted phone number for display or original if parsing fails
 * 
 * @example
 * formatPhoneForDisplay('5511999999999@s.whatsapp.net') // '+55 11 99999 9999'
 * formatPhoneForDisplay('+5511999999999', 'NATIONAL') // '(11) 99999-9999'
 */
export function formatPhoneForDisplay(
  phoneNumber: string,
  preferredFormat: 'INTERNATIONAL' | 'NATIONAL' = 'INTERNATIONAL'
): string {
  // Extrai número se for JID
  const number = extractPhoneFromJid(phoneNumber);

  // Tenta formatar com país implícito se não tiver código
  let formatted: string | null = null;
  
  // Primeiro tenta sem país padrão
  formatted = formatPhone(number, preferredFormat);
  
  // Se falhar e número não começar com '+', tenta adicionar '+' e parsear novamente
  if (!formatted && !number.startsWith('+')) {
    formatted = formatPhone(`+${number}`, preferredFormat);
  }
  
  // Retorna formatado ou original
  return formatted ?? phoneNumber;
}
