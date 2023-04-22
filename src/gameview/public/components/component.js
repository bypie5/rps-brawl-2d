class Component {
  constructor(props, parentDomElement) {
    this.props = props
    this.parentDomElement = parentDomElement
    this.name = 'Component'
  }

  getParentBoundBox() {
    return this.parentDomElement.getBoundingClientRect()
  }

  getHtmlContent() {
    return ''
  }

  getStyleMap() {
    return {
      'unselectable-text': '-webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;'
    }
  }

  getName() {
    return this.name
  }

  getColorPalette() {
    return {
      'light-grey': '#8c8c8c'
    }
  }
}

export { Component }
