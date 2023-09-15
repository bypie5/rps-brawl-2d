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
        <div class="indicator">
            <div class="spinner ${isOnCoolDown ? '' : 'spinner-invisible'}"></div>
            <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src=${this.getAssetPath("/assets/j_key_rock.png")}></image>
        </div>
        <div class="indicator">
            <div class="spinner ${isOnCoolDown ? '' : 'spinner-invisible'}"></div>
            <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src=${this.getAssetPath("/assets/k_key_paper.png")}></image>
        </div>
        <div class="indicator">
            <div class="spinner ${isOnCoolDown ? '' : 'spinner-invisible'}"></div>
            <image class="key ${isOnCoolDown ? 'cooldown' : ''}" src=${this.getAssetPath("/assets/l_key_scissors.png")}></image>
        </div>
      </div>
      <style>
        @-webkit-keyframes spin {
          0% { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'state-change-indicators': 'position: absolute; bottom: 0; left: 0; display: flex; z-index: 1000; margin-bottom: 10px;',
      'indicator': 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 10px;',
      'spinner': 'opacity: 0.75; border: 8px solid #f3f3f3; border-top: 8px solid #a3a3a3; border-radius: 50%; width: 65%; height: 65%; animation: spin 0.75s linear infinite; z-index: 1000; -webkit-animation: spin 0.75s linear infinite; position: absolute;',
      'spinner-invisible': 'display: none;',
      'key': 'width: 75px; height: 75px; position: relative;',
      'cooldown': 'width: 75px; height: 75px; opacity: 0.5; position: relative;'
    }
  }
}

export { StateChangeIndicators }
