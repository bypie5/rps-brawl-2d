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
function resolveClusterMembers(avatarEntity, gameContext, playerEntitiesByLogicalKey) {
    const ids = avatarEntity.Avatar.stateData.collisionsWithOtherPlayers
    const players = ids.map(id => gameContext.entities[id])

    return [avatarEntity, ...players]
}

module.exports = {
    directionEnum,
    rpsCompare,
    shiftRps,
    replaceCollisionsWithOtherPlayersSet,
    resolveClusterMembers
}
