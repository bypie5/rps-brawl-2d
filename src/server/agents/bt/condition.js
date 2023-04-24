const BehaviorTreeNode = require('./node')
const { nodeStatus } = require('./enums')

const { v4: uuidv4 } = require('uuid')

class Condition extends BehaviorTreeNode {
  constructor(condition, params, id) {
    super(!!id ? id : 'anon-condition-' + uuidv4())

    this.condition = condition // (context, params) => Boolean
    this.params = params
  }

  tick() {
    return this.condition(this.context, this.params) ? nodeStatus.SUCCESS : nodeStatus.FAILURE
  }
}

module.exports = Condition
