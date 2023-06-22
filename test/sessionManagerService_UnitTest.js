const chai = require('chai')
const SessionManager = require('../src/server/services/sessionManager')

describe('Session Manager Service test', () => {
  let sessionManager

  beforeEach(() => {
    sessionManager = new SessionManager()
  })

  it('With no human players, there should only be one session with MAX number of bots', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const sessionId = sessionManager.publicSessionIds.values().next().value
    const session = sessionManager.activeSessions.get(sessionId)


    chai.expect(session.numberOfHumanPlayers()).to.equal(0)
    chai.expect(session.numberOfAgents()).to.equal(sessionManager.maxNumberOfBotsPerSession)
  })

  it('Human players can join a public session', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const sessionId = sessionManager.publicSessionIds.values().next().value
    const session = sessionManager.activeSessions.get(sessionId)

    chai.expect(session.numberOfHumanPlayers()).to.equal(0)

    sessionManager.joinPublicSession('test1')

    chai.expect(session.numberOfHumanPlayers()).to.equal(1)
  })

  it('When max number of players is reached, but session has bots, bots are replaced with human players', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const sessionId = sessionManager.publicSessionIds.values().next().value
    const session = sessionManager.activeSessions.get(sessionId)

    chai.expect(session.numberOfHumanPlayers()).to.equal(0)

    const maxBeforeReplacingBots = session.getMaxPlayers() - session.numberOfAgents()
    for (let i = 0; i < maxBeforeReplacingBots; i++) {
      sessionManager.joinPublicSession('test' + i)
    }

    chai.expect(session.numberOfHumanPlayers()).to.equal(maxBeforeReplacingBots)
    chai.expect(session.numberOfAgents()).to.equal(sessionManager.maxNumberOfBotsPerSession)

    const minNumberOfHumansToStartReplacingBots = maxBeforeReplacingBots + 1
    for (let i = 0; i < minNumberOfHumansToStartReplacingBots - maxBeforeReplacingBots; i++) {
      sessionManager.joinPublicSession('test' + i + maxBeforeReplacingBots)
    }

    // one bot should be replaced with a human player
    chai.expect(session.numberOfHumanPlayers()).to.equal(minNumberOfHumansToStartReplacingBots)
    chai.expect(session.numberOfAgents()).to.equal(sessionManager.maxNumberOfBotsPerSession - 1)
  })
})
