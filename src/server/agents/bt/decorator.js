const BehaviorTreeNode = require('./node')

class Decorator extends BehaviorTreeNode {
  constructor(policy) {
    super()

    this.policy = policy // (status) => newStatus
  }

  tick() {
    const childStatus = this.children[0].tick()

    return this.policy(childStatus)
  }
}

module.exports = Decorator
