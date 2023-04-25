import { Component } from './component.js'

class TieBreakerView extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'TieBreakerView'
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
    for (const round of tieBreakerBracket) {
      for (const match of round) {
        content += this._buildMatchInfoSvg(match, entitiesOfPlayersInTournament)
      }
    }

    return content
  }

  _buildMatchInfoSvg(match, entitiesOfPlayersInTournament) {
    const { opponent1, opponent2, winner } = match

    let opponent1CardSvg = null
    let opponent2CardSvg = null
    for (const [entityId, entity] of entitiesOfPlayersInTournament) {
      if (entityId === opponent1) {
        opponent1CardSvg = this._buildOpponentCardSvg(entityId, entity)
      } else if (entityId === opponent2) {
        opponent2CardSvg = this._buildOpponentCardSvg(entityId, entity)
      }
    }

    return `
      <svg class="match-info-svg">
        ${opponent1CardSvg}
        ${opponent2CardSvg}
      </svg>
     `
  }

  _buildOpponentCardSvg(entityId, entity) {
    return this._buildBlankOpponentCardSvg()
  }

  _buildBlankOpponentCardSvg() {
    return `
      <svg class="opponent-card-svg" width="128px" height="50px">
        <rect class="opponent-card-rect" width="100%" height="100%" fill="#000000" />
        <text class="opponent-card-text" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff">
            ?
        </text>
      </svg>
    `
  }
}

export { TieBreakerView }
