const chai = require('chai')

const {
    resolveClusterMembers,
    createTieBreakerBracket,
    findEntityCenterOfCluster,
    _advanceWinnersToNextRound,
    midMatchTieBreakerFSM
} = require('../src/server/ecs/util')
const {
    buildPlayerEntity,
    buildTieBreakerManagerEntity
} = require('../src/server/ecs/entities')

function mockGameContext () {
    return {
        _mockEntityId: 0,
        currentTick: 0,
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

    it('createTieBreakerBracket created expected bracket in simple cases', () => {
        let tournamentMembers = [1, 2, 3, 4]
        const bracket = createTieBreakerBracket(tournamentMembers)

        chai.expect(bracket.length).to.be.equal(2)
        chai.expect(bracket[0].length).to.be.equal(2)
        chai.expect(bracket[1].length).to.be.equal(1)

        chai.expect(bracket[0][0].opponent1).to.not.be.null
        chai.expect(bracket[0][0].opponent2).to.not.be.null
        chai.expect(bracket[0][1].opponent1).to.not.be.null
        chai.expect(bracket[0][1].opponent2).to.not.be.null

        chai.expect(bracket[1][0].opponent1).to.be.null
        chai.expect(bracket[1][0].opponent2).to.be.null

        let tournamentMembers2 = [1, 2, 3, 4, 5]
        const bracket2 = createTieBreakerBracket(tournamentMembers2)

        chai.expect(bracket2.length).to.be.equal(3)
        chai.expect(bracket2[0].length).to.be.equal(4)
        chai.expect(bracket2[1].length).to.be.equal(2)
        chai.expect(bracket2[2].length).to.be.equal(1)

        chai.expect(bracket2[0][0].opponent1).to.be.null
        chai.expect(bracket2[0][0].opponent2).to.be.null
        chai.expect(bracket2[0][1].opponent1).to.be.null
        chai.expect(bracket2[0][1].opponent2).to.be.null
        chai.expect(bracket2[0][2].opponent1).to.be.null
        chai.expect(bracket2[0][2].opponent2).to.be.null
        chai.expect(bracket2[0][3].opponent1).to.not.be.null
        chai.expect(bracket2[0][3].opponent2).to.not.be.null

        chai.expect(bracket2[1][0].opponent1).to.not.be.null
        chai.expect(bracket2[1][0].opponent2).to.not.be.null
        chai.expect(bracket2[1][1].opponent1).to.not.be.null
        chai.expect(bracket2[1][1].opponent2).to.be.null

        chai.expect(bracket2[2][0].opponent1).to.be.null
        chai.expect(bracket2[2][0].opponent2).to.be.null

        let tournamentMembers3 = [1, 2, 3, 4, 5, 6, 7, 8]

        const bracket3 = createTieBreakerBracket(tournamentMembers3)

        chai.expect(bracket3.length).to.be.equal(3)
        chai.expect(bracket3[0].length).to.be.equal(4)
        chai.expect(bracket3[1].length).to.be.equal(2)
        chai.expect(bracket3[2].length).to.be.equal(1)

        chai.expect(bracket3[0][0].opponent1).to.not.be.null
        chai.expect(bracket3[0][0].opponent2).to.not.be.null
        chai.expect(bracket3[0][1].opponent1).to.not.be.null
        chai.expect(bracket3[0][1].opponent2).to.not.be.null
        chai.expect(bracket3[0][2].opponent1).to.not.be.null
        chai.expect(bracket3[0][2].opponent2).to.not.be.null
        chai.expect(bracket3[0][3].opponent1).to.not.be.null
        chai.expect(bracket3[0][3].opponent2).to.not.be.null

        chai.expect(bracket3[1][0].opponent1).to.be.null
        chai.expect(bracket3[1][0].opponent2).to.be.null
        chai.expect(bracket3[1][1].opponent1).to.be.null
        chai.expect(bracket3[1][1].opponent2).to.be.null

        chai.expect(bracket3[2][0].opponent1).to.be.null
        chai.expect(bracket3[2][0].opponent2).to.be.null
        

        let tournamentMembers4 = [1, 2, 3, 4, 5, 6]

        const bracket4 = createTieBreakerBracket(tournamentMembers4)

        chai.expect(bracket4.length).to.be.equal(3)
        chai.expect(bracket4[0].length).to.be.equal(4)
        chai.expect(bracket4[1].length).to.be.equal(2)
        chai.expect(bracket4[2].length).to.be.equal(1)

        chai.expect(bracket4[0][0].opponent1).to.be.null
        chai.expect(bracket4[0][0].opponent2).to.be.null
        chai.expect(bracket4[0][1].opponent1).to.be.null
        chai.expect(bracket4[0][1].opponent2).to.be.null
        chai.expect(bracket4[0][2].opponent1).to.not.be.null
        chai.expect(bracket4[0][2].opponent2).to.not.be.null
        chai.expect(bracket4[0][3].opponent1).to.not.be.null
        chai.expect(bracket4[0][3].opponent2).to.not.be.null

        chai.expect(bracket4[1][0].opponent1).to.not.be.null
        chai.expect(bracket4[1][0].opponent2).to.not.be.null
        chai.expect(bracket4[1][1].opponent1).to.be.null
        chai.expect(bracket4[1][1].opponent2).to.be.null

        chai.expect(bracket4[2][0].opponent1).to.be.null
        chai.expect(bracket4[2][0].opponent2).to.be.null

        let tournamentMembers5 = [1, 2, 3]

        const bracket5 = createTieBreakerBracket(tournamentMembers5)

        chai.expect(bracket5.length).to.be.equal(2)
        chai.expect(bracket5[0].length).to.be.equal(2)
        chai.expect(bracket5[1].length).to.be.equal(1)
        
        chai.expect(bracket5[0][0].opponent1).to.be.null
        chai.expect(bracket5[0][0].opponent2).to.be.null
        chai.expect(bracket5[0][1].opponent1).to.not.be.null
        chai.expect(bracket5[0][1].opponent2).to.not.be.null

        chai.expect(bracket5[1][0].opponent1).to.not.be.null
        chai.expect(bracket5[1][0].opponent2).to.be.null

        let tournamentMembers6 = [1, 2, 3, 4, 5, 6, 7]

        const bracket6 = createTieBreakerBracket(tournamentMembers6)

        chai.expect(bracket6.length).to.be.equal(3)
        chai.expect(bracket6[0].length).to.be.equal(4)
        chai.expect(bracket6[1].length).to.be.equal(2)
        chai.expect(bracket6[2].length).to.be.equal(1)

        chai.expect(bracket6[0][0].opponent1).to.be.null
        chai.expect(bracket6[0][0].opponent2).to.be.null
        chai.expect(bracket6[0][1].opponent1).to.not.be.null
        chai.expect(bracket6[0][1].opponent2).to.not.be.null
        chai.expect(bracket6[0][2].opponent1).to.not.be.null
        chai.expect(bracket6[0][2].opponent2).to.not.be.null
        chai.expect(bracket6[0][3].opponent1).to.not.be.null
        chai.expect(bracket6[0][3].opponent2).to.not.be.null

        chai.expect(bracket6[1][0].opponent1).to.not.be.null
        chai.expect(bracket6[1][0].opponent2).to.be.null
        chai.expect(bracket6[1][1].opponent1).to.be.null
        chai.expect(bracket6[1][1].opponent2).to.be.null

        chai.expect(bracket6[2][0].opponent1).to.be.null
        chai.expect(bracket6[2][0].opponent2).to.be.null
    })

    it('createTieBreakerBracket returns expected bracket', () => {
        for (let i = 3; i < 512; i++) {
            for (let j = 0; j < 10; j++) {
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
                for (let x = 0; x < bracket.length; x++) {
                    const round = bracket[x]
                    for (let j = 0; j < round.length; j++) {
                        const match = round[j]
                        if (match) {
                            const winner = Math.random() > 0.5 ? 0 : 1
                            if (!match.parentMatchId) {
                                tournamentWinner = winner === 0 ? match.opponent1 : match.opponent2
                                match.winner = tournamentWinner
                                break
                            }

                            if (match.opponent1 === null && match.opponent2 === null) {
                                continue
                            }

                           match.winner = winner === 0 ? match.opponent1 : match.opponent2
                        }
                    }

                    if (x < bracket.length - 1) {
                        _advanceWinnersToNextRound(bracket, x + 2)
                    }
                }

                if (tournamentWinner === null) {
                    console.log('Tournament winner is: ' + tournamentWinner)
                    console.log('Bracket: ' + JSON.stringify(bracket))
                    console.log(`Tournament members: ${tournamentMembers.length}`)
                }

                chai.assert(tournamentWinner !== null)
            }
        }
    })

    it('findEntityCenterOfCluster returns expected entity for simple cluster', () => {
        const mockContext = mockGameContext()

        // players aligned on x axis all touching
        const player1Mock = buildPlayerEntity('player1', 0, 0)
        const player2Mock = buildPlayerEntity('player2', -3, 0)
        const player3Mock = buildPlayerEntity('player3', 3, 0)

        const player1Id = mockContext._addEntity(mockContext, player1Mock)
        const player2Id = mockContext._addEntity(mockContext, player2Mock)
        const player3Id = mockContext._addEntity(mockContext, player3Mock)

        player1Mock.Avatar.stateData.collisionsWithOtherPlayers = [player2Id, player3Id]
        player2Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id]
        player3Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id]

        const membersInCluster = resolveClusterMembers(player1Mock, player1Id, mockContext)

        const { closestEntityId } = findEntityCenterOfCluster(membersInCluster, mockContext)

        chai.expect(closestEntityId).to.be.equal(player1Id)
    })

    it('midMatchTieBreakerFSM returns expected winner in simple case', () => {
        const mockContext = mockGameContext()

        // players aligned on x axis all touching ([2][1][3][4])
        const player1Mock = buildPlayerEntity('player1', 0, 0)
        const player2Mock = buildPlayerEntity('player2', -3, 0)
        const player3Mock = buildPlayerEntity('player3', 3, 0)
        const player4Mock = buildPlayerEntity('player4', 6, 0)

        const player1Id = mockContext._addEntity(mockContext, player1Mock)
        const player2Id = mockContext._addEntity(mockContext, player2Mock)
        const player3Id = mockContext._addEntity(mockContext, player3Mock)
        const player4Id = mockContext._addEntity(mockContext, player4Mock)

        player1Mock.Avatar.stateData.collisionsWithOtherPlayers = [player2Id, player3Id]
        player2Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id]
        player3Mock.Avatar.stateData.collisionsWithOtherPlayers = [player1Id, player4Id]
        player4Mock.Avatar.stateData.collisionsWithOtherPlayers = [player3Id]

        const membersInCluster = resolveClusterMembers(player1Mock, player1Id, mockContext)
        const bracketManager = buildTieBreakerManagerEntity(membersInCluster, 0, 0, 0)

        bracketManager.TieBreaker.tournamentBracket = createTieBreakerBracket(bracketManager.TieBreaker.idsOfCohortMembers)
        
        mockContext._addEntity(mockContext, bracketManager)

        const { tournamentBracket, tieBreakerState } = bracketManager.TieBreaker
        chai.expect(tournamentBracket[0].length).to.be.equal(2)
        chai.expect(tournamentBracket[1].length).to.be.equal(1)

        // make all players tie
        player1Mock.Avatar.stateData.rockPaperScissors = 'rock'
        player2Mock.Avatar.stateData.rockPaperScissors = 'rock'
        player3Mock.Avatar.stateData.rockPaperScissors = 'rock'
        player4Mock.Avatar.stateData.rockPaperScissors = 'rock'

        const playerOnesRound1Match = (tournamentBracket[0][0].opponent1 === player1Id || tournamentBracket[0][0].opponent2 === player1Id) ? tournamentBracket[0][0] : tournamentBracket[0][1]
        const opponentOfPlayerOnesRound1Match = playerOnesRound1Match.opponent2 !== player1Id ? playerOnesRound1Match.opponent2 : playerOnesRound1Match.opponent1
        const notOpponetsOfPlayerOnesRound1Match = [player2Id, player3Id, player4Id].filter(id => id !== opponentOfPlayerOnesRound1Match)

        let tournamentFinished = false
        function _invokeFsm () {
            midMatchTieBreakerFSM(bracketManager, mockContext, () => {
                chai.expect(bracketManager.TieBreaker.tournamentBracket[1][0].winner).to.be.equal(player1Id)
                tournamentFinished = true
            })
        }

        while (tieBreakerState.currRoundTick < tieBreakerState.currRoundMaxTicks) {
            _invokeFsm()
        }

        _invokeFsm()

        // there is a tie in the first round, play round 1 again
        chai.expect(tieBreakerState.currRound).to.be.equal(1)

        // replay of round 1 will start after delay by ticksBetweenRounds
        while (tieBreakerState.interRoundTicks < tieBreakerState.ticksBetweenRounds) {
            _invokeFsm()
        }

        // replay of round 1
        player1Mock.Avatar.stateData.rockPaperScissors = 'paper' // player 1 should win round 1

        const nextWinnerOfRound1 = notOpponetsOfPlayerOnesRound1Match[0]
        mockContext.entities[nextWinnerOfRound1].Avatar.stateData.rockPaperScissors = 'paper' // player 2 should win round 1

        while (tieBreakerState.currRoundTick < tieBreakerState.currRoundMaxTicks) {
            _invokeFsm()
        }

        _invokeFsm()

        // round 2 will start after delay by ticksBetweenRounds
        while (tieBreakerState.interRoundTicks < tieBreakerState.ticksBetweenRounds) {
            _invokeFsm()
        }

        chai.expect(tieBreakerState.currRound).to.be.equal(2)

        // round 2
        player1Mock.Avatar.stateData.rockPaperScissors = 'scissors' // player 1 should win round 2
        mockContext.entities[nextWinnerOfRound1].Avatar.stateData.rockPaperScissors = 'paper' // player 2 should lose round 2

        while (tieBreakerState.currRoundTick < tieBreakerState.currRoundMaxTicks) {
            _invokeFsm()
        }

        while (bracketManager.TieBreaker.state !== 'finished') {
            _invokeFsm()
        }
        _invokeFsm()

        chai.expect(tournamentFinished).to.be.true
    })
})
