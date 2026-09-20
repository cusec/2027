"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, X } from "lucide-react";
import { OTHER, optionLabel, type Option } from "@/lib/ticketWizardOptions";

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function WizardCard({
  title,
  icon,
  children,
}: {
  title: string;
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
        <h2 className="wizard-card__title">{title}</h2>
      </header>
      <div className="wizard-card__body">{children}</div>
    </section>
  );
}

export function Question({
  label,
  hint,
  htmlFor,
  labelId,
  anchor,
  required = false,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  labelId?: string;
  anchor?: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const text = (
    <>
      {label}
      {required && (
        <span className="wizard-q__req" aria-hidden="true">
          {" *"}
        </span>
      )}
    </>
  );
  return (
    <div id={anchor} className={`wizard-q${wide ? " wizard-q--wide" : ""}`}>
      {htmlFor ? (
        <label className="wizard-q__label" htmlFor={htmlFor}>
          {text}
        </label>
      ) : (
        <span className="wizard-q__label" id={labelId}>
          {text}
        </span>
      )}
      {children}
      {hint && <p className="wizard-q__hint">{hint}</p>}
    </div>
  );
}

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

export interface SelectOption {
  value: string;
  label: string;
}

function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, open, close]);
}

function useActiveIntoView(listRef: RefObject<HTMLUListElement | null>, open: boolean, active: number) {
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [listRef, open, active]);
}

function typeahead(options: SelectOption[], from: number, key: string) {
  const needle = fold(key);
  for (let step = 1; step <= options.length; step++) {
    const i = (from + step) % options.length;
    if (fold(options[i].label).startsWith(needle)) return i;
  }
  return from;
}

type ListKeyResult = "open" | "close" | "choose" | number | null;

function listKey(
  e: KeyboardEvent<HTMLElement>,
  open: boolean,
  active: number,
  options: SelectOption[]
): ListKeyResult {
  if (!open) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      return "open";
    }
    return null;
  }
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      return Math.min(active + 1, options.length - 1);
    case "ArrowUp":
      e.preventDefault();
      return Math.max(active - 1, 0);
    case "Home":
      e.preventDefault();
      return 0;
    case "End":
      e.preventDefault();
      return options.length - 1;
    case "Enter":
    case " ":
      e.preventDefault();
      return "choose";
    case "Escape":
      e.preventDefault();
      return "close";
    case "Tab":
      return "close";
    default:
      return e.key.length === 1 ? typeahead(options, active, e.key) : null;
  }
}

export function BrandSelect({
  id,
  labelId,
  ariaLabel,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
}: {
  id: string;
  labelId?: string;
  ariaLabel?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("TicketWizard");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);

  useDismiss(rootRef, open, () => setOpen(false));
  useActiveIntoView(listRef, open, active);

  const show = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const pick = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const result = listKey(e, open, active, options);
    if (result === "open") show();
    else if (result === "close") setOpen(false);
    else if (result === "choose") {
      if (options[active]) pick(options[active]);
    } else if (typeof result === "number") setActive(result);
  };

  return (
    <div className={`wizard-select${open ? " is-open" : ""}`} ref={rootRef}>
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        className={`wizard-input wizard-select__trigger${disabled ? " is-disabled" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : ariaLabel}
        aria-required={required || undefined}
        aria-disabled={disabled || undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? undefined : "wizard-select__placeholder"}>
          {selected?.label ?? placeholder ?? t("select-placeholder")}
        </span>
        <ChevronDown className="wizard-select__chev" aria-hidden="true" />
      </div>
      <input
        className="wizard-select__native"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        disabled={disabled}
        value={value}
        onChange={() => {}}
      />
      {open && (
        <ul
          ref={listRef}
          className="wizard-combo__list"
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          aria-label={labelId ? undefined : ariaLabel}
        >
          {options.map((option, index) => {
            const on = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={on}
                className={`wizard-combo__option${index === active ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option)}
              >
                <span>{option.label}</span>
                {on && <Check className="wizard-combo__tick" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SelectField({
  id,
  labelId,
  options,
  value,
  onChange,
  required = false,
}: {
  id: string;
  labelId: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const locale = useLocale();
  return (
    <BrandSelect
      id={id}
      labelId={labelId}
      options={options.map((o) => ({ value: o.value, label: optionLabel(o, locale) }))}
      value={value}
      required={required}
      onChange={onChange}
    />
  );
}

export function MultiSelect({
  id,
  labelId,
  options,
  values,
  onChange,
  max,
  placeholder,
}: {
  id: string;
  labelId: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
  placeholder: string;
}) {
  const t = useTranslations("TicketWizard");
  const locale = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const items = options.map((o) => ({ value: o.value, label: optionLabel(o, locale) }));
  const full = max !== undefined && values.length >= max;

  useDismiss(rootRef, open, () => setOpen(false));
  useActiveIntoView(listRef, open, active);

  const toggle = (value: string) => {
    if (values.includes(value)) onChange(values.filter((v) => v !== value));
    else if (!full) onChange([...values, value]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const result = listKey(e, open, active, items);
    if (result === "open") setOpen(true);
    else if (result === "close") setOpen(false);
    else if (result === "choose") {
      if (items[active]) toggle(items[active].value);
    } else if (typeof result === "number") setActive(result);
  };

  return (
    <div className={`wizard-multi${open ? " is-open" : ""}`} ref={rootRef}>
      <div className="wizard-tags">
        {values.map((value) => {
          const item = items.find((i) => i.value === value);
          if (!item) return null;
          return (
            <span key={value} className="wizard-tag">
              {item.label}
              <button
                type="button"
                className="wizard-tag__remove"
                aria-label={t("tag-remove", { label: item.label })}
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                <X aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <div
          id={id}
          role="combobox"
          tabIndex={0}
          className="wizard-tags__add"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
        >
          <span>{placeholder}</span>
          <ChevronDown className="wizard-select__chev" aria-hidden="true" />
        </div>
      </div>
      {open && (
        <ul
          ref={listRef}
          className="wizard-combo__list"
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={labelId}
        >
          {items.map((item, index) => {
            const on = values.includes(item.value);
            const blocked = !on && full;
            return (
              <li
                key={item.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={on}
                aria-disabled={blocked || undefined}
                className={`wizard-combo__option wizard-combo__option--multi${
                  index === active ? " is-active" : ""
                }${blocked ? " is-disabled" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => toggle(item.value)}
              >
                <span className={`wizard-chip__mark${on ? " is-on" : ""}`} aria-hidden="true">
                  {on && <Check strokeWidth={3} />}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function OtherInput({
  id,
  show,
  value,
  onChange,
  required = false,
  label,
}: {
  id?: string;
  show: boolean;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label: string;
}) {
  const t = useTranslations("TicketWizard");
  if (!show) return null;
  return (
    <input
      id={id}
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

const MAX_MATCHES = 60;

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

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? t("combobox-pick") : "");
  }, [required, value, t]);

  const pick = (option: ComboOption) => {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className={`wizard-combo${open && !disabled ? " is-open" : ""}`}>
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

interface Place {
  code: string;
  name: string;
}

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
        <BrandSelect
          id="travel-region"
          ariaLabel={t("origin-region")}
          placeholder={t("origin-region")}
          options={(regions ?? []).map((r) => ({ value: r.code, label: r.name }))}
          value={region}
          required
          disabled={regions === null}
          onChange={(next) => {
            setCities(null);
            setOtherChosen(false);
            onChange({ travelRegion: next, travelCity: "" });
          }}
        />
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
