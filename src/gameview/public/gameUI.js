import { HudOverlay } from './components/hudOverlay.js'
import { TieBreakerView } from './components/tieBreakerView.js'
import { IntercomText } from './components/intercomText.js'
import { StateChangeIndicators } from './components/stateChangeIndicators.js'

const components = {
  hudOverlay: 'hudOverlay',
  tieBreakerView: 'tieBreakerView',
  intercomText: 'intercomText',
  stateChangeIndicators: 'stateChangeIndicators'
}

window.components = components

class GameUiManager {
  constructor() {
    this.components = new Map() // Map<id (String), Component>
    this._nextId = 0

    this.parentDomElement = null
  }

  start() {
    this.parentDomElement = document.getElementById('game-ui')

    this._updateBounds()
  }

  update() {
    if (this.parentDomElement === null) {
      return // Not started yet
    }

    this._updateBounds()

    for (const id of this.components.keys()) {
      const component = this.components.get(id)
      this._redrawComponent(id, component)
    }
  }

  addComponentToScene(name, props) {
    let newId = null
    let component = null
    switch (name) {
      case components.hudOverlay:
        component = new HudOverlay(props, this.parentDomElement)
        break
      case components.tieBreakerView:
        component = new TieBreakerView(props, this.parentDomElement)
        break
      case components.intercomText:
        component = new IntercomText(props, this.parentDomElement)
        break
      case components.stateChangeIndicators:
        component = new StateChangeIndicators(props, this.parentDomElement)
        break
      default:
        throw new Error(`Unknown component name: ${name}`)
    }

    newId = this._getNextId()

    const content = this._drawComponent(newId, component)
    this.parentDomElement.insertAdjacentHTML('beforeend', content)

    this.components.set(newId, component)

    return newId
  }

  removeComponentFromScene(id) {
    document.getElementById(id).remove()
    this.components.delete(id)
  }

  updateComponent(id, props) {
    const component = this.components.get(id)
    component.props = { ...component.props, ...props }
  }

  _getNextId() {
    this._nextId++
    return `ui-component-${this._nextId}`
  }

  _redrawComponent(id, component) {
    const element = document.getElementById(id)

    if (element === null) {
      throw new Error(`Could not find element with id: ${id}`)
    }

    const content = this._drawComponent(id, component)
    const newChecksum = hex_md5(content)
    if (!component.lastChecksum || component.lastChecksum !== newChecksum) {
      document.getElementById(id).remove()
      this.parentDomElement.insertAdjacentHTML('beforeend', content)
      component.updateChecksum(newChecksum)
    }
  }

  _drawComponent(id, component) {
    const htmlContent = component.getHtmlContent()
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
    const styleMap = component.getStyleMap()
    for (const [className, style] of Object.entries(styleMap)) {
      const elements = doc.getElementsByClassName(className)
      for (let i = 0; i < elements.length; i++) {
        elements[i].setAttribute('style', style)
      }
    }
    doc.body.firstChild.setAttribute('id', id)
    return doc.body.innerHTML
  }

  _updateBounds() {
    const rect = document.getElementById('game-canvas').getBoundingClientRect()

    if (rect === null) {
      throw new Error(`Could not find element with id: game-canvas`)
    }

    if (this.parentDomElement === null) {
      throw new Error(`Could not find element with id: game-ui`)
    }

    this.parentDomElement.style.width = `${rect.width}px`
    this.parentDomElement.style.height = `${rect.height}px`
  }
}

window.gameUiManager = new GameUiManager()

function restartUI () {
  window.gameUiManager = new GameUiManager()
}

window.restartUI = restartUI
