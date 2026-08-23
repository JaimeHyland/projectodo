import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ContentPanel, PageShell } from "@/components/PageShell";

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
  const res = await fetch(`${API_BASE}/api/courses/locations/`, {
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
    <PageShell title={messages.titleLessons} accent="gold" maxWidth="5xl">
      <ContentPanel className="space-y-4 leading-7 text-[#514f4b]">
        <h2 className="text-2xl font-bold tracking-tight text-[#292826]">
          {lessons.headline}
        </h2>

        {lessons.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        {lessons.benefits.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </ContentPanel>

      <CollapsibleSection title={lessons.locationsTitle} defaultOpen variant="soft">
        {locations ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {locations.map((location) => (
              <div key={location.id} className="rounded-xl border border-black/10 bg-[#f8f7f3] p-4">
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

      <ContentPanel className="space-y-4 border-l-4 border-l-[#d5a300]">
        <p className="font-semibold">{lessons.contact.label}</p>

        <div className="space-y-1">
          <p>{lessons.contact.details.phone}</p>
          <p>{lessons.contact.details.mobile}</p>
          <p>{lessons.contact.details.fax}</p>
          <p>{lessons.contact.details.email}</p>
          <p>{lessons.contact.details.website}</p>
        </div>
      </ContentPanel>
    </PageShell>
  );
}
