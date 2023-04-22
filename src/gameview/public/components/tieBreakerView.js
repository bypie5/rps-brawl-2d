import { Component } from './component.js'

class TieBreakerView extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'TieBreakerView'
  }

  getHtmlContent() {
    return `
      <div class="tie-breaker-view" data-cy="tie-breaker-view">
      </div>
    `;
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'tie-breaker-view': 'position: absolute; top: 25px; left: 0; width: 100%; height: 100%; background-color: #000000;',
    }
  }
}

export { TieBreakerView }
