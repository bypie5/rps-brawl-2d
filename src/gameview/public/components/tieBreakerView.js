import { Component } from './component.js'
import { truncateWithEllipsis, ticksToSeconds, setToDecimalPlaces } from './util.js'

class TieBreakerView extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'TieBreakerView'

    this.opponentCardWidth = 225
    this.opponentCardHeight = 32
  }

  getHtmlContent() {
    const { tieBreakerState, tieBreakerBracket, entitiesOfPlayersInTournament } = this.props

    function _buildTimerMessage() {
      const roundTimer = `${setToDecimalPlaces(ticksToSeconds(
      tieBreakerState.currRoundMaxTicks - tieBreakerState.currRoundTick
      ), 1)} seconds remaining`

      const inBetweenRoundsTimer = `${setToDecimalPlaces(ticksToSeconds(
      tieBreakerState.ticksBetweenRounds - tieBreakerState.interRoundTicks
      ), 0)} seconds until round starts...`

      return tieBreakerState.currRoundTick > 0 ? roundTimer : inBetweenRoundsTimer
    }

    function _buildRoundMsg() {
      const roundMsg = `Round ${tieBreakerState.currRound} of ${tieBreakerBracket.length}`
      const replayingMsg = `Replaying round ${tieBreakerState.currRound} of ${tieBreakerBracket.length} due to tie`
      return tieBreakerState.hasAtLeastOneTieInRound ? replayingMsg : roundMsg
    }

    return `
      <div class="tie-breaker-view" data-cy="tie-breaker-view">
        <div class="tie-breaker-title-info">
            <div class="unselectable-text">
              Tiebreaker - ${Object.entries(this.props.entitiesOfPlayersInTournament).length} player tournament
            </div>
            <div class="unselectable-text">
              Only the Tournament Winner will survive the Rock Paper Scissors Showdown!
            </div>
            <div class="unselectable-text">
              ${_buildRoundMsg()}
            </div>
            <div class="unselectable-text">
              ${_buildTimerMessage()}
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

    const currRound = tieBreakerState.currRound

    let xOffset = 15
    let yOffset = 10
    let lastInitialYOffset = 10
    let gap = 10
    let lastGap = 0
    let xGap = 25
    let roundNumber = 1
    for (const round of tieBreakerBracket) {
      let columnHeight = 0
      const matchPairHeight = (this.opponentCardHeight * 4) + gap * 2
      for (const match of round) {
        content += this._buildMatchInfoSvg(match, entitiesOfPlayersInTournament, roundNumber, tieBreakerState, xOffset, yOffset)

        // draw lines connecting this match with its child matches
        if (roundNumber > 1) {
          content += this._drawLineToChildrenMatches(xOffset, yOffset, matchPairHeight, lastGap, xGap)
        }

        yOffset += (this.opponentCardHeight * 2) + gap
      }

      columnHeight = (this.opponentCardHeight * 4 * round.length / 2) + (gap * (round.length - 1))

      // draw outline of all match pairs in this round
      if (roundNumber === currRound) {
        content += `
          <rect x="${xOffset - xGap/2}" y="${lastInitialYOffset}" width="${this.opponentCardWidth + xGap - 4}" height="${columnHeight}" stroke="${this.getColorPalette()["dark-red"]}" stroke-width="2" fill="none" />
        `
      }

      xOffset += this.opponentCardWidth + xGap
      yOffset = (matchPairHeight / 2 - this.opponentCardHeight - gap / 2) + lastInitialYOffset
      lastInitialYOffset = yOffset
      lastGap = gap
      gap += matchPairHeight / 2
      roundNumber += 1
    }

    return content
  }

  _drawLineToChildrenMatches(parentX, parentY, matchPairHeight, gap, xGap) {
    return `
        <line x1="${parentX}" y1="${parentY + this.opponentCardHeight}" x2="${parentX - xGap/2}" y2="${parentY + this.opponentCardHeight}" stroke="black" stroke-width="2" />
        
        <line x1="${parentX - xGap/2}" y1="${parentY + this.opponentCardHeight}" x2="${parentX - xGap/2}" y2="${(parentY + this.opponentCardHeight) - (this.opponentCardHeight + gap/2)}" stroke="black" stroke-width="2" />
        <line x1="${parentX - xGap/2}" y1="${(parentY + this.opponentCardHeight) - (this.opponentCardHeight + gap/2)}" x2="${parentX - xGap}" y2="${(parentY + this.opponentCardHeight) - (this.opponentCardHeight + gap/2)}" stroke="black" stroke-width="2" />
        
        <line x1="${parentX - xGap/2}" y1="${parentY + this.opponentCardHeight}" x2="${parentX - xGap/2}" y2="${(parentY + this.opponentCardHeight) + (this.opponentCardHeight + gap/2)}" stroke="black" stroke-width="2" />
        <line x1="${parentX - xGap/2}" y1="${(parentY + this.opponentCardHeight) + (this.opponentCardHeight + gap/2)}" x2="${parentX - xGap}" y2="${(parentY + this.opponentCardHeight) + (this.opponentCardHeight + gap/2)}" stroke="black" stroke-width="2" />
    `
  }

  _buildMatchInfoSvg(match, entitiesOfPlayersInTournament, roundNumber, tieBreakerState, x = 0, y = 0) {
    const {
      opponent1,
      opponent2,
      winner,
      winnerRpsState,
      loserRpsState,
      byeInOpponent1,
      byeInOpponent2,
      opponent1RpsState,
      opponent2RpsState,
    } = match

    function _isInInterRoundPeriod() {
      return tieBreakerState.currRoundTick === 0
    }

    function _isCurrentRound() {
      return tieBreakerState.currRound === roundNumber
    }

    let opponent1CardSvg = null
    let opponent2CardSvg = null
    for (const [entityId, entity] of entitiesOfPlayersInTournament) {
      if (entityId === opponent1) {
        opponent1CardSvg = this._buildOpponentCardSvg(
          entityId, entity, x, y,
          winner ? {
            isWinner: winner === opponent1,
            winnerRpsState,
            loserRpsState,
          } : null,
          entity.Avatar.playerId === this.props.usernameOfPlayer,
          _isInInterRoundPeriod(), _isCurrentRound(), opponent1RpsState)
      } else if (entityId === opponent2) {
        opponent2CardSvg = this._buildOpponentCardSvg(
          entityId, entity, x, y + this.opponentCardHeight,
          winner ? {
            isWinner: winner === opponent2,
            winnerRpsState,
            loserRpsState,
          } : null,
          entity.Avatar.playerId === this.props.usernameOfPlayer,
          _isInInterRoundPeriod(), _isCurrentRound(), opponent2RpsState)
      }
    }

    return `
      <svg class="match-info-svg">
        ${opponent1CardSvg ? opponent1CardSvg : this._buildBlankOpponentCardSvg(x, y, roundNumber === 1 && byeInOpponent1 ? 'bye' : null)}
        ${opponent2CardSvg ? opponent2CardSvg : this._buildBlankOpponentCardSvg(x, y + this.opponentCardHeight, roundNumber === 1 && byeInOpponent2 ? 'bye' : null)}
      </svg>
     `
  }

  _buildOpponentCardSvg(entityId, entity, x = 0, y = 0, matchEndInfo, isForPlayer, isInInterRoundPeriod, isCurrentRound, rpsState) {
    function _getRpsSprite(rpsState) {
      if (rpsState === 'rock') {
        return 'assets/rock_avatar.png'
      } else if (rpsState === 'paper') {
        return 'assets/paper_avatar.png'
      } else if (rpsState === 'scissors') {
        return 'assets/scissors_avatar.png'
      }

      throw new Error(`Invalid rps state: ${rpsState}`)
    }

    function _getSpriteForMatchEnd(matchEndInfo) {
      if (matchEndInfo.isWinner) {
        return _getRpsSprite(matchEndInfo.winnerRpsState)
      } else {
        return _getRpsSprite(matchEndInfo.loserRpsState)
      }
    }

    const iconWidth = this.opponentCardHeight - 6
    function _buildInfoIcon() {
      if (matchEndInfo) {
        // show rps state of the player at end of round
        return `<image href=${_getSpriteForMatchEnd(matchEndInfo)} x="3" y="3" width="${iconWidth}px" height="${iconWidth}px"/>`
      } else if (isInInterRoundPeriod && isCurrentRound && rpsState) {
        // display rps state of the player at the end of the match
        return `<image href=${_getRpsSprite(rpsState)} x="3" y="3" width="${iconWidth}px" height="${iconWidth}px"/>`
      } else if (isForPlayer && isCurrentRound) {
        // display rps state of the player during the match
        return `<image href=${_getRpsSprite(entity.Avatar.stateData.rockPaperScissors)} x="3" y="3" width="${iconWidth}px" height="${iconWidth}px"/>`
      } else {
        // display question mark when match has not ended and if this opponent is not the player
        return `<image href="assets/question_mark.png" x="3" y="3" width="${iconWidth}px" height="${iconWidth}px"/>`
      }
    }

    return `
      <svg class="opponent-card-svg" width="${this.opponentCardWidth}px" height="${this.opponentCardHeight}px" x="${x}px" y="${y}px">
        <rect class="opponent-card-rect" width="100%" height="100%" fill=${this.getColorPalette()["light-grey"]} />
        <text
          class="opponent-card-text"
          x="${iconWidth + 10}px"
          y="50%"
          dominant-baseline="middle"
          text-anchor="start"
          fill="#ffffff" 
          ${
            matchEndInfo && matchEndInfo.isWinner 
              ? 'font-weight="bold" data-cy="match-winner-info-text"' 
              : 'data-cy="match-info-text"'
          }
        >
          ${matchEndInfo && matchEndInfo.isWinner ? 'Winner! ' : ''}${isForPlayer ? '(You) ' : ''}${truncateWithEllipsis(entity.Avatar.playerId, 20)}
        </text>
        <rect class="opponent-card-icon-container" x="3" y="3" width="${iconWidth}px" height="${iconWidth}px" style="fill:rgba(0,0,0,0);stroke-width:3;stroke:rgb(0,0,0)"/>
        ${_buildInfoIcon()}
        ${matchEndInfo && matchEndInfo.isWinner ? `
          <image href="assets/trophy.png" x="3" y="3" width="${iconWidth}px" height="${iconWidth}px"/>
        ` : ''}
      </svg>
    `
  }

  _buildBlankOpponentCardSvg(x = 0, y = 0, msg) {
    const iconWidth = this.opponentCardHeight - 6
    return `
      <svg class="opponent-card-svg" width="${this.opponentCardWidth}px" height="${this.opponentCardHeight}px" x="${x}px" y="${y}px">
        <rect class="opponent-card-rect" width="100%" height="100%" fill=${this.getColorPalette()["light-grey"]} />
        <text class="opponent-card-text" x="${iconWidth + 10}px" y="50%" dominant-baseline="middle" text-anchor="start" fill="#ffffff">
            ${msg ? msg : '?'}
        </text>
        <rect class="opponent-card-icon-container" x="3" y="3" width="${iconWidth}px" height="${iconWidth}px" style="fill:rgba(0,0,0,0);stroke-width:3;stroke:rgb(0,0,0)"/>
      </svg>
    `
  }
}

export { TieBreakerView }
