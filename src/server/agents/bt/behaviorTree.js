const Sequence = require('./sequence')
const Fallback = require('./fallback')
const Decorator = require('./decorator')
const Action = require('./action')
const Condition = require('./condition')

class BehaviorTree {
  constructor(context, onBeforeTick) {
    this.root = null

    this.context = context
    this.onBeforeTick = onBeforeTick
  }

  setRoot(root) {
    this.root = root

    // resursively set context for all children
    const setContextOfAllAncestors = (node) => {
      node.setContext(this.context)

      if (node.children) {
        node.children.forEach(setContextOfAllAncestors)
      }
    }

    setContextOfAllAncestors(root)
  }

  tick() {
    if (!this.root) {
      throw new Error('BehaviorTree root is not set')
    }

    if (!this.context) {
      throw new Error('BehaviorTree context is not set')
    }

    if (this.onBeforeTick) {
      this.onBeforeTick()
    }

    return this.root.tick()
  }
}

module.exports = {
  BehaviorTree,
  Sequence,
  Fallback,
  Decorator,
  Action,
  Condition
}
