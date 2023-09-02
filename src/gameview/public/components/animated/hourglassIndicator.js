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
  return new HourglassIndicator(
    spriteMixer,
    'assets/hourglass.png',
    6,
    2,
    100
  )
}

export { buildHourglassIndicator }
