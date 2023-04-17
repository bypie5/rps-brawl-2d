const BehaviorTreeNode = require('./node')
const { nodeStatus } = require('./enums')

class Fallback extends BehaviorTreeNode {
  constructor() {
    super()

    this.init()
  }

  init() {
    this.currentChild = 0
  }

  tick() {
    for (let i = this.currentChild; i < this.children.length; i++) {
      const childStatus = this.children[i].tick()
      if (childStatus === nodeStatus.RUNNING) {
        return nodeStatus.RUNNING
      } else if (childStatus === nodeStatus.SUCCESS) {
        this.init()
        return nodeStatus.SUCCESS
      }
    }

    this.init()
    return nodeStatus.FAILURE
  }
}

module.exports = Fallback
