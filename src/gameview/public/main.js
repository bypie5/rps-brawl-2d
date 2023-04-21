const sessionContext = {
    authToken: null,
    username: null,
    sessionId: null,
    sessionJoinCode: null,
    sessionInfo: {
        host: null,
        config: null,
        connectedPlayers: null,
        hasMatchStarted: false,
        state: null,
        latestReceivedGameState: null,
        latestReceivedGameStateTick: -1,
        entitiesInScene: new Map(), // Map<entityId, components>
        threeJsIdToEntityId: new Map(), // Map<threeJsId, entityId>
        renderer: null, // GameRenderer
        playersAvatarId: null,
    },
    ws: null,
    isWsConnectionAnonymous: true,
    isWsConnectedToSession: false,
}

const wsUrl = 'ws://localhost:8081'

const pages = {
    login: 'loginPage.html',
    findMatch: 'findMatch.html',
    gameroomLobby: 'gameroomLobby.html',
    gameroom: 'gameroom.html',
}

async function _upgradeWsConnection (retriesLeft = 3) {
    if (sessionContext.isWsConnectionAnonymous === false) {
        return true
    }

    if (retriesLeft === 0) {
        console.error('Failed to upgrade websocket connection')
        return false
    }

    if (!sessionContext.ws || sessionContext.ws.readyState !== WebSocket.OPEN) {
        console.warn('Websocket connection not open, skipping upgrade')
        return false
    }

    sessionContext.ws.send(JSON.stringify({
        type: "UPGRADE_ANONYMOUS_WS",
        authToken: sessionContext.authToken
    }))

    if (sessionContext.isWsConnectionAnonymous === false) {
        return true
    }

    let waitTimeout = new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, 2500)
    })
    await waitTimeout

    return _upgradeWsConnection(retriesLeft - 1)
}

async function _onWsOpen (event) {
    console.log('Websocket connection opened')
    if (!sessionContext.authToken) {
        console.warn('No auth token found, skipping upgrade')
        return
    }

    const upgraded = await _upgradeWsConnection()
    if (!upgraded) {
        console.warn('Failed to upgrade websocket connection')
        return
    }
}

function _connectWsToSession (sessionId) {
    sessionContext.ws.send(JSON.stringify({
        type: "CONNECT_TO_SESSION",
        sessionId: sessionId,
        friendlyName: sessionContext.sessionJoinCode
    }))
}

function _sendMoveCommand (entityId, direction) {
    sessionContext.ws.send(JSON.stringify({
        type: "GAMEPLAY_COMMAND",
        gameplayCommandType: "MOVE",
        payload: {
            entityId,
            direction
        }
    }))
}

function _stopMoveCommand (entityId, direction) {
    sessionContext.ws.send(JSON.stringify({
        type: "GAMEPLAY_COMMAND",
        gameplayCommandType: "STOP",
        payload: {
            entityId,
            direction
        }
    }))
}

function _shiftRpsState (entityId, direction) {
    if (direction === 'LEFT') {
        sessionContext.ws.send(JSON.stringify({
            type: "GAMEPLAY_COMMAND",
            gameplayCommandType: "STATE_SHIFT_LEFT",
            payload: {
                entityId,
            }
        }))
    }

    if (direction === 'RIGHT') {
        sessionContext.ws.send(JSON.stringify({
            type: "GAMEPLAY_COMMAND",
            gameplayCommandType: "STATE_SHIFT_RIGHT",
            payload: {
                entityId,
            }
        }))
    }
}

