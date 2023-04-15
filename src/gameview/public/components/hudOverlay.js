import { Component } from './component.js'

class HudOverlay extends Component {
  constructor(props) {
    super(props)
    this.name = 'HudOverlay'
  }

  getHtmlContent() {
    const content = `
      <div class="hud-overlay" data-cy="player-hud-overlay">
        <div class="unselectable-text">
          Player: ${this.props.playerId}
          <br>
          x: ${this.props.xPos}, y: ${this.props.yPos}
        </div>
      </div>
    `

    return content
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'hud-overlay': 'position: absolute; top: 10px; left: 0;'
    }
  }
}

export { HudOverlay }
