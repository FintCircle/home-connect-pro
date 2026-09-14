/** Option lists tuned to how rentals are described in Uganda. */

export const PROPERTY_TYPES = [
  "Single room",
  "Double room",
  "Bedsitter",
  "Apartment",
  "Bungalow / House",
  "Storeyed house",
  "Muzigo (rental units)",
  "Condominium",
  "Servants quarters",
  "Hostel room",
  "Shop / Commercial space",
] as const;

export const FURNISHING = ["unfurnished", "semi-furnished", "fully furnished"] as const;

export const WATER_SOURCES = [
  "NWSC piped water",
  "Borehole",
  "Water tank",
  "Shared tap",
  "Well / spring",
] as const;

export const POWER_SOURCES = [
  "UMEME / prepaid Yaka",
  "Shared meter",
  "Solar",
  "Generator backup",
  "No power yet",
] as const;

export const FENCE_OPTIONS = [
  "Walled with gate",
  "Walled, shared gate",
  "Gated compound with guard",
  "Open compound",
] as const;

export const AMENITIES = [
  "Tiled floors",
  "Ceramic tiles bathroom",
  "Wardrobe fitted",
  "Kitchen cabinets",
  "Balcony",
  "WiFi ready",
  "Security guard",
  "CCTV",
  "Parking yard",
  "Boys quarters",
  "Water tank / reserve",
  "Solar backup",
  "Garden / compound",
  "Paved access road",
  "Boda stage nearby",
  "Near tarmac road",
  "Near market",
  "Near school",
  "Church / mosque nearby",
  "Borehole nearby",
] as const;
