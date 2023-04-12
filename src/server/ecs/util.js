const directionEnum = {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
}

// rules for rock paper scissors
// and describes how players can shift their rps state
const rpsGraph = {
    'rock': {
        [directionEnum.LEFT]: 'scissors',
        [directionEnum.RIGHT]: 'paper',
        superiorNeighbor: 'paper',
        inferiorNeighbor: 'scissors'
    },
    'paper': {
        [directionEnum.LEFT]: 'rock',
        [directionEnum.RIGHT]: 'scissors',
        superiorNeighbor: 'scissors',
        inferiorNeighbor: 'rock'
    },
    'scissors': {
        [directionEnum.LEFT]: 'paper',
        [directionEnum.RIGHT]: 'rock',
        superiorNeighbor: 'rock',
        inferiorNeighbor: 'paper'
    }
}

/*
    * @param {string} rps1 - the first rock paper scissors state
    * @param {string} rps2 - the second rock paper scissors state
    * -1 if rps1 is inferior to rps2 (rps2 beats rps1)
    * 0 if rps1 is equal to rps2 (tie)
    * 1 if rps1 is superior to rps2 (rps1 beats rps2)
    * 
    * @returns {number} the comparison result
*/
function rpsCompare (rps1, rps2) {
    if (rps1 === rps2) {
        return 0
    }

    if (rpsGraph[rps1].superiorNeighbor === rps2) {
        return -1
    }

    if (rpsGraph[rps1].inferiorNeighbor === rps2) {
        return 1
    }

    throw new Error(`Invalid rps states: ${rps1}, ${rps2}`)
}

/*
    * @param {string} currRpsState - the current rock paper scissors state
    * @param {string} direction - the direction to shift the rps state
    * 
    * @returns {string} the new rps state
*/
function shiftRps (currRpsState, direction) {
    if (!directionEnum[direction]) {
        throw new Error(`Invalid direction: ${direction}`)
    }

    if (!rpsGraph[currRpsState]) {
        throw new Error(`Invalid rps state: ${currRpsState}`)
    }

    return rpsGraph[currRpsState][direction]
}

/*
    * @param {object} avatarEntity - the entity with Avatar component to replace the set with
    * @param {array} newItems - the new items to replace the set with
*/
function replaceCollisionsWithOtherPlayersSet (avatarEntity, newItems) {
    avatarEntity.Avatar.stateData.collisionsWithOtherPlayers = newItems
}

// cluster collision is when multiple players are colliding with each other
// these kinds of collision need to be resolved with tiebreakers
function resolveClusterMembers(avatarEntity, avatarEntityId, gameContext, clusterMemberIds = new Set()) {
    if (clusterMemberIds.has(avatarEntityId)) {
        return Array.from(clusterMemberIds)
    }

    clusterMemberIds.add(avatarEntityId)

    const ids = avatarEntity.Avatar.stateData.collisionsWithOtherPlayers
    for (const id of ids) {
        const otherAvatarEntity = gameContext.entities[id]
        clusterMemberIds.add(id)

        for (const nextCandidateId of otherAvatarEntity.Avatar.stateData.collisionsWithOtherPlayers) {
            const nextCandidate = gameContext.entities[nextCandidateId]
            const otherMemberIds = resolveClusterMembers(nextCandidate, nextCandidateId, gameContext, clusterMemberIds)
            for (const otherMemberId of otherMemberIds) {
                clusterMemberIds.add(otherMemberId)
            }
        }
    }

    return Array.from(clusterMemberIds)
}

function _minimumSizedBoundingBox (clusterMemberIds, gameContext) {
    const minX = Math.min(...clusterMemberIds.map(id => gameContext.entities[id].Transform.xPos))
    const maxX = Math.max(...clusterMemberIds.map(id => gameContext.entities[id].Transform.xPos))
    const minY = Math.min(...clusterMemberIds.map(id => gameContext.entities[id].Transform.yPos))
    const maxY = Math.max(...clusterMemberIds.map(id => gameContext.entities[id].Transform.yPos))

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        center: {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
        }
    }
}

