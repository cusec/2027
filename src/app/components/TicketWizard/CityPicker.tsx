"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { OriginFields, type Origin } from "./WizardFields";

interface CityResult {
  label: string;
  city: string;
  region: string;
  country: string;
}

export default function CityPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Origin;
  onChange: (next: Partial<Origin>) => void;
}) {
  const t = useTranslations("TicketWizard");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = useRef(value);

  const [label, setLabel] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);

  const picked = Boolean(value.travelCountry && value.travelCity);

  useEffect(() => {
    const { travelCountry: country, travelRegion: region, travelCity: city } = initial.current;
    if (!country || !city) return;
    const params = new URLSearchParams({ country, city });
    if (region) params.set("region", region);
    fetch(`/api/locations?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.label) setLabel(d.label);
        else setManual(true);
      })
      .catch(() => setManual(true));
  }, []);

  useEffect(() => {
    const q = query?.trim() ?? "";
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/locations?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => {
          setResults(d.results ?? []);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(!manual && !picked ? t("city-pick") : "");
  }, [manual, picked, t]);

  if (manual) {
    return (
      <div className="wizard-city">
        <OriginFields value={value} onChange={onChange} />
        <button
          type="button"
          className="wizard-verify-link"
          onClick={() => {
            setManual(false);
            setLabel("");
            onChange({ travelRegion: "", travelCity: "" });
          }}
        >
          {t("city-back")}
        </button>
      </div>
    );
  }

  const pick = (result: CityResult) => {
    setLabel(result.label);
    setQuery(null);
    setOpen(false);
    onChange({
      travelCountry: result.country,
      travelRegion: result.region,
      travelCity: result.city,
    });
  };

  const chooseManual = () => {
    setQuery(null);
    setOpen(false);
    setManual(true);
    onChange({ travelRegion: "", travelCity: "" });
  };

  const typing = (query ?? "").trim().length >= 2;
  const optionCount = results.length + 1;
  const shown = query ?? (picked ? label || value.travelCity : "");

  return (
    <div className={`wizard-combo${open ? " is-open" : ""}`}>
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
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        placeholder={t("city-search-placeholder")}
        value={shown}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (next.trim().length < 2) setResults([]);
          if (picked) onChange({ travelRegion: "", travelCity: "" });
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
            setActive((i) => Math.min(i + 1, optionCount - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (active < results.length) pick(results[active]);
            else chooseManual();
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
        }}
      />
      {open && (
        <ul className="wizard-combo__list" id={listId} role="listbox">
          {typing && loading && results.length === 0 && (
            <li className="wizard-combo__empty">{t("city-searching")}</li>
          )}
          {typing && !loading && results.length === 0 && (
            <li className="wizard-combo__empty">{t("city-empty")}</li>
          )}
          {results.map((result, index) => (
            <li
              key={result.label}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={picked && result.label === label}
              className={`wizard-combo__option${index === active ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(result)}
            >
              {result.label}
            </li>
          ))}
          <li
            id={`${listId}-${results.length}`}
            role="option"
            aria-selected={false}
            className={`wizard-combo__option wizard-combo__option--other${
              active === results.length ? " is-active" : ""
            }`}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(results.length)}
            onClick={chooseManual}
          >
            {t("city-other")}
          </li>
        </ul>
      )}
    </div>
  );
}
