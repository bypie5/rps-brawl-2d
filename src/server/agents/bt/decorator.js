const BehaviorTreeNode = require('./node')

const { v4: uuidv4 } = require('uuid')

class Decorator extends BehaviorTreeNode {
  constructor(policy, id) {
    super(!!id ? id : 'anon-decorator-' + uuidv4())

    this.policy = policy // (status) => newStatus
  }

  tick() {
    const childStatus = this.children[0].tick()

    return this.policy(childStatus)
  }
}

module.exports = Decorator
