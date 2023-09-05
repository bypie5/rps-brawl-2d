const THREE = window.THREE

class AnimatedComponent {
  constructor (spriteMixer, spriteSheet, horizontalFrame, verticalFrames, frameDuration) {
    this.spriteMixer = spriteMixer
    this.spriteSheet = spriteSheet
    this.horizontalFrame = horizontalFrame
    this.verticalFrames = verticalFrames
    this.frameDuration = frameDuration

    this.actionSprite = this.#build()
  }

  actions() {
    throw new Error('actions() must be implemented')
  }

  #build() {
    const texture = new THREE.TextureLoader().load(this.spriteSheet)
    texture.magFilter = THREE.NearestFilter

    return this.spriteMixer.ActionSprite(
      texture,
      this.horizontalFrame,
      this.verticalFrames
    )
  }
}

export { AnimatedComponent }
