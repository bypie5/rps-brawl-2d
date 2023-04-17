import { HudOverlay } from './components/hudOverlay.js'

const components = {
  hudOverlay: 'hudOverlay'
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
  }

  update() {
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
        component = new HudOverlay(props)
        newId = this._getNextId()
        break
      default:
        throw new Error(`Unknown component name: ${name}`)
    }

    const content = this._drawComponent(newId, component)
    this.parentDomElement.insertAdjacentHTML('beforeend', content)

    this.components.set(newId, component)

    return newId
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

    element.innerHTML = content
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
}

window.gameUiManager = new GameUiManager()