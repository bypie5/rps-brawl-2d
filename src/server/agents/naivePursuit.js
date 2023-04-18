const {
    BehaviorTree,
    Sequence,
    Fallback,
    Decorator,
    Action,
    Condition
 } = require("./bt/behaviorTree")
const { nodeStatus } = require("./bt/enums")

const CpuAgent = require("./cpuAgent")

class NaivePursuit extends CpuAgent {
    constructor(botId, sessionId, msgHandlers) {
        super(botId, sessionId, msgHandlers)

        this.setBehaviorTree(this.buildBehaviorTree())
    }

    buildBehaviorTree() {
        const context = {
            target: null,
        }

        const tree = new BehaviorTree(context)

        const root = new Fallback()

        const sequence = new Sequence()

        const isPlayerNear = new Condition((context) => {
            console.log(this.gameStateBroadcastsQueue.length)
            return context.target !== null
        })

        const stepTowardsTarget = new Action((context) => {
        })

        sequence.addChild(isPlayerNear)
        sequence.addChild(stepTowardsTarget)

        const moveRandomly = new Action((context) => {
            this.move('up') // picked from a random dice roll
            return nodeStatus.SUCCESS
        })

        root.addChild(sequence)
        root.addChild(moveRandomly)

        tree.setRoot(root)

        return tree
    }
}

module.exports = NaivePursuit
