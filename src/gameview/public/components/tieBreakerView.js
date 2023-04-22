import { Component } from './component.js'

class TieBreakerView extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'TieBreakerView'
  }

  getHtmlContent() {
    return `
      <div class="tie-breaker-view" data-cy="tie-breaker-view">
        <div class="tie-breaker-title-info">
            <div class="unselectable-text">
              Tie Breaker - ${Object.entries(this.props.entitiesOfPlayersInTournament).length} players
             </div>
        </div>
      </div>
    `;
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'tie-breaker-view': `position: relative; top: 25px; left: 0; width: 100%; height: 100%; margin: 0px 10px 0px 20px; background-color: ${this.getColorPalette()["light-grey"]};`,
      'tie-breaker-title-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;'
    }
  }
}

export { TieBreakerView }
