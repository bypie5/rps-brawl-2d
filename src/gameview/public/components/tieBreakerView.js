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
    const topOffsetPixels = 50
    return {
      ...super.getStyleMap(),
      'tie-breaker-view': `position: relative; top: ${topOffsetPixels}px; left: 0; margin: 0px auto ${topOffsetPixels}px auto; width: 80%; height: calc(100% - ${topOffsetPixels * 2}px); background-color: ${this.getColorPalette()["light-grey"]}b4;`,
      'tie-breaker-title-info': 'display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;'
    }
  }
}

export { TieBreakerView }
