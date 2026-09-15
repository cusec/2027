import { NextResponse } from "next/server";
import { City, Country, State } from "country-state-city";

const CACHE = { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" };
const SEARCH_CACHE = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };

const COUNTRY_CODE = /^[A-Z]{2}$/;
const REGION_CODE = /^[A-Z0-9-]{1,5}$/;

const MAX_RESULTS = 20;

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface CityEntry {
  city: string;
  region: string;
  country: string;
  label: string;
  key: string;
  rank: number;
}

const COUNTRY_RANK: Record<string, number> = { CA: 0, US: 1 };

let cityIndex: CityEntry[] | null = null;

function getCityIndex(): CityEntry[] {
  if (cityIndex) return cityIndex;
  const countries = new Map(Country.getAllCountries().map((c) => [c.isoCode, c.name]));
  const regions = new Map(
    State.getAllStates().map((s) => [`${s.countryCode}:${s.isoCode}`, s.name])
  );
  const seen = new Set<string>();
  const entries: CityEntry[] = [];
  for (const c of City.getAllCities()) {
    const regionName = regions.get(`${c.countryCode}:${c.stateCode}`);
    const countryName = countries.get(c.countryCode);
    if (!regionName || !countryName) continue;
    const label = `${c.name}, ${regionName}, ${countryName}`;
    if (seen.has(label)) continue;
    seen.add(label);
    entries.push({
      city: c.name,
      region: c.stateCode,
      country: c.countryCode,
      label,
      key: fold(c.name),
      rank: COUNTRY_RANK[c.countryCode] ?? 2,
    });
  }
  cityIndex = entries;
  return entries;
}

function searchCities(query: string) {
  const needle = fold(query.trim());
  const starts: CityEntry[] = [];
  const contains: CityEntry[] = [];
  for (const entry of getCityIndex()) {
    if (entry.key.startsWith(needle)) starts.push(entry);
    else if (contains.length < 500 && entry.key.includes(needle)) contains.push(entry);
  }
  const order = (a: CityEntry, b: CityEntry) =>
    a.rank - b.rank || a.city.length - b.city.length || a.label.localeCompare(b.label);
  return [...starts.sort(order), ...contains.sort(order)]
    .slice(0, MAX_RESULTS)
    .map(({ label, city, region, country }) => ({ label, city, region, country }));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const q = params.get("q");
  if (q !== null) {
    const trimmed = q.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return NextResponse.json({ results: [] }, { headers: SEARCH_CACHE });
    }
    return NextResponse.json({ results: searchCities(trimmed) }, { headers: SEARCH_CACHE });
  }

  const country = params.get("country")?.toUpperCase() ?? null;
  const region = params.get("region")?.toUpperCase() ?? null;
  const city = params.get("city");

  if (!country) {
    const countries = Country.getAllCountries().map(({ isoCode, name }) => ({
      code: isoCode,
      name,
    }));
    return NextResponse.json({ countries: sortByName(countries) }, { headers: CACHE });
  }

  const countryRecord = COUNTRY_CODE.test(country) ? Country.getCountryByCode(country) : undefined;
  if (!countryRecord) {
    return NextResponse.json({ error: "Unknown country" }, { status: 400 });
  }

  const regionRecord =
    region && REGION_CODE.test(region) ? State.getStateByCodeAndCountry(region, country) : undefined;
  if (region && !regionRecord) {
    return NextResponse.json({ error: "Unknown region" }, { status: 400 });
  }

  if (city !== null) {
    const known = (
      region ? City.getCitiesOfState(country, region) : City.getCitiesOfCountry(country) ?? []
    ).some((c) => c.name === city);
    const label = known
      ? [city, regionRecord?.name, countryRecord.name].filter(Boolean).join(", ")
      : null;
    return NextResponse.json({ label }, { headers: SEARCH_CACHE });
  }

  if (!region) {
    const regions = State.getStatesOfCountry(country).map(({ isoCode, name }) => ({
      code: isoCode,
      name,
    }));
    const cities = regions.length
      ? []
      : [...new Set((City.getCitiesOfCountry(country) ?? []).map((c) => c.name))].sort();
    return NextResponse.json({ regions: sortByName(regions), cities }, { headers: CACHE });
  }

  const cities = [
    ...new Set(City.getCitiesOfState(country, region).map((c) => c.name)),
  ].sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ cities }, { headers: CACHE });
}
