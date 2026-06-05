import { CollapsibleSection } from "@/components/CollapsibleSection";

import en from "@/messages/lessons/en.json";
import de from "@/messages/lessons/de.json";
import es from "@/messages/lessons/es.json";

interface LessonsPageProps {
  params: Promise<{ locale: string }>;
}

type Location = {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

type LocationsResponse = {
  locations: Location[];
};

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

async function getLocations(): Promise<Location[] | null> {
  const res = await fetch(`${API_BASE}/api/classes/locations/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const data: LocationsResponse = await res.json();
  return data.locations;
}

export default async function LessonsPage({ params }: LessonsPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const lessons = messages.lessons;
  const locations = await getLocations();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold text-center">
        {messages.titleLessons}
      </h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{lessons.headline}</h2>

        {lessons.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        {lessons.benefits.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <CollapsibleSection title={lessons.locationsTitle} defaultOpen>
        {locations ? (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.id}>
                <h4 className="font-semibold">{location.name}</h4>
                <p>{location.street_address}</p>
                <p>
                  {location.postcode} {location.city}
                  {location.state ? ` - ${location.state}` : ""}
                </p>
                <p>{location.country}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>{lessons.couldNotLoadLocations}</p>
        )}
      </CollapsibleSection>

      <section className="space-y-4">
        <p className="font-semibold">{lessons.contact.label}</p>

        <div className="space-y-1">
          <p>{lessons.contact.details.phone}</p>
          <p>{lessons.contact.details.mobile}</p>
          <p>{lessons.contact.details.fax}</p>
          <p>{lessons.contact.details.email}</p>
          <p>{lessons.contact.details.website}</p>
        </div>
      </section>
    </main>
  );
}