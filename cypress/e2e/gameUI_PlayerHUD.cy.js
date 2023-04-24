const { supportedAgents } = require('../../src/server/agents/agentFactory')

describe('Player HUD', () => {

    it('should display the player HUD', () => {
        // login
        cy.visit('/')
        cy.get('[data-cy=username-input]').type('test')
        cy.get('[data-cy=password-input]').type('password')
        cy.get('[data-cy=login-button]').click()

        cy.get('[data-cy=create-match-button]').click()

        cy.get('[data-cy=start-match-button]').click()

        cy.get('[data-cy=player-hud-overlay]', {timeout: 3500})
    })

    it('Displays tie breaker ui when player is in tie breaker', () => {
        cy.visit('/')
        cy.get('[data-cy=username-input]').type('test')
        cy.get('[data-cy=password-input]').type('password')
        cy.get('[data-cy=login-button]').click()

        cy.get('[data-cy=bot-select-type]').select(supportedAgents.naiveMatchTarget)

        cy.get('[data-cy=create-match-button]').click()

        cy.intercept('POST', '/api/game-session/invite-agent-to-session').as('inviteBot')

        cy.get('[data-cy=add-bot-button]').click()

        let playersConnected = []
        let playerAuthorization = null
        let playerSessionId = null
        cy.wait('@inviteBot').then((interception) => {
            const { authorization } = interception.request.headers
            playerAuthorization = authorization

            const { sessionId, botId } = interception.response.body
            playerSessionId = sessionId

            playersConnected.push(botId)
        })

        cy.get('[data-cy=add-bot-button]').click()

        cy.wait('@inviteBot').then((interception) => {
            const { sessionId, botId } = interception.response.body

            playersConnected.push(botId)

            const leftFlank = playersConnected[0]
            const rightFlank = playersConnected[1]

            cy.request({
                method: 'POST',
                url: '/api/game-session/modify-session-config',
                headers: {
                    Authorization: playerAuthorization,
                },
                body: {
                    sessionId: playerSessionId,
                    attributeKey: 'initialSpawnLocations',
                    attributeValue: [{
                        playerId: leftFlank,
                        xPos: 5,
                        yPos: -10,
                    },
                    {
                        playerId: rightFlank,
                        xPos: 10,
                        yPos: -10,
                    },
                    {
                        playerId: 'test',
                        xPos: 15,
                        yPos: -10,
                    }]
                }
            })
        })

        cy.get('[data-cy=start-match-button]').click()

        cy.get('[data-cy="tie-breaker-view"]', {timeout: 3500})
    })
})
