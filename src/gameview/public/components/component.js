class Component {
  constructor(props) {
    this.props = props
    this.name = 'Component'
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
