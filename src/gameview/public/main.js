const sessionContext = {
    authToken: null,
    username: null,
    sessionId: null,
    sessionJoinCode: null,
}

const baseUrl = 'http://localhost:8080/'

const pages = {
    login: 'loginPage.html',
    findMatch: 'findMatch.html',
    gameroomLobby: 'gameroomLobby.html',
}

function _compileTemplates (doc, pageName) {
    function findAndReplaceTemplates (doc, templates) {
        for (const id in templates) {
            const content = doc.getElementById(id).innerHTML
            const result = new RegExp(/{{.*}}/).exec(content)
            if (result) {
                for (const match of result) {
                    const tag = match
                    const replacement = templates[id](tag)
                    doc.getElementById(id).innerHTML = content.replace(tag, replacement)
                }
            }
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
            break
        default:
            throw new Error(`Invalid page name: ${pageName}`)
    }

    return doc
}

async function _loadHtmlContent (pageName) {
    const res = await fetch(baseUrl + pageName)
    const html = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    _replacePage(_compileTemplates(doc, pageName, html))
}

function _replaceHead (html) {
    document.head.innerHTML = html
}

function _replaceBody (newBody) {
    document.body.innerHTML = newBody.innerHTML
}

function _replacePage (doc) {
    const body = doc.body
    const head = doc.head

    _replaceHead(head.innerHTML)
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
        const res = await fetch(`${baseUrl}api/user/login`, {
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
        const res = await fetch(`${baseUrl}api/game-session/create-private-session`, {
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
        sessionContext.sessionJoinCode = friendlyName

        await _loadHtmlContent(pages.gameroomLobby)
    } catch (err) {
        console.error(err)
        alert('Failed to create match')
    }
}

async function joinPrivateMatch (event) {
    event.preventDefault()

    const matchId = document.getElementById('private-match-id-input').value
    try {
        const res = await fetch(`${baseUrl}join-private-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionContext.authToken}`,
            },
            body: JSON.stringify({
                friendlyName: matchId
            })
        })

        if (res.status !== 200) {
            alert(`Failed to join match - ${res.statusText}`)
            return
        }

        const { sessionId } = await res.json()
        sessionContext.sessionId = sessionId

        await _loadHtmlContent(pages.gameroomLobby)
    } catch (err) {
        console.error(err)
        alert('Failed to join match')
    }
}

window.joinPrivateMatch = joinPrivateMatch
