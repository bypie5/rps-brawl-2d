const { nodeStatus } = require('./enums')

class BehaviorTreeNode {
    constructor() {
      this.children = []
      this.parent = null
      this.context = null

      this.init()
    }

    setContext(context) {
      this.context = context
    }

    init() {
    }

    tick() {
      return nodeStatus.FAILURE
    }

    addChild(child) {
      this.children.push(child)
      child.parent = this
    }

    setContextField(field, value) {
      this.context[field] = value
    }

    getContextField(field) {
      return this.context[field]
    }

    getContext() {
      return this.context
    }
}

module.exports = BehaviorTreeNode
