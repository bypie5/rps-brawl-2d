const chai = require('chai')

const {
    resolveClusterMembers
} = require('../src/server/ecs/util')
const {
    buildPlayerEntity
} = require('../src/server/ecs/entities')

function mockGameContext () {
    return {
        _mockEntityId: 0,
        _addEntity: (mockContext, components) => {
            const newId = mockContext._mockEntityId
            mockContext.entities[mockContext._mockEntityId] = components
            mockContext._mockEntityId++

            return newId
        },
        entities: {
        }
    }
}

describe('Unit tests for ECS util functions', () => {
    it('resolveClusterMembers resolves basic 2 player collision', () => {
        const gameContext = mockGameContext()

        const player1Mock = buildPlayerEntity('player1', 0, 0)
        const player2Mock = buildPlayerEntity('player2', 0, 0)

        const player1Id = gameContext._addEntity(gameContext, player1Mock)
        const player2Id = gameContext._addEntity(gameContext, player2Mock)

        player1Mock.Avatar.stateData.collisionsWithOtherPlayers = [player2Id]
        player2Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id]

        const membersInCluster = resolveClusterMembers(player1Mock, player1Id, gameContext)


        chai.expect(membersInCluster.length).to.be.equal(2)
        chai.expect(membersInCluster).to.contain(player1Id)
        chai.expect(membersInCluster).to.contain(player2Id)
    })

    it('resolveClusterMembers returns expected members', () => {
        const gameContext = mockGameContext()

        const player1Mock = buildPlayerEntity('player1', 0, 0)
        const player2Mock = buildPlayerEntity('player2', 0, 0)
        const player3Mock = buildPlayerEntity('player3', 0, 0)

        const player4Mock = buildPlayerEntity('player4', 0, 0)

        const player1Id = gameContext._addEntity(gameContext, player1Mock)
        const player2Id = gameContext._addEntity(gameContext, player2Mock)
        const player3Id = gameContext._addEntity(gameContext, player3Mock)
        const player4Id = gameContext._addEntity(gameContext, player4Mock)

        player1Mock.Avatar.stateData.collisionsWithOtherPlayers = [player2Id]
        player2Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id, player3Id]
        player3Mock.Avatar.stateData.collisionsWithOtherPlayers = [player2Id]

        const membersInCluster = resolveClusterMembers(player1Mock, player1Id, gameContext)

        chai.expect(membersInCluster.length).to.be.equal(3)
        chai.expect(membersInCluster).to.contain(player1Id)
        chai.expect(membersInCluster).to.contain(player2Id)
        chai.expect(membersInCluster).to.contain(player3Id)


        const membersInCluster2 = resolveClusterMembers(player4Mock, player4Id, gameContext)

        chai.expect(membersInCluster2.length).to.be.equal(1)
        chai.expect(membersInCluster2).to.contain(player4Id)
    })
})
