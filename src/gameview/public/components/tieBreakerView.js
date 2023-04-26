import { Component } from './component.js'
import { truncateWithEllipsis } from './util.js'

class TieBreakerView extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'TieBreakerView'

    this.opponentCardWidth = 225
    this.opponentCardHeight = 32
  }

  getHtmlContent() {
    const { tieBreakerState, tieBreakerBracket, entitiesOfPlayersInTournament } = this.props

    return `
      <div class="tie-breaker-view" data-cy="tie-breaker-view">
        <div class="tie-breaker-title-info">
            <div class="unselectable-text">
              Tiebreaker - ${Object.entries(this.props.entitiesOfPlayersInTournament).length} player tournament
            </div>
            <div class="unselectable-text">
              Only the Tournament Winner will survive the Tiebreaker Deathmatch!
            </div>
            <div class="unselectable-text">
              Round ${tieBreakerState.currRound} of ${tieBreakerBracket.length}
            </div>
        </div>
        <div class="tournament-bracket">
            <svg class="tournament-bracket-svg">
              ${this._buildTournamentBracketSvg(tieBreakerState, tieBreakerBracket, entitiesOfPlayersInTournament)}
            </svg>
        </div>
      </div>
    `;
  }

  getStyleMap() {
    const topOffsetPixels = 50
    return {
      ...super.getStyleMap(),
      'tie-breaker-view': `position: relative; display: flex; flex-direction: column; top: ${topOffsetPixels}px; left: 0; margin: 0px auto ${topOffsetPixels}px auto; width: 80%; height: calc(100% - ${topOffsetPixels * 2}px); background-color: ${this.getColorPalette()["light-grey"]}b4;`,
      'tie-breaker-title-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;',
      'tournament-bracket': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%; height: 100%;',
      'tournament-bracket-svg': 'width: 100%; height: 100%;',
      'opponent-card-text': 'pointer-events: none; user-select: none;',
    }
  }

  _buildTournamentBracketSvg(tieBreakerState, tieBreakerBracket, entitiesOfPlayersInTournament) {
    let content = ''

    let xOffset = 0
    let yOffset = 0
    let gap = 10
    let roundNumber = 1
    for (const round of tieBreakerBracket) {
      for (const match of round) {
        content += this._buildMatchInfoSvg(match, entitiesOfPlayersInTournament, xOffset, yOffset)
        yOffset += (this.opponentCardHeight * 2) + gap
      }

      xOffset += this.opponentCardWidth
      yOffset = ((this.opponentCardHeight * roundNumber))
      // gap += ((this.opponentCardHeight * 2) + gap) * roundNumber
      roundNumber += 1
    }

    return content
  }

  _buildMatchInfoSvg(match, entitiesOfPlayersInTournament, x = 0, y = 0) {
    const { opponent1, opponent2, winner } = match

    let opponent1CardSvg = null
    let opponent2CardSvg = null
    for (const [entityId, entity] of entitiesOfPlayersInTournament) {
      if (entityId === opponent1) {
        opponent1CardSvg = this._buildOpponentCardSvg(entityId, entity, x, y)
      } else if (entityId === opponent2) {
        opponent2CardSvg = this._buildOpponentCardSvg(entityId, entity, x, y + this.opponentCardHeight)
      }
    }

    return `
      <svg class="match-info-svg">
        ${opponent1CardSvg ? opponent1CardSvg : this._buildBlankOpponentCardSvg(x, y)}
        ${opponent2CardSvg ? opponent2CardSvg : this._buildBlankOpponentCardSvg(x, y + this.opponentCardHeight)}
      </svg>
     `
  }

  _buildOpponentCardSvg(entityId, entity, x = 0, y = 0) {
    return `
      <svg class="opponent-card-svg" width="${this.opponentCardWidth}px" height="${this.opponentCardHeight}px" x="${x}px" y="${y}px">
        <rect class="opponent-card-rect" width="100%" height="100%" fill=${this.getColorPalette()["light-grey"]} />
        <text class="opponent-card-text" x="53px" y="50%" dominant-baseline="middle" text-anchor="start" fill="#ffffff">
            ${truncateWithEllipsis(entity.Avatar.playerId, 20)}
        </text>
        <rect class="opponent-card-icon-container" x="3" y="3" width="${this.opponentCardHeight - 6}px" height="${this.opponentCardHeight - 6}px" style="fill:rgba(0,0,0,0);stroke-width:3;stroke:rgb(0,0,0)"/>
      </svg>
    `
  }

  _buildBlankOpponentCardSvg(x = 0, y = 0) {
    return `
      <svg class="opponent-card-svg" width="${this.opponentCardWidth}px" height="${this.opponentCardHeight}px" x="${x}px" y="${y}px">
        <rect class="opponent-card-rect" width="100%" height="100%" fill=${this.getColorPalette()["light-grey"]} />
        <text class="opponent-card-text" x="53px" y="50%" dominant-baseline="middle" text-anchor="start" fill="#ffffff">
            ?
        </text>
        <rect class="opponent-card-icon-container" x="3" y="3" width="${this.opponentCardHeight - 6}px" height="${this.opponentCardHeight - 6}px" style="fill:rgba(0,0,0,0);stroke-width:3;stroke:rgb(0,0,0)"/>
      </svg>
    `
  }
}

export { TieBreakerView }
