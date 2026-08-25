export type BackendMapPlaceType = 'HOSPITAL' | 'PHARMACY'
export type MapPlaceType = BackendMapPlaceType | 'VWORLD'

export type MapPlace = {
  placeId: number
  type: MapPlaceType
  name: string
  address: string | null
  phoneNumber: string | null
  status: string | null
  longitude: number
  latitude: number
}

export type MapBounds = {
  minLongitude: number
  minLatitude: number
  maxLongitude: number
  maxLatitude: number
}