function _onMessage (event) {
    const msg = JSON.parse(event.data)

    switch (msg.type) {
        case "UPGRADED_WS_CONNECTION":
            sessionContext.isWsConnectionAnonymous = false
            break
        case "WELCOME":
            const { id } = msg
            if (id !== sessionContext.sessionId) {
                console.log('Received WELCOME message for wrong session')
                return
            }

            sessionContext.isWsConnectedToSession = true
            break
        case "MATCH_STARTED":
            sessionContext.sessionInfo.hasMatchStarted = true
            break
        case "ERROR":
            console.log('Received error message: ' + msg.message)
            break
        case "GAMESTATE_UPDATE":
            const { gameContext } = msg
            if (!gameContext) {
                console.log('Received GAMESTATE_UPDATE message with no gameContext')
                return
            }

            if (gameContext.currentTick >= sessionContext.sessionInfo.latestReceivedGameStateTick) {
                sessionContext.sessionInfo.latestReceivedGameState = gameContext
                sessionContext.sessionInfo.latestReceivedGameStateTick = gameContext.currentTick

                _pruneEntitiesInScene()
            }
            break
        default:
            console.log('Unknown message type: ' + msg.type)
            break
    }
}

function _openWebSocket () {
    sessionContext.ws = new WebSocket(wsUrl)

    // upgrade anonymous websocket connection sending message with auth token
    sessionContext.ws.addEventListener('open', _onWsOpen)
    sessionContext.ws.addEventListener('message', _onMessage)
}

function _onLoginLoaded () {
}

function _onFindMatchLoaded () {
}

