export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'passenger' | 'driver';
  device_id?: string;
  rating_avg?: number;
  created_at: string;
}

export interface DriverDoc {
  id: string;
  driver_id: string;
  aadhaar_number: string;
  rc_document_url?: string;
  license_document_url?: string;
  status: 'pending_verification' | 'approved' | 'rejected';
  created_at: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  fare_estimate: number;
  fare_final?: number;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  prebook?: boolean;
  prebook_datetime?: string;
  prebook_payment_pending?: boolean;
  created_at: string;
  completed_at?: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'busy';
  last_updated: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  from_user_id: string;
  to_user_id: string;
  stars: number;
  comment?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  driver_id: string;
  date_from: string;
  date_to: string;
  total_earnings: number;
  commission: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export interface GeocodedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bbox?: string;
  last_updated: string;
}
