const fs = require('fs');
const path = require('path');

// ts-check

class I18n {
  constructor() {
    this._locale = undefined;
    this._translations = undefined;
    this.t = this.translate.bind(this);
    // Lazy create list formatters when needed.
    this._listFormats = {}; // key is list type
  }

  /**
   * @param {string} locale
   */
  loadLocale(locale) {
    let canonicalLocale;
    // Check recognised locale and make canonical.
    // Could make this a soft error, but start simple.
    try {
      // @ts-ignore Intl not known
      canonicalLocale = Intl.getCanonicalLocales(locale)[0];
    } catch (e) {
    }
    if (!canonicalLocale) {
      throw new Error(`Commander: unrecognised locale '${locale}'`);
    }

    let translations;
    try {
      const localePath = path.join(__dirname, '..', 'locales', `${canonicalLocale}.json`);
      const localeText = fs.readFileSync(localePath);
      translations = JSON.parse(localeText);
    } catch (e) {
      throw new Error(`Commander: translations not found for locale '${canonicalLocale}'`);
    }

    this.updateStrings(translations);
    this.localeName(canonicalLocale);
  }

  /**
   * @param {Object.<string, string>} dictionary
   */
  updateStrings(dictionary) {
    this._translations = Object.assign(this._translations || {}, dictionary);
  }

  /**
   * Just sets the name and will not cause errors.
   *
   * @param {string} localeName
   */
  localeName(localeName) {
    if (localeName === undefined) return this._locale;
    this._locale = localeName;
    this._listFormats = {}; // clear cache, locale changed
  }

  /**
   *
   * @param {TemplateStringsArray} strings
   * @param  {...any} args
   * @returns string
   * @api private
   */
  translate(strings, ...args) {
    if (!this._translations) return I18n.interpolate(strings, ...args);

    // Make a key by putting in placeholders for the args, like {0}.
    const key = strings.reduce((accumulator, str, index) => {
      return accumulator + `{${index - 1}}` + str;
    });

    // Look up possible replacement.
    let template = this._translations[key];
    if (template === undefined) template = key;

    // Fill in the placeholders with the actual args.
    return template.replace(/{(\d+)}/g, (match, digits) => {
      return `${args[digits]}`; // paranoia: convert arg to string
    });
  }

  /**
   *
   * @param {string} type - 'conjunction' or 'disjunction' or 'unit' (Intl.ListFormatType)
   * @returns function
   */
  _createListFormat(type) {
    try {
      // @ts-ignore Intl not known
      if (this._locale !== undefined && typeof Intl === 'object' && Intl.ListFormat.supportedLocalesOf(this._locale).length > 0) {
        // @ts-ignore Intl not known
        return new Intl.ListFormat(this._locale, { style: 'narrow', type });
      }
    } catch (e) {
    }

    return null;
  }

  /**
   * @param {string[]} items
   * @param {string} [listType] - 'conjunction' or 'disjunction' or 'unit', default 'conjunction'
   * @returns string
   */
  formatList(items, listType = 'conjunction') {
    if (this._listFormats[listType] === undefined) {
      this._listFormats[listType] = this._createListFormat(listType);
      // Returns null if can't make formatter.
    }
    if (this._listFormats[listType]) {
      return this._listFormats[listType].format(items);
    }
    return items.join(', ');
  }

  /**
   * Function for tagged literal template with no translation.
   * Used when locale not specified.
   *
   * @returns string
   */
  static interpolate(strings, ...args) {
    return strings.reduce((accumulator, str, index) => {
      return accumulator + args[index - 1] + str;
    });
  }
}

exports.I18n = I18n;