function _onGameroomLobbyLoaded () {
    _connectWsToSession(sessionContext.sessionId)
    const poll = setInterval(async () => {
        // poll for session info
        const sessionId = sessionContext.sessionId
        const res = await fetch(`/api/game-session/session-info?sessionId=${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            }
        })
    
        const { host, config, connectedPlayers, state } = await res.json()
        sessionContext.sessionInfo.host = host
        sessionContext.sessionInfo.config = config
        sessionContext.sessionInfo.connectedPlayers = connectedPlayers
        sessionContext.sessionInfo.state = state
        _redrawPage(pages.gameroomLobby)

        if (sessionContext.sessionInfo.state === 'IN_PROGRESS') {
            clearInterval(poll)
            await _loadHtmlContent(pages.gameroom)
        }
    }, 2500)
}

async function _onGameroomLoaded () {
    try {
        const renderer = await startRenderer(sessionContext.sessionInfo.config, sessionContext.username, sessionContext.sessionInfo)
        sessionContext.sessionInfo.renderer = renderer

        // add event listeners for player input
        document.addEventListener('keydown', (event) => {
            if (event.key === 'w') {
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'up')
            }
            
            if (event.key === 'a') {
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'left')
            }
            
            if (event.key === 's') {
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'down')
            }
            
            if (event.key === 'd') {
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'right')
            }
        })

        document.addEventListener('keyup', (event) => {
            if (event.key === 'w') {
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'up')
            }
            
            if (event.key === 'a') {
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'left')
            }
            
            if (event.key === 's') {
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'down')
            }
            
            if (event.key === 'd') {
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'right')
            }

            if (event.key === 'q') {
                _shiftRpsState(sessionContext.sessionInfo.playersAvatarId, 'LEFT')
            }

            if (event.key === 'e') {
                _shiftRpsState(sessionContext.sessionInfo.playersAvatarId, 'RIGHT')
            }
        })
    } catch (e) {
        console.log(e)
        alert('Failed to start renderer :(')
    }
}

function _pruneEntitiesInScene () {
    const { entities } = sessionContext.sessionInfo.latestReceivedGameState
    for (const entity of Object.entries(entities)) {
        const [entityId, entityComponents] = entity
        if (!sessionContext.sessionInfo.entitiesInScene.has(entityId)) {
            // new entity, add to scene
            sessionContext.sessionInfo.entitiesInScene.set(entityId, entityComponents)

            if (entityComponents.Avatar && entityComponents.Avatar.playerId === sessionContext.username) {
                sessionContext.sessionInfo.playersAvatarId = entityId
            }
        }

        // add to renderer
        if (sessionContext.sessionInfo.renderer && !sessionContext.sessionInfo.renderer.isEntityInScene(entityId)) {
            const threeJsId = sessionContext.sessionInfo.renderer.onEntityAdded(entityId, entityComponents, entities)
            sessionContext.sessionInfo.threeJsIdToEntityId.set(threeJsId, entityId)
        } else if (sessionContext.sessionInfo.renderer) {
            sessionContext.sessionInfo.renderer.onEntityUpdated(entityId, entityComponents, entities, sessionContext.sessionInfo.latestReceivedGameStateTick)
        }

        // update components
        sessionContext.sessionInfo.entitiesInScene.set(entityId, entityComponents)

    }

    // entity no longer exists, remove from scene
    for (const [entityId, entityComponents] of sessionContext.sessionInfo.entitiesInScene) {
        if (!entities[entityId]) {
            sessionContext.sessionInfo.entitiesInScene.delete(entityId)

            // remove from renderer
            if (sessionContext.sessionInfo.renderer) {
                sessionContext.sessionInfo.renderer.onEntityRemoved(entityId)
            }
        }
    }
}

function _onPageLoaded (pageName) {
    switch (pageName) {
        case pages.login:
            _onLoginLoaded()
            break
        case pages.findMatch:
            _onFindMatchLoaded()
            break
        case pages.gameroomLobby:
            _onGameroomLobbyLoaded()
            break
        case pages.gameroom:
            _onGameroomLoaded()
            break
        default:
            console.log('Unknown page: ' + pageName)
            break
    }
}

function _compileTemplates (doc, pageName) {
    function findAndReplaceTemplates (doc, templates) {
        for (const id in templates) {
            let content = doc.getElementById(id).innerHTML
            const re = new RegExp(/{{[a-z]*}}/)
            let result
            do {
                result = re.exec(content)
                if (result) {
                    for (const match of result) {
                        let tag = match
                        tag = tag.split('}}')[0]
                        tag += '}}'
                        const replacement = templates[id](tag)
                        content = content.replace(tag, replacement)
                        doc.getElementById(id).innerHTML = content
                    }
                }
            } while (result)
        }
    }

    switch (pageName) {
        case pages.login:
            break
        case pages.findMatch:
            findAndReplaceTemplates(
                doc, {
                    'find-match-welcome-msg': (tag) => {
                        if (tag === '{{username}}') {
                            return getSessionContext().username
                        }
                        return tag
                    }
                }
            )
            break
        case pages.gameroomLobby:
            findAndReplaceTemplates(
                doc, {
                    'gameroom-lobby-matchcode': (tag) => {
                        if (tag === '{{matchcode}}') {
                            return getSessionContext().sessionJoinCode
                        }
                        return tag
                    },
                    'gameroom-subtext': (tag) => {
                        if (tag === '{{mapname}}') {
                            return getSessionContext().sessionInfo.config.map
                        }

                        if (tag === '{{sessionhost}}') {
                            return getSessionContext().sessionInfo.host
                        }

                        if (tag === '{{connectedplayers}}') {
                            return getSessionContext().sessionInfo.connectedPlayers.length
                        }

                        if (tag === '{{maxplayers}}') {
                            return getSessionContext().sessionInfo.config.maxPlayers
                        }

                        return tag.replace('{{', '').replace('}}', '')
                    },
                    'gameroom-connectplayers': (tag) => {
                        if (tag === '{{connectedplayernames}}') {
                            return getSessionContext().sessionInfo.connectedPlayers.join(', ')
                        }

                        return tag.replace('{{', '').replace('}}', '')
                    }
                }
            )
            break
        case pages.gameroom:
            break
        default:
            throw new Error(`Invalid page name: ${pageName}`)
    }

    return doc
}

async function _loadHtmlContent (pageName) {
    const res = await fetch("/" + pageName)
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    _replacePage(_compileTemplates(doc, pageName, html))
    _onPageLoaded(pageName)
}

async function _redrawPage (pageName) {
    const res = await fetch(pageName)
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    _replacePage(_compileTemplates(doc, pageName, html))
}

function _replaceBody (newBody) {
    const fragment = document.createDocumentFragment()
    while (newBody.firstChild) {
        fragment.appendChild(newBody.firstChild)
    }
    
    document.body.replaceChildren(fragment)
}

function _replacePage (doc) {
    const body = doc.body

    _replaceBody(body)
}

function getSessionContext () {
    return sessionContext
}

window.getSessionContext = getSessionContext

function onRouteLoad () {
    checkIsAuthenticated()
}

window.onRouteLoad = onRouteLoad

/*
* redirects user to login page if not authenticated
*/
async function checkIsAuthenticated () {
    if (!sessionContext.authToken) {
        await _loadHtmlContent(pages.login)
    }
}

window.checkIsAuthenticated = checkIsAuthenticated

async function login (e) {
    e.preventDefault()

    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    try {
        const res = await fetch(`/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        })

        if (res.status === 200) {
            const { authToken } = await res.json()
            sessionContext.authToken = authToken
            sessionContext.username = username
            _openWebSocket()
            await _loadHtmlContent(pages.findMatch)
        } else {
            alert('Login failed - invalid credentials')
        }
    } catch (err) {
        console.error(err)
        alert('Login failed - server error')
    }    
}