function findEntityCenterOfCluster (clusterMemberIds, gameContext) {
    const boundingBox = _minimumSizedBoundingBox(clusterMemberIds, gameContext)
    const { center } = boundingBox

    // find the entity closest to the center of the cluster
    let closestEntityId = null
    let closestDistance = Infinity
    for (const id of clusterMemberIds) {
        const entity = gameContext.entities[id]
        const distance = Math.sqrt(Math.pow(entity.Transform.xPos - center.x, 2) + Math.pow(entity.Transform.yPos - center.y, 2))
        if (distance < closestDistance) {
            closestDistance = distance
            closestEntityId = id
        }
    }

    return {
        closestEntityId,
        boundingBox
    }
}

function _nearestPowerOfTwo (n) {
    if (n % 2 !== 0) {
        return Math.pow(2, Math.floor(Math.log2(n)))
    } else {
        return Math.pow(2, Math.floor(Math.log2(n - 1)))
    }
}

function createTieBreakerBracket (clusterMemberIds) {
    const numberOfFirstRoundMatches = _nearestPowerOfTwo(clusterMemberIds.length)
    const numberOfByes = clusterMemberIds.length - numberOfFirstRoundMatches
    const numberOfRounds = Math.log2(numberOfFirstRoundMatches) + 1

    const bracket = []
    for (let round = 0; round < numberOfRounds; round++) {
        const matches = []
        for (let match = 0; match < numberOfFirstRoundMatches / Math.pow(2, round); match++) {
            matches.push({
                matchId: `${round}-${match}`,
                parentMatchId: round === numberOfRounds - 1 ? null : `${round + 1}-${Math.floor(match / 2)}`, 
                childrenMatchIds: round === 0 ? null : [`${round - 1}-${match * 2}`, `${round - 1}-${match * 2 + 1}`],
                opponent1: null,
                opponent2: null,
                winner: null,
            })
        }
        bracket.push(matches)
    }

    const playersInTourament = clusterMemberIds.slice() // copy
    const firstRoundByes = []
    for (let i = 0; i < numberOfByes; i++) {
        let randomIndex = Math.floor(Math.random() * playersInTourament.length)
        const byePlayerId = playersInTourament[randomIndex]

        playersInTourament.splice(randomIndex, 1) // pick without replacement

        firstRoundByes.push(byePlayerId)
    }

    const firstRoundOpponents = []
    for (let i = 0; i < numberOfFirstRoundMatches / 2; i++) {
        let randomIndex = Math.floor(Math.random() * playersInTourament.length)
        const opponent1Id = playersInTourament[randomIndex]

        playersInTourament.splice(randomIndex, 1)

        randomIndex = Math.floor(Math.random() * playersInTourament.length)
        const opponent2Id = playersInTourament[randomIndex]

        playersInTourament.splice(randomIndex, 1)

        firstRoundOpponents.push({opponent1Id, opponent2Id})
    }

    // fill in the first round matches
    for (let i = 0; i < bracket[0].length; i++) {
        const match = bracket[0][i]
        if (i < firstRoundByes.length) {
            match.opponent1 = firstRoundByes[i]
        } else {
            const opponents = firstRoundOpponents[i - firstRoundByes.length]
            if (!opponents) {
                continue
            }

            match.opponent1 = opponents.opponent1Id
            match.opponent2 = opponents.opponent2Id
        }
    }

    // move byes and matches with no sibbling match to the next round
    // a sibbling match is a match that has the same parent match
    function _getChildrenMatches (childrenIds) {
        const childrenMatches = []
        for (let i = 0; i < childrenIds.length; i++) {
            const childId = childrenIds[i]
            const childMatch = bracket[childId[0]][childId[2]]
            childrenMatches.push(childMatch)
        }
        return childrenMatches
    }

    const secondRoundMatches = bracket[1]
    for (let i = 0; i < secondRoundMatches.length; i++) {
        const match = secondRoundMatches[i]
        const childMatches = _getChildrenMatches(match.childrenMatchIds)
        const childOne = childMatches[0]
        const childTwo = childMatches[1]

        let shiftedBecauseOfBye = false
        if (childOne.opponent1 === null && childOne.opponent2 !== null) {
            // bye in child one
            match.opponent1 = childOne.opponent2
            childOne.opponent2 = null
            shiftedBecauseOfBye = true
        }

        if (childOne.opponent1 !== null && childOne.opponent2 === null) {
            // bye in child one
            match.opponent1 = childOne.opponent1
            childOne.opponent1 = null
            shiftedBecauseOfBye = true
        }

        if (childTwo.opponent1 === null && childTwo.opponent2 !== null) {
            // bye in child two
            match.opponent2 = childTwo.opponent2
            childTwo.opponent2 = null
            shiftedBecauseOfBye = true
        }

        if (childTwo.opponent1 !== null && childTwo.opponent2 === null) {
            // bye in child two
            match.opponent2 = childTwo.opponent1
            childTwo.opponent1 = null
            shiftedBecauseOfBye = true
        }

        if (shiftedBecauseOfBye) {
            continue
        }

        if (childOne.opponent1 === null && childOne.opponent2 === null
            && childTwo.opponent1 !== null && childTwo.opponent2 !== null) {
            // only child two has a pair of opponents
            match.opponent1 = childTwo.opponent1
            match.opponent2 = childTwo.opponent2
            childTwo.opponent1 = null
            childTwo.opponent2 = null
        }

        if (childTwo.opponent1 === null && childTwo.opponent2 === null
            && childOne.opponent1 !== null && childOne.opponent2 !== null) {
            // only child one has a pair of opponents
            match.opponent1 = childOne.opponent1
            match.opponent2 = childOne.opponent2
            childOne.opponent1 = null
            childOne.opponent2 = null
        }
    }
    return bracket
}

