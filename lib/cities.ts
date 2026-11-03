/** A city the business operates in, with suggested localities. */
export interface City {
  name: string;
  localities: string[];
}

/** Used until migration 0006_cities.sql has run (and as its seed). */
export const DEFAULT_CITIES: City[] = [
  {
    name: "Kanpur",
    localities: ["Swaroop Nagar", "Civil Lines", "Kalyanpur", "Kakadeo", "Panki", "Mall Road", "Tilak Nagar", "Azad Nagar", "Govind Nagar", "GT Road", "Kidwai Nagar", "Barra", "Shyam Nagar"],
  },
  {
    name: "Lucknow",
    localities: ["Gomti Nagar", "Hazratganj", "Indira Nagar", "Aliganj", "Jankipuram", "Aashiana", "Sushant Golf City", "Vibhuti Khand", "Mahanagar", "Alambagh"],
  },
];

/** "Kanpur", "Kanpur & Lucknow", "Kanpur, Lucknow & Agra". */
export function cityList(names: string[]) {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

/** Tidy an admin-typed city name: "  new  delhi " → "New Delhi". */
export const cleanCity = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
