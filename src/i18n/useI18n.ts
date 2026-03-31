import { useMemo } from "react";
import { STRINGS, type Locale, type MessageId } from "./translations";
import { useLocaleStore } from "./localeStore";

export function formatMessage(
  locale: Locale,
  id: MessageId,
  vars?: Record<string, string | number>
): string {
  let s = STRINGS[locale][id] ?? STRINGS.zh[id] ?? String(id);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = useMemo(
    () => (id: MessageId, vars?: Record<string, string | number>) =>
      formatMessage(locale, id, vars),
    [locale]
  );
  return { locale, setLocale, t };
}
