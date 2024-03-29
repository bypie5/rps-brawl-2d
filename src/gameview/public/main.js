function deepCopy(obj) {
    var rv

    switch (typeof obj) {
        case "object":
            if (obj === null) {
                // null => null
                rv = null
            } else {
                switch (toString.call(obj)) {
                    case "[object Array]":
                        // It's an array, create a new array with
                        // deep copies of the entries
                        rv = obj.map(deepCopy)
                        break
                    case "[object Date]":
                        // Clone the date
                        rv = new Date(obj)
                        break
                    case "[object RegExp]":
                        // Clone the RegExp
                        rv = new RegExp(obj)
                        break
                    case "[object Map]":
                        // Clone the Map
                        rv = new Map(obj)
                        break
                    default:
                        // Some other kind of object, deep-copy its
                        // properties into a new object
                        rv = Object.keys(obj).reduce(function(prev, key) {
                            prev[key] = deepCopy(obj[key])
                            return prev
                        }, {})
                        break
                }
            }
            break
        default:
            // It's a primitive, copy via assignment
            rv = obj
            break
    }
    return rv
}

function numberSuffix(n) {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const defaultSessionContext = {
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
        cachedCheckpoint: null,
        entitiesInScene: new Map(), // Map<entityId, components>
        threeJsIdToEntityId: new Map(), // Map<threeJsId, entityId>
        renderer: null, // GameRenderer
        playersAvatarId: null,
        supportedAgentTypes: [],
        currentControlState: {
            up: false,
            down: false,
            left: false,
            right: false,
        }
    },
    ws: null,
    lastPingSeen: null,
    intervalBetweenHeartbeats: 25000,
    isWsConnectionAnonymous: true,
    isWsConnectedToSession: false,
    pageContextInjector: null,
    pageContext: null
}

let sessionContext = deepCopy(defaultSessionContext)

class PageContextInjector {
    constructor (sessionContext, defaultPageContext, onPopulate) {
        this.sessionContext = sessionContext
        this.defaultPageContext = defaultPageContext
        this.onPopulate = onPopulate

        this.sessionContext.pageContext = this.defaultPageContext
    }

    populate () {
        const newValue = this.onPopulate()

        if (newValue) {
            this.sessionContext.pageContext = newValue
        }
    }
}

const pages = {
    login: 'loginPage.html',
    findMatch: 'findMatch.html',
    gameroomLobby: 'gameroomLobby.html',
    gameroom: 'gameroom.html',
}

function _buildApiEndpoint (baseEndpoint) {
    const isExternalClient = window.isExternalClient
    if (isExternalClient) {
        return `${window.resourcePath}${baseEndpoint}`
    } else {
        return baseEndpoint
    }
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

    if (sessionContext.sessionId) {
        // Reconnect to session
        _connectWsToSession(sessionContext.sessionId)
    }
}

function _connectWsToSession (sessionId) {
    const payload = {
        type: "CONNECT_TO_SESSION",
        sessionId: sessionId
    }

    if (sessionContext.sessionJoinCode) {
        payload['friendlyName'] = sessionContext.sessionJoinCode
    }

    sessionContext.ws.send(JSON.stringify(payload))
}

function _sendGameplayCommand (command) {
    sessionContext.ws.send(JSON.stringify({
        type: "GAMEPLAY_COMMAND",
        ...command
    }))
}

function _sendMoveCommand (entityId, direction) {
    _sendGameplayCommand({
        gameplayCommandType: "MOVE",
        payload: {
            entityId,
            direction
        }
    })
}

function _stopMoveCommand (entityId, direction) {
    _sendGameplayCommand({
        gameplayCommandType: "STOP",
        payload: {
            entityId,
            direction
        }
    })
}

function _changeRpsState (entityId, state) {
    _sendGameplayCommand({
        gameplayCommandType: "STATE_CHANGE",
        payload: {
            entityId,
            state
        }
    })
}

