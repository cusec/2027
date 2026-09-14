import { NextResponse } from "next/server";
import { City, Country, State } from "country-state-city";

// GET - the travel-origin pickers' data, one level at a time:
//   (no params)                 -> countries
//   ?country=CA                 -> provinces/states (and cities, if it has none)
//   ?country=CA&region=QC       -> cities
//
// The dataset is too large to ship to the browser, so the forms ask for only
// the list they are about to show. It is public reference data, so no session
// is required, and it never changes, so responses are cached hard.
const CACHE = { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" };

const COUNTRY_CODE = /^[A-Z]{2}$/;
// Up to 5 characters with a hyphen: a few subdivisions in the dataset are
// coded like "UM-67" or "SH-AC".
const REGION_CODE = /^[A-Z0-9-]{1,5}$/;

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const country = params.get("country")?.toUpperCase() ?? null;
  const region = params.get("region")?.toUpperCase() ?? null;

  if (!country) {
    const countries = Country.getAllCountries().map(({ isoCode, name }) => ({
      code: isoCode,
      name,
    }));
    return NextResponse.json({ countries: sortByName(countries) }, { headers: CACHE });
  }

  if (!COUNTRY_CODE.test(country) || !Country.getCountryByCode(country)) {
    return NextResponse.json({ error: "Unknown country" }, { status: 400 });
  }

  if (!region) {
    const regions = State.getStatesOfCountry(country).map(({ isoCode, name }) => ({
      code: isoCode,
      name,
    }));
    // A handful of countries have no subdivisions in the dataset; their cities
    // hang off the country itself.
    const cities = regions.length
      ? []
      : [...new Set((City.getCitiesOfCountry(country) ?? []).map((c) => c.name))].sort();
    return NextResponse.json({ regions: sortByName(regions), cities }, { headers: CACHE });
  }

  if (!REGION_CODE.test(region) || !State.getStateByCodeAndCountry(region, country)) {
    return NextResponse.json({ error: "Unknown region" }, { status: 400 });
  }

  const cities = [
    ...new Set(City.getCitiesOfState(country, region).map((c) => c.name)),
  ].sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ cities }, { headers: CACHE });
}