window.login = login

async function createPrivateMatch (event) {
    event.preventDefault()

    try {
        const res = await fetch(`/api/game-session/create-private-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            },
            body: JSON.stringify({
                config: {
                    maxPlayers: 10,
                    map: "map0"
                }
            })
        })

        if (res.status !== 200) {
            alert(`Failed to create match - ${res.statusText}`)
            return
        }

        const { friendlyName } = await res.json()
        _joinPrivateSession(friendlyName)
    } catch (err) {
        console.error(err)
        alert('Failed to create match')
    }
}

async function joinPrivateMatch (event) {
    event.preventDefault()

    const matchId = document.getElementById('private-match-id-input').value
    try {
        _joinPrivateSession(matchId)
    } catch (err) {
        console.error(err)
        alert('Failed to join match')
    }
}

window.joinPrivateMatch = joinPrivateMatch

async function startMatch (event) {
    event.preventDefault()
    
    try {
        const res = await fetch(`/api/game-session/start-session?sessionId=${sessionContext.sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            }
        })

        if (res.status !== 200) {
            alert(`Failed to start match - ${res.statusText}`)
            return
        }

        console.log('Match started')
    } catch (err) {
        console.error(err)
        alert('Failed to start match - ' + err)
    }
}

window.startMatch = startMatch

async function addBot (event) {
    event.preventDefault()

    try {
        const res = await fetch('/api/game-session/invite-agent-to-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            },
            body: JSON.stringify({
                sessionId: sessionContext.sessionId,
            })
        })

        if (res.status !== 200) {
            alert(`Failed to add bot - ${res.statusText}`)
            return
        }

        console.log('Bot added')
    } catch (err) {
        console.error(err)
        alert('Failed to add bot - ' + err)
    }
}

async function _joinPrivateSession (friendlyName) {
    const res = await fetch(`/api/game-session/join-private-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionContext.authToken}`,
        },
        body: JSON.stringify({
            friendlyName: friendlyName
        })
    })

    if (res.status !== 200) {
        alert(`Failed to join match - ${res.statusText}`)
        return
    }

    const { sessionId } = await res.json()
    sessionContext.sessionJoinCode = friendlyName
    _getSessionInfo(sessionId)
}

async function _getSessionInfo (sessionId) {
    sessionContext.sessionId = sessionId

    const res = await fetch(`/api/game-session/session-info?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionContext.authToken}`,
        }
    })

    const { host, config, connectedPlayers } = await res.json()
    sessionContext.sessionInfo.host = host
    sessionContext.sessionInfo.config = config
    sessionContext.sessionInfo.connectedPlayers = connectedPlayers

    await _loadHtmlContent(pages.gameroomLobby)
}
