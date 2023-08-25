import { Component } from './component.js'

class StateChangeIndicators extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'StateChangeIndicators'
  }

  getHtmlContent() {
    const { isOnCoolDown } = this.props

    return `
      <div class="state-change-indicators" data-cy="state-change-indicators">
        <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src="/assets/j_key_rock.png"></image>
        <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src="/assets/k_key_paper.png"></image>
        <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src="/assets/l_key_scissors.png"></image>
      </div>
    `
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'state-change-indicators': 'position: absolute; bottom: 0; left: 0; display: flex; z-index: 1000;',
      'key': 'width: 100px; height: 100px; margin: 0 10px;',
      'cooldown': 'width: 100px; height: 100px; margin: 0 10px; opacity: 0.5'
    }
  }
}

export { StateChangeIndicators }
