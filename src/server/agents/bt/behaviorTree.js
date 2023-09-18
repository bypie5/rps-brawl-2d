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

    this.setContextOfAllAncestors(root)
  }

  setContextOfAllAncestors(node, extraContext) {
    if (extraContext) {
      for (let key in extraContext) {
        this.context[key] = extraContext[key]
      }
    }

    node.setContext(this.context)

    if (node.children) {
      node.children.forEach(this.setContextOfAllAncestors.bind(this))
    }
  }

  findNodeById(id) {
    if (!this.root) {
      throw new Error('BehaviorTree root is not set')
    }

    const findNodeByIdRecursively = (node) => {
      if (node.id === id) {
        return node
      }

      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const found = findNodeByIdRecursively(node.children[i])
          if (found) {
            return found
          }
        }
      }

      return null
    }

    return findNodeByIdRecursively(this.root)
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

  toGraphvizString () {
    if (!this.root) {
      throw new Error('BehaviorTree root is not set')
    }

    let graphviz = 'digraph G {\n'

    const printAsGraphvizRecursively = (node) => {
      if (node.children) {
        node.children.forEach((child) => {
          graphviz += node.id.replace(/-/g, '_') + "_" + node.constructor.name + ' -> ' + child.id.replace(/-/g, '_') + "_" + child.constructor.name + '\n'
          printAsGraphvizRecursively(child)
        })
      }
    }

    printAsGraphvizRecursively(this.root)

    graphviz += '}'

    return graphviz
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
