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
  band_leader: {
    id: number;
    username: string;
    email: string;
  };
};

export type LessonLocation = {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};
