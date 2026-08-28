import Feature, { type FeatureLike } from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import LineString from 'ol/geom/LineString'
import MultiLineString from 'ol/geom/MultiLineString'
import Point from 'ol/geom/Point'
import { Fill, Stroke, Style, Text } from 'ol/style'

export const SLOPE_LEGEND = [
  { label: '급한 내리막 ≤ -7.5%', color: '#2563eb' },
  { label: '내리막 -7.5~-2.5%', color: '#06b6d4' },
  { label: '완만 -2.5~2.5%', color: '#16a34a' },
  { label: '오르막 2.5~7.5%', color: '#f59e0b' },
  { label: '급한 오르막 > 7.5%', color: '#dc2626' },
] as const

function slopeColor(rawSlope: unknown) {
  const slopePercent = Number(rawSlope ?? 0) * 100
  if (slopePercent <= -7.5) return SLOPE_LEGEND[0].color
  if (slopePercent <= -2.5) return SLOPE_LEGEND[1].color
  if (slopePercent <= 2.5) return SLOPE_LEGEND[2].color
  if (slopePercent <= 7.5) return SLOPE_LEGEND[3].color
  return SLOPE_LEGEND[4].color
}

const DIRECTION_ARROW_SPACING_METERS = 320

function squaredDistance(first: number[], second: number[]) {
  const dx = first[0] - second[0]
  const dy = first[1] - second[1]
  return dx * dx + dy * dy
}

/**
 * GeoJSON의 개별 링크를 실제 이동 순서로 정렬하고, 링크 단위가 아닌
 * 누적 경로 길이를 기준으로 진행 방향 화살표 위치를 지정한다.
 */
export function prepareRouteLineFeatures(
  features: Feature<Geometry>[],
  startCoordinate?: number[],
) {
  const ordered = [...features].sort((first, second) => (
    Number(first.get('seq') ?? 0) - Number(second.get('seq') ?? 0)
  ))
  let previousEnd = startCoordinate
  let distanceSinceArrow = DIRECTION_ARROW_SPACING_METERS / 2

  for (const feature of ordered) {
    feature.unset('directionArrows', true)
    const geometry = feature.getGeometry()
    if (!(geometry instanceof LineString) && !(geometry instanceof MultiLineString)) continue

    const remaining = (geometry instanceof LineString
      ? [geometry.getCoordinates()]
      : geometry.getCoordinates())
      .filter((coordinates) => coordinates.length >= 2)
      .map((coordinates) => [...coordinates])
    const connected: number[][][] = []

    while (remaining.length > 0) {
      let selectedIndex = 0
      let reverseSelected = false
      if (previousEnd) {
        let nearest = Number.POSITIVE_INFINITY
        remaining.forEach((coordinates, index) => {
          const startDistance = squaredDistance(coordinates[0], previousEnd!)
          const endDistance = squaredDistance(coordinates.at(-1)!, previousEnd!)
          if (startDistance < nearest) {
            selectedIndex = index
            reverseSelected = false
            nearest = startDistance
          }
          if (endDistance < nearest) {
            selectedIndex = index
            reverseSelected = true
            nearest = endDistance
          }
        })
      }
      let coordinates = remaining.splice(selectedIndex, 1)[0]
      if (reverseSelected) coordinates = coordinates.reverse()
      connected.push(coordinates)
      previousEnd = coordinates.at(-1)!
    }

    if (geometry instanceof LineString) geometry.setCoordinates(connected[0])
    else geometry.setCoordinates(connected)

    const arrows: Array<{ coordinate: number[]; rotation: number }> = []
    for (const coordinates of connected) {
      const line = new LineString(coordinates)
      const length = line.getLength()
      if (length <= 0) continue
      let remainingLength = length
      let consumedLength = 0
      while (distanceSinceArrow + remainingLength >= DIRECTION_ARROW_SPACING_METERS) {
        const distanceOnRemaining = DIRECTION_ARROW_SPACING_METERS - distanceSinceArrow
        consumedLength += distanceOnRemaining
        const fraction = Math.max(0.002, Math.min(0.998, consumedLength / length))
        const tangentOffset = Math.min(0.025, Math.max(0.003, 6 / length))
        const before = line.getCoordinateAt(Math.max(0, fraction - tangentOffset))
        const after = line.getCoordinateAt(Math.min(1, fraction + tangentOffset))
        arrows.push({
          coordinate: line.getCoordinateAt(fraction),
          rotation: -Math.atan2(after[1] - before[1], after[0] - before[0]),
        })
        remainingLength -= distanceOnRemaining
        distanceSinceArrow = 0
      }
      distanceSinceArrow += remainingLength
    }
    if (arrows.length > 0) feature.set('directionArrows', arrows, true)
  }

  return features
}

export function routeLineStyles(feature: FeatureLike) {
  const color = slopeColor(feature.get('slope'))
  const styles: Style[] = [
    new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,0.92)', width: 9 }) }),
    new Style({ stroke: new Stroke({ color, width: 6 }) }),
  ]

  const arrows = feature.get('directionArrows') as Array<{ coordinate: number[]; rotation: number }> | undefined
  for (const arrow of arrows ?? []) {
    styles.push(new Style({
      geometry: new Point(arrow.coordinate),
      text: new Text({
        text: '➤',
        rotation: arrow.rotation,
        rotateWithView: true,
        font: '700 16px sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: 'rgba(15,23,42,0.82)', width: 3 }),
      }),
      zIndex: 8,
    }))
  }
  return styles
}
