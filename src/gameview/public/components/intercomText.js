import { Component } from './component.js'

class IntercomMsg {
  constructor (titleText, subText = '', displayDurationMsg = 1000) {
    this.titleText = titleText
    this.subText = subText
    this.displayDurationMsg = displayDurationMsg
  }
}

window.IntercomMsg = IntercomMsg

class IntercomText extends Component {
  constructor(props, parentDomElement) {
    super(props, parentDomElement)
    this.name = 'IntercomText'
  }

  getHtmlContent() {
    const { msgToDisplay } = this.props
    return !msgToDisplay ? `
      <div class="intercom-text" data-cy="intercom-text-inactive">
      </div>
    ` : `
      <div class="intercom-text" data-cy="intercom-text-active">
        <div class="intercom-text-title">${msgToDisplay.titleText}</div>
        <div class="intercom-text-sub">${msgToDisplay.subText}</div>
      </div>
    `
  }

  getStyleMap() {
    return {
      ...super.getStyleMap(),
      'intercom-text': 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 1000;',
      'intercom-text-title': 'font-size: 3em; font-weight: bold; color: white; text-shadow: 0 0 10px black;',
      'intercom-text-sub': 'font-size: 2em; font-weight: bold; color: white; text-shadow: 0 0 10px black;'
    }
  }
}

export { IntercomText }
