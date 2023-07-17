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
            ${this.props.msRemaining ? this._roundTimer() : ''}
          </div>
          <div class="unselectable-text">
            ${this.props.numConnectedPlayers ? this._numberOfConnectedPlayers() : ''}
          </div>
          <br>
          <div class="unselectable-text">
            Player: ${this.props.playerId}
          </div>
          ${this.props.gameMode === 'elimination' ?
            `<div class="unselectable-text">
              Lives: ${this.props.lives}, Kills: ${this.props.kills}${this.props.isSpectating ? ' (spectating)' : ''}
            </div>` : `<div class="unselectable-text">
                Current Kill Streak: ${this.props.kills}
            </div>`
          }
          <div class="unselectable-text player-name">
            (You) ${this.props.playerId}
           </div>
           <div class="unselectable-text">
            ${this.props.activePowerUp ? `Power Up: ${this.props.activePowerUp.toUpperCase()}` : ''}
           </div>

          ${this.props.lives <= 0 && this.props.gameMode === 'elimination' ? `
            <button class="exit-match-button" onclick="backToMainMenu()">
              Back to Main Menu
            </button>
          ` : ''}          
        </div>
        ${this.props.gameMode === 'endless' ? `
          <div class="kill-streak-scoreboard">
            <div class="unselectable-text">
              Highest Kill Streaks
            </div>
            ${this._killStreakScoreboard()}
            <hr>
            <div class="unselectable-text">
              Your Highest Kill Streak: ${this._myHighestKillStreak()}
            </div>
          </div>
        `: ''}
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
      'hud-overlay': 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;',
      'player-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;',
      'player-name': `position: absolute; top: ${uiTop}px; left: ${uiLeft}px; transform:translateX(-50%); ${isVisible ? '' : 'display: none'};`,
      'exit-match-button': 'margin-top: 10px; z-index: 2000;',
      'kill-streak-scoreboard': 'position: absolute; bottom: 0; right: 0; margin-right: 10px; margin-bottom: 10px;'
    }
  }

  _killStreakScoreboard() {
    const highestKillStreakByPlayerId = this.props.killStreaks

    // top 3 highest kill streaks
    const top3 = Object.keys(highestKillStreakByPlayerId)
      .map(playerId => {
        return {
          playerId,
          killStreak: highestKillStreakByPlayerId[playerId]
        }
      }).sort((a, b) => {
        return b.killStreak - a.killStreak
      }).slice(0, 3)

    return `
      <div class="kill-streak-scoreboard-entries">
        ${top3.map((entry, index) => {
          return `<div class="kill-streak-scoreboard-entry">
            <div class="unselectable-text">
              ${index + 1}. ${this.props.playerId === entry.playerId ? '(You)' : ''} ${entry.playerId} (${entry.killStreak})
            </div>
          </div>
          `
        }).join('')}
      </div>
    `
  }

  _myHighestKillStreak() {
    const highestKillStreakByPlayerId = this.props.killStreaks
    const myHighestKillStreak = highestKillStreakByPlayerId[this.props.playerId]

    return myHighestKillStreak ? myHighestKillStreak : 0
  }

  _numberOfConnectedPlayers() {
    return `Players in Match: ${this.props.numConnectedPlayers}`
  }

  _roundTimer() {
    const msRemaining = this.props.msRemaining

    // format time to MM:SS
    const minutes = Math.floor(msRemaining / 60000)
    const seconds = Math.floor((msRemaining % 60000) / 1000)

    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

    return `Time Remaining: ${formattedTime}`
  }
}

export { HudOverlay }
