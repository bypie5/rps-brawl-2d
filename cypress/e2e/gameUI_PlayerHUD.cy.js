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
})