async function _onMessage (event) {
    let msg
    try {
        msg = JSON.parse(event.data)
    } catch (e) {
        const data = await event.data.arrayBuffer()
        msg = JSON.parse(pako.inflate(data, { to: 'string' }))
    }

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

            if (msg.errorCode === 'INVALID_AUTH_TOKEN') {
                alert('Your session has expired, please login again')
                sessionContext.forceWsClose = true
                sessionContext.ws.close()
                await _loadHtmlContent(pages.login)
            }
            break
        case "GAMESTATE_UPDATE":
            if (!msg.gameContext) {
                console.log('Received GAMESTATE_UPDATE message with no gameContext')
                return
            }

            const { gameContext } = _rebuildGameContext(msg)
            if (!sessionContext.sessionInfo.cachedCheckpoint) {
                return // ignore game state updates until we have a checkpoint
            }

            const lastReceivedGameStateBroadcast = sessionContext.sessionInfo.latestReceivedGameState

            if (gameContext.currentTick >= sessionContext.sessionInfo.latestReceivedGameStateTick) {
                sessionContext.sessionInfo.latestReceivedGameState = gameContext
                sessionContext.sessionInfo.latestReceivedGameStateTick = gameContext.currentTick

                _pruneEntitiesInScene()
            }

            // detect if any new "events" have happened since last received game state
            if (sessionContext.sessionInfo.renderer) {
                _detectAndHandleGameEvents(lastReceivedGameStateBroadcast, gameContext)
            }
            break
        case "PING":
            sessionContext.ws.send(JSON.stringify({
                type: "PONG",
                message: "pong"
            }))
            const now = Date.now()
            sessionContext.lastPingSeen = now

            setTimeout(() => {
                // healthcheck to make sure we're still connected
                if (Date.now() - sessionContext.lastPingSeen > sessionContext.intervalBetweenHeartbeats + 125) {
                    console.log('Ping timeout')
                    sessionContext.ws.close()
                }
            }, sessionContext.intervalBetweenHeartbeats + 125)
            break
        case "DISCONNECTED":
            console.log('Disconnected from session')
            if (!msg.wasUserInitiated) {
                // display reason for disconnect if it wasn't user-initiated
                // since the player may not know why they were disconnected
                alert(msg.message)
            }
            await _loadHtmlContent(pages.findMatch)
            window.restartRenderer()
            sessionContext.sessionInfo = deepCopy(defaultSessionContext.sessionInfo)
            sessionContext.sessionId = null
            break
        default:
            console.log('Unknown message type: ' + msg.type)
            break
    }
}

function _rebuildGameContext (msg) {
    const { gameContext, isCheckpoint, removedEntities } = msg
    if (isCheckpoint) {
        sessionContext.sessionInfo.cachedCheckpoint = gameContext
        return msg
    }

    if (!sessionContext.sessionInfo.cachedCheckpoint) {
        throw new Error('Received non-checkpoint GAMESTATE_UPDATE message with no cached checkpoint')
    }

    const setOfRemovedEntities = new Set(removedEntities)
    for (const [id, entity] of Object.entries(sessionContext.sessionInfo.cachedCheckpoint.entities)) {
        if (setOfRemovedEntities.has(id)) {
            continue
        }

        if (!gameContext.entities[id]) {
            // entity is unchanged since last checkpoint
            gameContext.entities[id] = entity
        }
    }

    return msg
}

function _openWebSocket () {
    sessionContext.forceWsClose = false

    const hostname = window.location.hostname
    sessionContext.ws = new WebSocket(`ws://${hostname}:8081`)

    window.mainSocket = sessionContext.ws

    // upgrade anonymous websocket connection sending message with auth token
    sessionContext.ws.addEventListener('open', _onWsOpen)
    sessionContext.ws.addEventListener('message', _onMessage)

    sessionContext.ws.addEventListener('close', (event) => {
        sessionContext.isWsConnectionAnonymous = true
        sessionContext.isWsConnectedToSession = false
        sessionContext.lastPingSeen = null

        if (!sessionContext.forceWsClose) {
            setTimeout(() => {
                _openWebSocket()
            }, 3750)
        }
    })

    sessionContext.ws.addEventListener('error', (event) => {
        console.log('Websocket connection error', event)
        sessionContext.ws.close()
    })
}

function _onLoginLoaded () {
}

