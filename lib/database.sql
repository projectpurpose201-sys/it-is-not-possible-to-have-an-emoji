-- Supabase Database Schema for Vaniyambadi Ride App

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver')),
  device_id TEXT,
  rating_avg DECIMAL(2,1) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver documents table
CREATE TABLE driver_docs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  aadhaar_number TEXT NOT NULL,
  rc_document_url TEXT,
  license_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver locations table
CREATE TABLE driver_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  geom GEOMETRY(POINT, 4326),
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides table
CREATE TABLE rides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  passenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_lat DECIMAL(10, 8) NOT NULL,
  drop_lng DECIMAL(11, 8) NOT NULL,
  drop_address TEXT NOT NULL,
  fare_estimate INTEGER NOT NULL,
  fare_final INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled')),
  prebook BOOLEAN DEFAULT FALSE,
  prebook_datetime TIMESTAMP WITH TIME ZONE,
  prebook_payment_pending BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ratings table
CREATE TABLE ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  total_earnings INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table for single device enforcement
CREATE TABLE sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geocoded places cache
CREATE TABLE geocoded_places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  bbox TEXT,
  place_type TEXT DEFAULT 'neighborhood',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_status ON driver_locations(status);
CREATE INDEX idx_driver_locations_geom ON driver_locations USING GIST(geom);
CREATE INDEX idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);
CREATE INDEX idx_ratings_ride_id ON ratings(ride_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_geocoded_places_name ON geocoded_places(name);

-- Trigger to update geom column in driver_locations
CREATE OR REPLACE FUNCTION update_driver_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_location_geom
  BEFORE INSERT OR UPDATE ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location_geom();

-- Function to find nearest drivers
CREATE OR REPLACE FUNCTION find_nearest_drivers(
  pickup_lat DECIMAL,
  pickup_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 3,
  limit_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  driver_id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dl.driver_id,
    ST_Distance(
      ST_Transform(ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326), 3857),
      ST_Transform(dl.geom, 3857)
    ) / 1000 as distance_km
  FROM driver_locations dl
  JOIN profiles p ON dl.driver_id = p.id
  JOIN driver_docs dd ON p.id = dd.driver_id
  WHERE 
    dl.status = 'online'
    AND dd.status = 'approved'
    AND ST_DWithin(
      ST_Transform(ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326), 3857),
      ST_Transform(dl.geom, 3857),
      max_distance_km * 1000
    )
  ORDER BY 
    ST_Distance(
      ST_Transform(ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326), 3857),
      ST_Transform(dl.geom, 3857)
    )
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocoded_places ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for driver_docs
CREATE POLICY "Drivers can view their own documents" ON driver_docs
  FOR ALL USING (auth.uid() = driver_id);

-- Policies for driver_locations
CREATE POLICY "Anyone can view online driver locations" ON driver_locations
  FOR SELECT USING (status = 'online');

CREATE POLICY "Drivers can manage their own location" ON driver_locations
  FOR ALL USING (auth.uid() = driver_id);

-- Policies for rides
CREATE POLICY "Users can view their own rides" ON rides
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Passengers can create rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Drivers can update assigned rides" ON rides
  FOR UPDATE USING (auth.uid() = driver_id);

-- Policies for ratings
CREATE POLICY "Users can view ratings" ON ratings
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create ratings" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Policies for invoices
CREATE POLICY "Drivers can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = driver_id);

-- Policies for sessions
CREATE POLICY "Users can manage their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Policies for geocoded_places
CREATE POLICY "Anyone can view geocoded places" ON geocoded_places
  FOR SELECT TO PUBLIC USING (true);

-- Insert some sample neighborhoods for Vaniyambadi
INSERT INTO geocoded_places (name, lat, lng, place_type) VALUES
('Vaniyambadi Town', 12.6820, 78.6201, 'town_center'),
('Ambur Road', 12.6850, 78.6180, 'neighborhood'),
('Tirupattur Road', 12.6780, 78.6250, 'neighborhood'),
('Market Area', 12.6830, 78.6190, 'commercial'),
('Railway Station Area', 12.6800, 78.6220, 'transport_hub');
