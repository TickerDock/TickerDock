import { describe, expect, it } from 'vitest';
import {
  changeIcon,
  changeTextIcon,
  DEFAULT_PERSONALIZATION,
  normalizeLegacyColor,
  quoteIconFile,
  normalizePersonalization,
  renderTemplate,
  validatePersonalization,
} from './personalizationModel';

describe('personalization model', () => {
  it('renders allowlisted placeholders and legacy padding operations', () => {
    expect(renderTemplate('${icon|padRight|3}${percent|padLeft|7} ${name}', {
      icon: 'UP', percent: '+1.20%', name: 'Example',
    })).toBe('UP  +1.20% Example');
  });

  it('rejects unknown placeholders, malformed colors, and control characters', () => {
    expect(() => validatePersonalization({
      ...DEFAULT_PERSONALIZATION,
      stockLabelTemplate: '${unknown}',
    })).toThrow('stockLabelTemplate');
    expect(() => validatePersonalization({
      ...DEFAULT_PERSONALIZATION,
      riseColor: 'red',
    })).toThrow('Colors');
    expect(normalizePersonalization({ stockLabelTemplate: 'bad\nvalue' }).stockLabelTemplate)
      .toBe(DEFAULT_PERSONALIZATION.stockLabelTemplate);
  });

  it('selects change icons without allowing arbitrary icon identifiers', () => {
    expect(changeIcon(0.01, 'arrow')).toBe('\u{1f4c8}');
    expect(changeIcon(-0.01, 'arrow')).toBe('\u{1f4c9}');
    expect(changeIcon(0.03, 'arrow1')).toBe('\u{1f4c8}');
    expect(changeIcon(0.01, 'none')).toBe('');
    expect(changeTextIcon(-0.01, 'iconfood')).toBe('\u{1f35c}');
    expect(changeTextIcon(0.01, 'food2')).toBe('\u{1f362}');
    expect(changeTextIcon(-0.01, 'food3')).toBe('\u{1f35c}');
    expect(quoteIconFile(0.03, 'arrow')).toBe('up.svg');
    expect(quoteIconFile(0.01, 'arrow')).toBe('up1.svg');
    expect(quoteIconFile(-0.03, 'arrow1')).toBe('down2.svg');
    expect(quoteIconFile(0.01, 'food2')).toBe('kabob.svg');
    expect(normalizeLegacyColor('white', '#000000')).toBe('#ffffff');
  });
});
