const chai = require('chai')
const {
  BehaviorTree,
  Sequence,
  Fallback,
  Decorator,
  Action,
  Condition
} = require('../src/server/agents/bt/behaviorTree')
const { nodeStatus } = require('../src/server/agents/bt/enums')

describe('BehaviorTree', () => {
  it('simple sequence executes as expected', async () => {
    const context = {
      counter: 0
    }

    const tree = new BehaviorTree(context)

    const root = new Sequence()
    const isCounterLessThanThree = new Condition((context) => {
      return context.counter < 3
    })
    const incrementCounter = new Action(async (context) => {
      context.counter++
    })

    root.addChild(isCounterLessThanThree)
    root.addChild(incrementCounter)

    tree.setRoot(root)

    const p = new Promise((resolve, reject) => {
      const ticker = setInterval(() => {
        if (context.counter >= 3) {
          clearInterval(ticker)
          resolve()
        }

        tree.tick()
      }, 1000/33)
    })

    await p
    chai.expect(tree.tick()).to.be.equal(nodeStatus.FAILURE)
  })

  it('simple case with decorator executes as expected', async () => {
    const context = {
      counter: 0
    }

    const tree = new BehaviorTree(context)
    const inverter = new Decorator((status) => {
      return status === nodeStatus.SUCCESS ? nodeStatus.FAILURE : nodeStatus.SUCCESS
    })
    const sequence = new Sequence()
    const isCounterLessThanThree = new Condition((context) => {
      return context.counter < 3
    })
    const incrementCounter = new Action(async (context) => {
      context.counter++
    })

    inverter.addChild(sequence)
    sequence.addChild(isCounterLessThanThree)
    sequence.addChild(incrementCounter)

    tree.setRoot(inverter)

    const p = new Promise((resolve, reject) => {
      const ticker = setInterval(() => {
        if (context.counter >= 3) {
          clearInterval(ticker)
          resolve()
        }

        tree.tick()
      }, 1000/33)
    })

    await p
    chai.expect(tree.tick()).to.be.equal(nodeStatus.SUCCESS)
  })
})
