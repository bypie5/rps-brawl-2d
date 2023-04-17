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
      if (status === nodeStatus.RUNNING) {
        return nodeStatus.RUNNING
      }

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

  it('simple case with fallback executes as expected', async () => {
    // fizz buzz but with a behavior tree
    function getFizzBuzzSequence(max) {
      let fb = []
      for (let i = 1; i <= max; i++) {
        fb.push(fizzBuzz(i))
      }

      return fb
    }

    function fizzBuzz(n) {
      if (n % 3 === 0 && n % 5 === 0) {
        return 'fizzbuzz'
      } else if (n % 3 === 0) {
        return 'fizz'
      } else if (n % 5 === 0) {
        return 'buzz'
      } else {
        return n
      }
    }

    const context = {
      counter: 1,
      fizzBuzz: []
    }

    const tree = new BehaviorTree(context)

    const root = new Fallback()

    const doesSayFizz = new Sequence()
    const isCounterDivisibleByThree = new Condition((context) => {
      return context.counter % 3 === 0
    })
    const fizz = new Action(async (context) => {
      context.fizzBuzz.push('fizz')
      context.counter++
    })

    doesSayFizz.addChild(isCounterDivisibleByThree)
    doesSayFizz.addChild(fizz)

    const doesSayBuzz = new Sequence()
    const isCounterDivisibleByFive = new Condition((context) => {
      return context.counter % 5 === 0
    })
    const buzz = new Action(async (context) => {
      context.fizzBuzz.push('buzz')
      context.counter++
    })

    doesSayBuzz.addChild(isCounterDivisibleByFive)
    doesSayBuzz.addChild(buzz)

    const doesSayFizzBuzz = new Sequence()
    const isCounterDivisibleByThreeAndFive = new Condition((context) => {
      return context.counter % 3 === 0 && context.counter % 5 === 0
    })
    const fizzbuzz = new Action(async (context) => {
      context.fizzBuzz.push('fizzbuzz')
      context.counter++
    })

    doesSayFizzBuzz.addChild(isCounterDivisibleByThreeAndFive)
    doesSayFizzBuzz.addChild(fizzbuzz)

    const sayNumber = new Action(async (context) => {
      context.fizzBuzz.push(context.counter)
      context.counter++
    })

    root.addChild(doesSayFizzBuzz)
    root.addChild(doesSayBuzz)
    root.addChild(doesSayFizz)
    root.addChild(sayNumber)

    tree.setRoot(root)

    const p = new Promise((resolve, reject) => {
      const ticker = setInterval(() => {
        if (context.counter >= 100) {
          clearInterval(ticker)
          resolve()
        }

        tree.tick()
      }, 1000/60)
    })

    await p
    chai.expect(context.fizzBuzz).to.be.deep.equal(getFizzBuzzSequence(100))
  })
})