function midMatchTieBreakerFSM (tieBreakerEntity, gameContext) {
    const {
        state,
        tieBreakerState,
        tournamentBracket
    } = tieBreakerEntity.TieBreaker

    switch (state) {
        case 'init':
            tieBreakerState.currRound = 1
            state = 'playing'
            break
        case 'playing':
            // players in each round have currRoundMaxTicks ticks to
            // pick either rock, paper, or scissors. If they don't
            // pick anything, they are automatically assigned a random
            // choice. The winner of each match advances to the next round.

            // if there is a tie, the match is replayed, but currRoundMaxTicks
            // is divided by 1.25. This continues until there is a winner.
            if (tieBreakerState.interRoundTicks < tieBreakerState.ticksBetweenRounds) {
                // wait between rounds
                tieBreakerState.interRoundTicks++
                break
            }

            if (tieBreakerState.currRoundTick < tieBreakerState.currRoundMaxTicks) {
                // wait for players to make their choice
                tieBreakerState.currRoundTick++
                break
            }

            // all players have made their choice
            const matchWithTie = true

            // if there is a tie, replay the round with a shorter time limit
            if (matchWithTie) {
                tieBreakerState.currRoundMaxTicks = Math.floor(tieBreakerState.currRoundMaxTicks / 1.25)
                tieBreakerState.currRoundTick = 0
                tieBreakerState.interRoundTicks = 0
                break
            }

            // otherwise, advance to the next round
            tieBreakerState.currRound++
            tieBreakerState.currRoundMaxTicks = tieBreakerState.maxTicksPerRound
            tieBreakerState.currRoundTick = 0
            tieBreakerState.interRoundTicks = 0

            if (tieBreakerState.currRound > tournamentBracket.length) {
                // all rounds in the bracket are over
                state = 'finished'
            }
            break
        case 'finished':
            break
        default:
            console.log('unknown state', state)
            break
    }
}

module.exports = {
    directionEnum,
    rpsCompare,
    shiftRps,
    replaceCollisionsWithOtherPlayersSet,
    resolveClusterMembers,
    findEntityCenterOfCluster,
    midMatchTieBreakerFSM,
    createTieBreakerBracket
}
