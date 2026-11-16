export type VenueId = 'yamasheva' | 'baumana'

export type Venue = {
  id: VenueId
  title: string
  /** Short label for the select */
  label: string
  /** Primary address line(s) shown in the footer */
  addressLines: string[]
  phone: string
  vk: string
  instagram: string
  site: string
}

export const VENUES: Venue[] = [
  {
    id: 'yamasheva',
    title: 'LASERLAND КАЗАНЬ',
    label: 'Ямашева (стадион Ак Барс Арена)',
    addressLines: [
      'пр-т. Хусаина Ямашева 115 А',
      'стадион Ак Барс Арена, парковка P5, подъезд 59, 2 этаж',
    ],
    phone: '+7 (843) 211-06-99',
    vk: 'LASERLANDKZN',
    instagram: 'LASERLANDKZN',
    site: 'KAZAN.LASER-LAND.RU',
  },
  {
    id: 'baumana',
    title: 'LASERLAND КАЗАНЬ',
    label: 'Баумана (ЦДБ Родина)',
    addressLines: ['ул. Баумана 44/8', 'ЦДБ Родина, 3 этаж'],
    phone: '+7 (843) 211-06-99',
    vk: 'LASERLANDKZN',
    instagram: 'LASERLANDKZN',
    site: 'KAZAN.LASER-LAND.RU',
  },
]

export const DEFAULT_VENUE_ID: VenueId = 'yamasheva'

export function getVenue(id: string | undefined): Venue {
  return VENUES.find((v) => v.id === id) ?? VENUES[0]
}
