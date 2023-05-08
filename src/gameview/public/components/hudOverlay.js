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
            Lives: ${this.props.lives}, Kills: ${this.props.kills}${this.props.isSpectating ? ' (spectating)' : ''}
          </div>
          <div class="unselectable-text player-name">
            (You) ${this.props.playerId}
           </div>
        </div>
      </div>
    `

    return content
  }

  getStyleMap() {
    const { playerInfoStyle } = this.props

    const uiTop = playerInfoStyle ? playerInfoStyle.top : '0'
    const uiLeft = playerInfoStyle ? playerInfoStyle.left : '0'
    const isVisible = playerInfoStyle ? playerInfoStyle.isVisible : false

    return {
      ...super.getStyleMap(),
      'hud-overlay': 'position: absolute; top: 0; left: 0; width: 100%;',
      'player-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;',
      'player-name': `position: absolute; top: ${uiTop}px; left: ${uiLeft}px; transform:translateX(-50%); ${isVisible ? '' : 'display: none'};`
    }
  }
}

export { HudOverlay }
