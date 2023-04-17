const BehaviorTreeNode = require('./node')
const { nodeStatus } = require('./enums')

class Condition extends BehaviorTreeNode {
  constructor(condition, params) {
    super()

    this.condition = condition // (context, params) => Boolean
    this.params = params
  }

  tick() {
    return this.condition(this.context, this.params) ? nodeStatus.SUCCESS : nodeStatus.FAILURE
  }
}

module.exports = Condition
