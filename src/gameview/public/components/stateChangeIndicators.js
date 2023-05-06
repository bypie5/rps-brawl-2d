import { Component } from './component.js'

class StateChangeIndicators extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'StateChangeIndicators'
  }

  getHtmlContent() {
    const { playerRpsState, isOnCoolDown } = this.props

    let pressQImageUrl = ''
    let pressEImageUrl = ''

    switch (playerRpsState) {
      case 'rock':
        pressQImageUrl = '/assets/q_key_scissors.png'
        pressEImageUrl = '/assets/e_key_paper.png'
        break
      case 'paper':
        pressQImageUrl = '/assets/q_key_rock.png'
        pressEImageUrl = '/assets/e_key_scissors.png'
        break
    case 'scissors':
        pressQImageUrl = '/assets/q_key_paper.png'
        pressEImageUrl = '/assets/e_key_rock.png'
    }

    return `
      <div class="state-change-indicators" data-cy="state-change-indicators">
        <image class="press-q ${isOnCoolDown ? 'cooldown' : ''}" src="${pressQImageUrl}"></image>
        <image class="press-e ${isOnCoolDown ? 'cooldown' : ''}" src="${pressEImageUrl}"></image>
      </div>
    `
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'state-change-indicators': 'position: absolute; bottom: 0; left: 0; display: flex; z-index: 1000;',
      'press-q': 'width: 100px; height: 100px; margin: 0 10px;',
      'press-e': 'width: 100px; height: 100px; margin: 0 10px;',
      'cooldown': 'width: 100px; height: 100px; margin: 0 10px; opacity: 0.5'
    }
  }
}

export { StateChangeIndicators }
