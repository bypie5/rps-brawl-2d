const BehaviorTreeNode = require('./node')
const { nodeStatus } = require('./enums')

function inspectablePromise(promise) {
  let isPending = true
  let isRejected = false
  let isFulfilled = false
  let result = null

  const inspect = () => ({
    isPending,
    isRejected,
    isFulfilled,
    result,
  })

  const p = promise.then(
    (v) => {
      isFulfilled = true
      isPending = false
      result = v
      return v
    },
    (e) => {
      isRejected = true
      isPending = false
      result = e
      throw e
    }
  )

  p.inspect = inspect

  return p
}

class Action extends BehaviorTreeNode {
  constructor(action, params) {
    super()

    this.action = action // (context, params) => Promise
    this.params = params
  }

  init() {
    this.actionPromise = null
    this.actionResult = null
  }

  tick() {
    if (!this.actionPromise) {
      this.actionPromise = inspectablePromise(this.action(this.context, this.params))
    }

    const inspectResult = this.actionPromise.inspect()
    if (inspectResult.isPending) {
      return nodeStatus.RUNNING
    } else if (inspectResult.isFulfilled) {
      this.init()
      return nodeStatus.SUCCESS
    } else if (inspectResult.isRejected) {
      this.init()
      return nodeStatus.FAILURE
    }

    this.init()
    return nodeStatus.FAILURE
  }
}

module.exports = Action
