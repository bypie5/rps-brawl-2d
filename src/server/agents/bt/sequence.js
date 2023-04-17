const BehaviorTreeNode = require('./node')
const { nodeStatus } = require('./enums')

class Sequence extends BehaviorTreeNode {
  constructor() {
    super()
  }

  init() {
    this.currentChild = 0
  }

  tick() {
    for (let i = this.currentChild; i < this.children.length; i++) {
      const childStatus = this.children[i].tick()
      if (childStatus === nodeStatus.RUNNING) {
        return nodeStatus.RUNNING
      } else if (childStatus === nodeStatus.FAILURE) {
        this.init()
        return nodeStatus.FAILURE
      }

      this.currentChild++
    }

    this.init()
    return nodeStatus.SUCCESS
  }
}

module.exports = Sequence
