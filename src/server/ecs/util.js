const directionEnum = {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
}

function shiftRps (currRpsState, direction) {
    if (!directionEnum[direction]) {
        throw new Error(`Invalid direction: ${direction}`)
    }

    const rpsGraph = {
        'rock': {
            [directionEnum.LEFT]: 'scissors',
            [directionEnum.RIGHT]: 'paper',
        },
        'paper': {
            [directionEnum.LEFT]: 'rock',
            [directionEnum.RIGHT]: 'scissors',
        },
        'scissors': {
            [directionEnum.LEFT]: 'paper',
            [directionEnum.RIGHT]: 'rock',
        }
    }

    if (!rpsGraph[currRpsState]) {
        throw new Error(`Invalid rps state: ${currRpsState}`)
    }

    return rpsGraph[currRpsState][direction]
}

module.exports = {
    directionEnum,
    shiftRps,
}
