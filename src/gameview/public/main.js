const sessionContext = {
    authToken: null
}

const baseUrl = 'http://localhost:8080/'

async function _loadHtmlContent (pageName) {
    const res = await fetch(baseUrl + pageName)
    const html = await res.text()
    return html
}

function onRouteLoad () {
    checkIsAuthenticated()
}

window.onRouteLoad = onRouteLoad

async function checkIsAuthenticated () {
    if (!sessionContext.authToken) {
        document.body.innerHTML = await _loadHtmlContent('loginPage.html')
    }
}

window.checkIsAuthenticated = checkIsAuthenticated

async function login (e) {
    e.preventDefault()

    const username = document.getElementById('username').value
    const password = document.getElementById('password').value

    try {
        const res = await fetch('http://localhost:8080/api/user/login', {
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
            
            // update dom content to index.html
            document.body.innerHTML = await _loadHtmlContent('index.html')
        } else {
            alert('Login failed - invalid credentials')
        }
    } catch (err) {
        console.error(err)
        alert('Login failed - server error')
    }
}

window.login = login
