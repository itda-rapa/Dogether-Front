export type BackendMapPlaceType = 'HOSPITAL' | 'PHARMACY'
export type CulturalFacilityCategory =
  | BackendMapPlaceType | 'ART_CENTER' | 'ART_GALLERY' | 'BEAUTY' | 'MUSEUM'
  | 'SHOP' | 'RESTAURANT' | 'TOUR_SPOT' | 'OUTSOURCE' | 'CAFE'
  | 'RENTAL_HOUSE' | 'HOTEL'
export type MapPlaceType = CulturalFacilityCategory | 'VWORLD'

export type CulturalFacility = {
  facilityId: number
  category: CulturalFacilityCategory
  name: string | null
  address: string | null
  telephone: string | null
  homepage: string | null
  operatingHours: string | null
  longitude: number
  latitude: number
  distanceMeters: number
}

export type MapPlace = {
  placeId: number
  type: MapPlaceType
  name: string
  address: string | null
  phoneNumber: string | null
  status: string | null
  longitude: number
  latitude: number
  distanceMeters: number | null
}

export type MapCenter = {
  longitude: number
  latitude: number
}

export type MapBounds = {
  minLongitude: number
  minLatitude: number
  maxLongitude: number
  maxLatitude: number
}
