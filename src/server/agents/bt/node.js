const { nodeStatus } = require('./enums')

class BehaviorTreeNode {
    constructor(id) {
      this.children = []
      this.parent = null
      this.context = null

      if (!id) {
        throw new Error('BehaviorTreeNode: id is required')
      }

      this.id = id

      this.init()
    }

    setContext(context) {
      this.context = context
    }

    getId() {
      return this.id
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
