import type { FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { echarts } from "./echarts";

/** Dataset country name -> Natural Earth (world-atlas 50m) name, where they differ. */
const ALIASES: Record<string, string> = {
  "United States": "United States of America",
  "Czech Republic": "Czechia",
  "DR Congo": "Dem. Rep. Congo",
  "Congo": "Congo",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "Central African Republic": "Central African Rep.",
  "South Sudan": "S. Sudan",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Ivory Coast": "Côte d'Ivoire",
  "Equatorial Guinea": "Eq. Guinea",
  "North Macedonia": "Macedonia",
  "Eswatini": "eSwatini",
  "Hong Kong": "Hong Kong",
  "Macau": "Macao",
  "Palestine": "Palestine",
  "Cayman Islands": "Cayman Is.",
  "Solomon Islands": "Solomon Is.",
  "Marshall Islands": "Marshall Is.",
  "Turks and Caicos Islands": "Turks and Caicos Is.",
  "British Virgin Islands": "British Virgin Is.",
  "U.S. Virgin Islands": "U.S. Virgin Is.",
  "Faroe Islands": "Faeroe Is.",
  "Saint Kitts and Nevis": "St. Kitts and Nevis",
  "Saint Vincent and the Grenadines": "St. Vin. and Gren.",
  "Antigua and Barbuda": "Antigua and Barb.",
  "Sao Tome and Principe": "São Tomé and Principe",
  "Western Sahara": "W. Sahara",
  "French Polynesia": "Fr. Polynesia",
};

export const mapName = (country: string) => ALIASES[country] ?? country;

let loaded: Promise<Set<string>> | null = null;

/** Lazily registers the world map (Natural Earth 1:50m via world-atlas, public domain). */
export function loadWorld(): Promise<Set<string>> {
  loaded ??= import("world-atlas/countries-50m.json").then((m) => {
    const topo = (m.default ?? m) as unknown as Topology;
    const geo = feature(topo, topo.objects.countries) as unknown as FeatureCollection;
    // Russia and Fiji cross the 180° meridian; without this their rings draw a
    // line across the whole map. Antarctica holds no postings and only adds noise.
    geo.features = geo.features.filter((f) => f.properties?.name !== "Antarctica");
    for (const f of geo.features) {
      if (!["Russia", "Fiji"].includes(String(f.properties?.name))) continue;
      const shift = (c: unknown): unknown => (typeof (c as number[])[0] === "number"
        ? [(c as number[])[0] < 0 ? (c as number[])[0] + 360 : (c as number[])[0], (c as number[])[1]]
        : (c as unknown[]).map(shift));
      const g = f.geometry as { coordinates: unknown };
      g.coordinates = shift(g.coordinates);
    }
    echarts.registerMap("world", geo as never);
    return new Set(geo.features.map((f) => String(f.properties?.name)));
  });
  return loaded;
}
