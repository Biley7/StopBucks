/**
 * Presentation-only formatter tokenizer for financial display strings.
 * Splits an already-formatted monetary or unit string into styling segments
 * without parsing numbers, altering precision, or changing character order.
 */

export interface FormattedDisplayParts {
  prefix: string;
  integer: string;
  decimal: string;
  suffix: string;
}

const DISPLAY_PARTS_RE =
  /^([^0-9]*?)([0-9](?:[0-9,\s\u00A0\u202F]*[0-9])?)(\.[0-9]+)?(.*)$/;

export function splitFormattedDisplayParts(raw: string): FormattedDisplayParts {
  const match = DISPLAY_PARTS_RE.exec(raw);
  if (!match) {
    return {
      prefix: "",
      integer: "",
      decimal: "",
      suffix: raw,
    };
  }

  return {
    prefix: match[1] ?? "",
    integer: match[2] ?? "",
    decimal: match[3] ?? "",
    suffix: match[4] ?? "",
  };
}
