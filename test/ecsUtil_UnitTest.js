const chai = require('chai')

const {
    resolveClusterMembers,
    createTieBreakerBracket
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

    it('createTieBreakerBracket returns expected bracket', () => {
        for (let i = 3; i < 65; i++) {
            for (let j = 0; j < 250; j++) {
                let tournamentMembers = []
                for (let x = 0; x < i; x++) {
                    tournamentMembers.push(x)
                }
                const bracket = createTieBreakerBracket(tournamentMembers)

                // id is string like <number>-<number>
                function getMatchById (id) {
                    return bracket[id[0]][id[2]]
                }

                // simulate a tournament
                let tournamentWinner = null
                for (let i = 0; i < bracket.length; i++) {
                    const round = bracket[i]
                    for (let j = 0; j < round.length; j++) {
                        const match = round[j]
                        if (match) {
                            const winner = Math.random() > 0.5 ? 0 : 1
                            if (!match.parentMatchId) {
                                tournamentWinner = winner === 0 ? match.opponent1 : match.opponent2
                                match.winner = tournamentWinner
                                break
                            }

                            const parentMatch = getMatchById(match.parentMatchId)
                            if (
                                (match.opponent1 === null && match.opponent2 !== null) ||
                                (match.opponent1 !== null && match.opponent2 === null)
                            ) {
                                match.winner = match.opponent1 === null ? match.opponent2 : match.opponent1
                                if (parentMatch.opponent1 === null) {
                                    parentMatch.opponent1 = match.winner
                                } else if (parentMatch.opponent2 === null) {
                                    parentMatch.opponent2 = match.winner
                                }
                                continue
                            }

                            if (match.opponent1 === null && match.opponent2 === null) {
                                continue
                            }

                            const winnerId = winner === 0 ? match.opponent1 : match.opponent2
                            if (parentMatch.opponent1 === null) {
                                parentMatch.opponent1 = winnerId
                            } else if (parentMatch.opponent2 === null) {
                                parentMatch.opponent2 = winnerId
                            }
                            match.winner = winnerId
                        }
                    }
                }

                if (tournamentWinner === null) {
                    console.log('Tournament winner is: ' + tournamentWinner)
                    console.log('Bracket: ' + JSON.stringify(bracket))
                }

                chai.assert(tournamentWinner !== null)
            }
        }
    })
})
