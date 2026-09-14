"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { OTHER, optionLabel, type Option } from "@/lib/ticketWizardOptions";

// Building blocks for every step of the attendee profile. Each one is a thin
// skin over a native control (radio, checkbox, select, text input) so browser
// validation, keyboard use and screen readers keep working, with the glass
// chip and card look from the design mockups layered on top.

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function WizardCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="wizard-card">
      <header className="wizard-card__head">
        {icon && (
          <span className="wizard-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div>
          <h2 className="wizard-card__title">{title}</h2>
          {subtitle && <p className="wizard-card__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="wizard-card__body">{children}</div>
    </section>
  );
}

/** One question: an uppercase label above its control, with an optional hint. */
export function Question({
  label,
  hint,
  htmlFor,
  labelId,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  /** For a single native control; groups pass `labelId` instead. */
  htmlFor?: string;
  labelId?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`wizard-q${wide ? " wizard-q--wide" : ""}`}>
      {htmlFor ? (
        <label className="wizard-q__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="wizard-q__label" id={labelId}>
          {label}
        </span>
      )}
      {children}
      {hint && <p className="wizard-q__hint">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips
// ---------------------------------------------------------------------------

/** Single choice as a row of glass chips. */
export function ChoiceChips({
  name,
  options,
  value,
  onChange,
  labelId,
  required = false,
}: {
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  labelId: string;
  required?: boolean;
}) {
  const locale = useLocale();
  return (
    <div className="wizard-chips" role="radiogroup" aria-labelledby={labelId}>
      {options.map((option, index) => {
        const on = value === option.value;
        return (
          <label key={option.value} className={`wizard-chip${on ? " is-on" : ""}`}>
            <input
              className="wizard-chip__input"
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              // Native validation only needs one radio in the group marked.
              required={required && index === 0}
              onChange={() => onChange(option.value)}
            />
            <span className="wizard-chip__mark wizard-chip__mark--radio" aria-hidden="true" />
            <span className="wizard-chip__text">{optionLabel(option, locale)}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Multiple choice as chips, optionally capped, with values that stand alone. */
export function MultiChips({
  options,
  values,
  onChange,
  labelId,
  max,
  exclusive = [],
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  labelId: string;
  max?: number;
  /** Picking one of these clears the rest, and picking anything else clears it. */
  exclusive?: string[];
}) {
  const locale = useLocale();
  const full = max !== undefined && values.length >= max;

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else if (exclusive.includes(value)) {
      onChange([value]);
    } else {
      onChange([...values.filter((v) => !exclusive.includes(v)), value]);
    }
  };

  return (
    <div className="wizard-chips" role="group" aria-labelledby={labelId}>
      {options.map((option) => {
        const on = values.includes(option.value);
        return (
          <label
            key={option.value}
            className={`wizard-chip${on ? " is-on" : ""}${!on && full ? " is-disabled" : ""}`}
          >
            <input
              className="wizard-chip__input"
              type="checkbox"
              checked={on}
              disabled={!on && full && !exclusive.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span className="wizard-chip__mark" aria-hidden="true">
              {on && <Check strokeWidth={3} />}
            </span>
            <span className="wizard-chip__text">{optionLabel(option, locale)}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Tags with a remove button, added from a dropdown of what's left. */
export function TagPicker({
  id,
  options,
  values,
  onChange,
  max,
}: {
  id: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
}) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  const remaining = options.filter((o) => !values.includes(o.value));
  const full = max !== undefined && values.length >= max;

  return (
    <div className="wizard-tags">
      {values.map((value) => {
        const option = options.find((o) => o.value === value);
        if (!option) return null;
        const label = optionLabel(option, locale);
        return (
          <span key={value} className="wizard-tag">
            {label}
            <button
              type="button"
              className="wizard-tag__remove"
              aria-label={t("tag-remove", { label })}
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              <X aria-hidden="true" />
            </button>
          </span>
        );
      })}
      <select
        id={id}
        className="wizard-tags__add"
        value=""
        disabled={full || remaining.length === 0}
        onChange={(e) => e.target.value && onChange([...values, e.target.value])}
      >
        <option value="">{full ? t("tag-full", { max: max ?? 0 }) : t("tag-add")}</option>
        {remaining.map((option) => (
          <option key={option.value} value={option.value}>
            {optionLabel(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropdowns
// ---------------------------------------------------------------------------

/** A native select over an option list, with a placeholder. */
export function SelectField({
  id,
  options,
  value,
  onChange,
  required = false,
}: {
  id: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  return (
    <select
      id={id}
      className="wizard-input"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t("select-placeholder")}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {optionLabel(option, locale)}
        </option>
      ))}
    </select>
  );
}

/** The free-text box that follows an "Other" pick. Renders nothing otherwise. */
export function OtherInput({
  show,
  value,
  onChange,
  required = false,
  label,
}: {
  show: boolean;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Accessible name, since the box has no visible label of its own. */
  label: string;
}) {
  const t = useTranslations("TicketWizard");
  if (!show) return null;
  return (
    <input
      type="text"
      className="wizard-input wizard-input--other"
      value={value}
      maxLength={200}
      required={required}
      aria-label={label}
      placeholder={t("other-placeholder")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export interface ComboOption {
  value: string;
  label: string;
}

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAX_MATCHES = 60;

/**
 * A searchable single-choice dropdown: type to filter, arrow keys to move,
 * Enter to pick. Used where a native select would be unusably long (schools,
 * cities). `otherLabel` appends an "Other" choice that is always reachable.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  otherLabel,
  required = false,
  disabled = false,
  placeholder,
}: {
  id: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  otherLabel?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("TicketWizard");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Null while not typing, so the box shows the picked label otherwise.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selectedLabel =
    value === OTHER
      ? (otherLabel ?? "")
      : (options.find((o) => o.value === value)?.label ?? "");

  const matches = useMemo(() => {
    const needle = fold(query ?? "");
    const found = needle
      ? options.filter((o) => fold(o.label).includes(needle))
      : options;
    const list = found.slice(0, MAX_MATCHES);
    return otherLabel ? [...list, { value: OTHER, label: otherLabel }] : list;
  }, [options, query, otherLabel]);

  // Picking is what satisfies "required"; typing a name that isn't in the
  // list is not an answer, so the browser blocks Continue until one is chosen.
  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? t("combobox-pick") : "");
  }, [required, value, t]);

  const pick = (option: ComboOption) => {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="wizard-combo">
      <input
        ref={inputRef}
        id={id}
        className="wizard-input wizard-combo__input"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        disabled={disabled}
        placeholder={placeholder ?? t("search-placeholder")}
        value={query ?? selectedLabel}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          if (value) onChange("");
        }}
        onBlur={() => {
          // Let a click on an option land before the list closes.
          window.setTimeout(() => {
            setOpen(false);
            setQuery(null);
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
        }}
      />
      {open && !disabled && (
        <ul className="wizard-combo__list" id={listId} role="listbox">
          {matches.length === 0 && (
            <li className="wizard-combo__empty">{t("combobox-empty")}</li>
          )}
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`wizard-combo__option${index === active ? " is-active" : ""}${
                option.value === OTHER ? " wizard-combo__option--other" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Travel origin
// ---------------------------------------------------------------------------

interface Place {
  code: string;
  name: string;
}

// Lists never change during a visit, so each is fetched at most once.
const cache = new Map<string, Promise<Record<string, unknown>>>();
function loadPlaces(query: string) {
  let hit = cache.get(query);
  if (!hit) {
    hit = fetch(`/api/locations${query}`).then((r) => (r.ok ? r.json() : {}));
    hit.catch(() => cache.delete(query));
    cache.set(query, hit);
  }
  return hit;
}

export interface Origin {
  travelCountry: string;
  travelRegion: string;
  travelCity: string;
}

/** Country, then province or state, then city, each narrowing the next. */
export function OriginFields({
  value,
  onChange,
}: {
  value: Origin;
  onChange: (next: Partial<Origin>) => void;
}) {
  const t = useTranslations("TicketWizard");
  const [countries, setCountries] = useState<Place[]>([]);
  const [regions, setRegions] = useState<Place[] | null>(null);
  const [cities, setCities] = useState<string[] | null>(null);
  const [otherChosen, setOtherChosen] = useState(false);

  const { travelCountry: country, travelRegion: region, travelCity: city } = value;

  useEffect(() => {
    let alive = true;
    loadPlaces("").then((d) => {
      if (alive) setCountries((d.countries as Place[]) ?? []);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!country) return;
    let alive = true;
    loadPlaces(`?country=${country}`).then((d) => {
      if (!alive) return;
      const list = (d.regions as Place[]) ?? [];
      setRegions(list);
      // A country with no subdivisions lists its cities directly.
      if (list.length === 0) setCities((d.cities as string[]) ?? []);
    });
    return () => {
      alive = false;
    };
  }, [country]);

  useEffect(() => {
    if (!country || !region) return;
    let alive = true;
    loadPlaces(`?country=${country}&region=${region}`).then((d) => {
      if (alive) setCities((d.cities as string[]) ?? []);
    });
    return () => {
      alive = false;
    };
  }, [country, region]);

  const hasRegions = regions === null || regions.length > 0;
  const cityListReady = cities !== null && (!hasRegions || Boolean(region));
  // A saved city that isn't in the list was typed in under Other.
  const cityIsOther =
    otherChosen || (cityListReady && Boolean(city) && !cities.includes(city));

  const countryOptions = countries.map((c) => ({ value: c.code, label: c.name }));
  const cityOptions = (cityListReady ? cities : []).map((name) => ({ value: name, label: name }));

  return (
    <div className="wizard-origin">
      <Combobox
        id="travel-country"
        options={countryOptions}
        value={country}
        required
        placeholder={t("origin-country")}
        onChange={(next) => {
          setRegions(null);
          setCities(null);
          setOtherChosen(false);
          onChange({ travelCountry: next, travelRegion: "", travelCity: "" });
        }}
      />

      {country && hasRegions && (
        <select
          className="wizard-input"
          aria-label={t("origin-region")}
          value={region}
          required
          disabled={regions === null}
          onChange={(e) => {
            setCities(null);
            setOtherChosen(false);
            onChange({ travelRegion: e.target.value, travelCity: "" });
          }}
        >
          <option value="">{t("origin-region")}</option>
          {(regions ?? []).map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      )}

      {country && (!hasRegions || region) && (
        <Combobox
          id="travel-city"
          options={cityOptions}
          value={cityIsOther ? OTHER : city}
          otherLabel={t("origin-city-other")}
          required
          disabled={!cityListReady}
          placeholder={t("origin-city")}
          onChange={(next) => {
            if (next === OTHER) {
              setOtherChosen(true);
              onChange({ travelCity: "" });
            } else {
              setOtherChosen(false);
              onChange({ travelCity: next });
            }
          }}
        />
      )}

      <OtherInput
        show={cityIsOther}
        value={city}
        required
        label={t("origin-city")}
        onChange={(next) => onChange({ travelCity: next })}
      />
    </div>
  );
}
