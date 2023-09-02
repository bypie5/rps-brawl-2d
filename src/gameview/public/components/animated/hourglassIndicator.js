import { AnimatedComponent } from './animatedComponent.js'

class HourglassIndicator extends AnimatedComponent {
  constructor(spriteMixer, spriteSheet, horizontalFrame, verticalFrames, frameDuration) {
    super(spriteMixer, spriteSheet, horizontalFrame, verticalFrames, frameDuration)
  }

  actions() {
    const spin = this.spriteMixer.Action(
      this.actionSprite,
      0,
      11,
      this.frameDuration
    )

    return { spin }
  }
}

function buildHourglassIndicator(spriteMixer) {
  const HOURGLASS_SPRITE_SHEET = 'assets/hourglass.png'
  const HOURGLASS_HORIZONTAL_FRAME = 6
  const HOURGLASS_VERTICAL_FRAMES = 2
  const HOURGLASS_FRAME_DURATION = 125

  return new HourglassIndicator(
    spriteMixer,
    HOURGLASS_SPRITE_SHEET,
    HOURGLASS_HORIZONTAL_FRAME,
    HOURGLASS_VERTICAL_FRAMES,
    HOURGLASS_FRAME_DURATION
  )
}

export { buildHourglassIndicator }
