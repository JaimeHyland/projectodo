export type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_current_user: boolean;
  groups: string[];
};

export type AdminBandMember = {
  id: number;
  name: string;
  roles: string[];
  sort_order: number;
  user_id: number | null;
};

export type AdminBandPageSummary = {
  id: number;
  slug: string;
  published: boolean;
};

export type AdminBand = {
  id: number;
  name: string;
  description: string;
  can_manage: boolean;
  can_delete: boolean;
  contact_email: string;
  contact_tel: string;
  website_url: string;
  social_media_urls: { platform: string; url: string }[];
  members: AdminBandMember[];
  genres: string[];
  page: AdminBandPageSummary | null;
  band_leader: {
    id: number;
    username: string;
    email: string;
  };
};

export type LessonLocation = {
  id: number;
  location_type: "physical" | "online";
  name: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export type AdminCourse = {
  id: number;
  name: string;
  course_type: "one_to_one" | "group";
  subject: "guitar" | "ukulele";
  term_type: "school_term" | "all_year";
  duration_type: "one_off" | "date_range";
  instructor: number;
  max_participants: number;
  location: number;
  default_place: number | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  duration_minutes: number;
  days_of_week: string;
  meetings_created: boolean;
};
