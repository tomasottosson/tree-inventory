import type { Position } from '../../lib/types'
import { CONDITION_COLORS } from '../../lib/constants'

interface Props {
  position: Position
  size: number
  onClick?: () => void
}

export function PositionDot({ position, size, onClick }: Props) {
  const isLandmark = position.type === 'landmark'
  const isEmpty = position.type === 'empty'
  const isStump = position.type === 'stump'

  let bg: string
  let border: string
  let borderStyle = 'solid'

  if (isEmpty) {
    bg = 'transparent'
    border = '#a3a3a3'
    borderStyle = 'dashed'
  } else if (isLandmark) {
    bg = '#8b5cf6'
    border = '#6d28d9'
  } else if (isStump) {
    bg = '#92400e'
    border = '#78350f'
  } else {
    bg = CONDITION_COLORS[position.condition] || CONDITION_COLORS.unknown
    border =
      position.condition === 'healthy'
        ? '#15803d'
        : position.condition === 'weak'
          ? '#a16207'
          : position.condition === 'dead'
            ? '#525252'
            : '#a3a3a3'
  }

  return (
    <div
      onClick={onClick}
      title={position.id}
      className="shrink-0 cursor-pointer active:scale-150 transition-transform"
      style={{
        width: size,
        height: size,
        borderRadius: isLandmark ? 3 : '50%',
        background: bg,
        border: `1px ${borderStyle} ${border}`,
      }}
    />
  )
}
