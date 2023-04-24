describe('Player HUD', () => {

    it('should display the player HUD', () => {
        // login
        cy.visit('/')
        cy.get('[data-cy=username-input]').type('test')
        cy.get('[data-cy=password-input]').type('password')
        cy.get('[data-cy=login-button]').click()

        cy.intercept('POST', '/api/game-session/create-private-session').as('createPrivateSession')
        cy.get('[data-cy=create-match-button]').click()

        cy.wait('@createPrivateSession').then((interception) => {
            const { authorization } = interception.request.headers

            const { sessionId } = interception.response.body

            cy.request({
                method: 'POST',
                url: '/api/game-session/modify-session-config',
                headers: {
                    authorization
                },
                body: {
                    sessionId,
                    attributeKey: 'initialSpawnLocations',
                    attributeValue: [{
                        playerId: 'test',
                        xPos: 0,
                        yPos: 0,
                    }]
                }
            })
        })

        cy.get('[data-cy=start-match-button]').click()

        cy.get('[data-cy=player-hud-overlay]', {timeout: 3500})
    })
})
