import { Component } from './component.js'

class HudOverlay extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'HudOverlay'
  }

  getHtmlContent() {
    const content = `
      <div class="hud-overlay" data-cy="player-hud-overlay">
        <div class="player-info">
          <div class="unselectable-text">
            Player: ${this.props.playerId}
          </div>
          <div class="unselectable-text">
            Lives: ${this.props.lives}${this.props.isSpectating ? ' (spectating)' : ''}
          </div>
        </div>
      </div>
    `

    return content
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'hud-overlay': 'position: absolute; top: 0; left: 0; width: 100%;',
      'player-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;'
    }
  }
}

export { HudOverlay }