async function _onFindMatchLoaded () {
    // get supported agent types
    const url = _buildApiEndpoint('/api/game-session/supported-agents')
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionContext.authToken}`,
        }
    })
    const { supportedAgentTypes } = await res.json()
    sessionContext.sessionInfo.supportedAgentTypes = supportedAgentTypes
    await _redrawPage(pages.findMatch)

    if (document.getElementById('bot-type-select')) {
        document.onchange = () => {
            sessionContext.pageContext = {
                ...sessionContext.pageContext,
                selectedAgentType: document.getElementById('bot-type-select').value
            }
        }

        sessionContext.pageContext = {
            ...sessionContext.pageContext,
            selectedAgentType: document.getElementById('bot-type-select').value
        }
    }
}

async function _onGameroomLobbyLoaded () {
    _connectWsToSession(sessionContext.sessionId)

    const poll = setInterval(async () => {
        // poll for session info
        const sessionId = sessionContext.sessionId
        await loadSessionInfo(sessionId)
        await _redrawPage(pages.gameroomLobby)

        if (sessionContext.sessionInfo.state === 'IN_PROGRESS') {
            clearInterval(poll)
            await _loadHtmlContent(pages.gameroom)
        }
    }, 2500)
}

async function loadSessionInfo (sessionId) {
    const url = _buildApiEndpoint(`/api/game-session/session-info?sessionId=${sessionId}`)
    const res = await fetch(url, {
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
}

async function _onGameroomLoaded () {
    try {
        const renderer = await window.startRenderer(sessionContext.sessionInfo.config, sessionContext.username, sessionContext.sessionInfo)
        sessionContext.sessionInfo.renderer = renderer

        // add event listeners for player input
        document.addEventListener('keydown', (event) => {
            if ((event.key === 'w' || event.key === 'W') && !sessionContext.sessionInfo.currentControlState.up) {
                sessionContext.sessionInfo.currentControlState.up = true
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'up')
            }
            
            if ((event.key === 'a' || event.key === 'A') && !sessionContext.sessionInfo.currentControlState.left) {
                sessionContext.sessionInfo.currentControlState.left = true
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'left')
            }
            
            if ((event.key === 's' || event.key === 'S') && !sessionContext.sessionInfo.currentControlState.down) {
                sessionContext.sessionInfo.currentControlState.down = true
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'down')
            }
            
            if ((event.key === 'd' || event.key === 'D') && !sessionContext.sessionInfo.currentControlState.right) {
                sessionContext.sessionInfo.currentControlState.right = true
                _sendMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'right')
            }
        })

        document.addEventListener('keyup', (event) => {
            if (event.key === 'w' || event.key === 'W') {
                sessionContext.sessionInfo.currentControlState.up = false
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'up')
            }
            
            if (event.key === 'a' || event.key === 'A') {
                sessionContext.sessionInfo.currentControlState.left = false
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'left')
            }
            
            if (event.key === 's' || event.key === 'S') {
                sessionContext.sessionInfo.currentControlState.down = false
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'down')
            }
            
            if (event.key === 'd' || event.key === 'D') {
                sessionContext.sessionInfo.currentControlState.right = false
                _stopMoveCommand(sessionContext.sessionInfo.playersAvatarId, 'right')
            }

            if (event.key === 'j' || event.key === 'J') {
                _changeRpsState(sessionContext.sessionInfo.playersAvatarId, 'rock')
            }

            if (event.key === 'k' || event.key === 'K') {
                _changeRpsState(sessionContext.sessionInfo.playersAvatarId, 'paper')
            }

            if (event.key === 'l' || event.key === 'L') {
                _changeRpsState(sessionContext.sessionInfo.playersAvatarId, 'scissors')
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
                sessionContext.sessionInfo.renderer.onEntityRemoved(entityId, entityComponents, entities)
            }
        }
    }
}

function _detectAndHandleGameEvents (prevGameContext, currGameContext) {
    if (
      sessionContext.sessionInfo.playersAvatarId
      && (prevGameContext.entities[sessionContext.sessionInfo.playersAvatarId]
        && prevGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar.state === 'alive')
      && (currGameContext.entities[sessionContext.sessionInfo.playersAvatarId]
        && currGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar.state === 'respawning'
        && !currGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar.stateData.firstSpawn)
    ) {
        // player has died
        sessionContext.sessionInfo.renderer.pushToIntercomMsgQueue(new IntercomMsg(
          'You died!',
          'Respawning...',
          3000
        ))
    }

    if (
      sessionContext.sessionInfo.playersAvatarId
      && (!prevGameContext
        || (prevGameContext.entities[sessionContext.sessionInfo.playersAvatarId]
          && prevGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar.state !== 'spectating'))
      && (currGameContext.entities[sessionContext.sessionInfo.playersAvatarId]
        && currGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar.state === 'spectating')
    ) {
        // player has died
        const playerAvatar = currGameContext.entities[sessionContext.sessionInfo.playersAvatarId].Avatar
        sessionContext.sessionInfo.renderer.pushToIntercomMsgQueue(new IntercomMsg(
          `You were eliminated ${numberSuffix(playerAvatar.stateData.eliminationOrder)}!`,
          'Spectating...',
          3000
        ))
    }
}

function _onPageLoaded (pageName) {
    sessionContext.pageContext = null

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
    const isExternalClient = window.isExternalClient
    let pageUrl = null
    if (isExternalClient) {
        pageUrl = `${window.resourcePath}/${pageName}`
    } else {
        pageUrl = "/" + pageName
    }

    const res = await fetch(pageUrl)
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    _replacePage(_compileTemplates(doc, pageName, html))
    _onPageLoaded(pageName)
}

async function _redrawPage (pageName) {
    const isExternalClient = window.isExternalClient
    let pageUrl = null
    if (isExternalClient) {
        pageUrl = `${window.resourcePath}/${pageName}`
    } else {
        pageUrl = "/" + pageName
    }

    const res = await fetch(pageUrl)
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    _replacePage(_compileTemplates(doc, pageName, html))

    // re-inject session context
    if (sessionContext.pageContextInjector) {
        sessionContext.pageContextInjector.populate()
    }
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
        const url = _buildApiEndpoint('/api/user/login')
        const res = await fetch(url, {
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

async function continueAsGuest () {
    try {
        const url = _buildApiEndpoint('/api/user/temp-credentials')
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (res.status === 200) {
            const { authToken, username } = await res.json()
            sessionContext.authToken = authToken
            sessionContext.username = username
            _openWebSocket()
            await _loadHtmlContent(pages.findMatch)
        } else {
            alert('Failed to continue as guest')
        }
    } catch (err) {
        console.error(err)
        alert('Failed to continue as guest')
    }
}

window.continueAsGuest = continueAsGuest

function backToMainMenu () {
    disconnectFromSession()

    sessionContext.sessionInfo.renderer.stop()
    sessionContext.sessionInfo = deepCopy(defaultSessionContext.sessionInfo)

    sessionContext.sessionId = null
}

window.backToMainMenu = backToMainMenu

function showFeedbackDialog() {
    const dialog = document.getElementById("feedback-dialog")
    dialog.showModal()
}

window.showFeedbackDialog = showFeedbackDialog

async function submitFeedback(event) {
    event.preventDefault()

    const feedback = document.getElementById("feedback-text").value
    const type = document.getElementById("feedback-type").value

    const url = _buildApiEndpoint('/api/feedback/submit')
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            feedback: {
                type,
                message: feedback
            }
        })
    })

    if (res.status === 200) {
        alert('Thank you for your feedback!')
        hideFeedbackDialog()
    } else {
        alert('Failed to submit feedback')
    }
}

function hideFeedbackDialog(event) {
    const dialog = document.getElementById("feedback-dialog")
    dialog.close()

    document.getElementById("feedback-text").value = ""
    const select = document.getElementById("feedback-type")
    select.selectedIndex = 0
}

function disconnectFromSession () {
    if (!sessionContext.sessionId) {
        return
    }

    sessionContext.ws.send(JSON.stringify({
        type: 'DISCONNECT_FROM_SESSION',
        sessionId: sessionContext.sessionId
    }))
}

// event handlers to disconnect player from session when they close the tab
window.addEventListener('beforeunload', disconnectFromSession)
window.addEventListener('unload', disconnectFromSession)
window.addEventListener('pagehide', disconnectFromSession)

async function createPrivateMatch (event) {
    event.preventDefault()

    try {
        const url = _buildApiEndpoint('/api/game-session/create-private-session')
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            },
            body: JSON.stringify({
                config: {
                    maxPlayers: 10,
                    map: "map1",
                    agentType: sessionContext.pageContext?.selectedAgentType,
                    gameMode: 'elimination'
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

async function joinPublicSession () {
    try {
        const url = _buildApiEndpoint('/api/game-session/join-public-session')
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            }
        })

        const { sessionId } = await res.json()

        sessionContext.sessionId = sessionId
        _connectWsToSession(sessionId)
        await loadSessionInfo(sessionId)
        await _loadHtmlContent(pages.gameroom)
    } catch (err) {
        console.error(err)
        alert('Failed to join match')
    }
}

window.joinPublicSession = joinPublicSession

async function startMatch (event) {
    event.preventDefault()
    
    try {
        const url = _buildApiEndpoint(`/api/game-session/start-session?sessionId=${sessionContext.sessionId}`)
        const res = await fetch(url, {
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
        const url = _buildApiEndpoint(`/api/game-session/invite-agent-to-session`)
        const res = await fetch(url, {
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
    const url = _buildApiEndpoint(`/api/game-session/join-private-session`)
    const res = await fetch(url, {
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

    const url = _buildApiEndpoint(`/api/game-session/session-info?sessionId=${sessionId}`)
    const res = await fetch(url, {
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
