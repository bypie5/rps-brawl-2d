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
    const texture = new window.THREE.TextureLoader().load(this.#buildSpriteSheetUrl(this.spriteSheet))
    texture.magFilter = window.THREE.NearestFilter

    return this.spriteMixer.ActionSprite(
      texture,
      this.horizontalFrame,
      this.verticalFrames
    )
  }

  #buildSpriteSheetUrl(assetName) {
    if (window.isExternalClient) {
      return `${window.resourcePath}/${assetName}`
    } else {
      return assetName
    }
  }
}

export { AnimatedComponent }
