class Component {
  constructor(props, parentDomElement) {
    this.props = props
    this.parentDomElement = parentDomElement
    this.name = 'Component'
  }

  getParentSize() {
    const boundingRect = this.parentDomElement.getBoundingClientRect()
    return {
      width: boundingRect.width,
      height: boundingRect.height
    }
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
}

export { Component }
