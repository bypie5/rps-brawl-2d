const chai = require('chai')
const SessionManager = require('../src/server/services/sessionManager')

describe('Session Manager Service test', () => {
  let sessionManager

  beforeEach(() => {
    sessionManager = new SessionManager(null)

    sessionManager.createPublicSession()
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

  it('When max + 1 number of human players join a public session, a new public session is created', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const sessionId = sessionManager.publicSessionIds.values().next().value
    const session = sessionManager.activeSessions.get(sessionId)

    for (let i = 0; i < sessionManager.maxPlayersPerPublicSession; i++) {
      sessionManager.joinPublicSession('test' + i)
    }

    // check that the number of bots is zero and the number of human players is max
    chai.expect(session.numberOfHumanPlayers()).to.equal(sessionManager.maxPlayersPerPublicSession)
    chai.expect(session.numberOfAgents()).to.equal(0)

    // join one more player
    sessionManager.joinPublicSession('test' + sessionManager.maxPlayersPerPublicSession)

    // check that a new session was created
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(2)
  })

  it('When all human players leave a public session, the session is deleted', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const sessionId = sessionManager.publicSessionIds.values().next().value
    const session = sessionManager.activeSessions.get(sessionId)

    for (let i = 0; i < sessionManager.maxPlayersPerPublicSession; i++) {
      sessionManager.joinPublicSession('test' + i)
    }

    // check that the number of bots is zero and the number of human players is max
    chai.expect(session.numberOfHumanPlayers()).to.equal(sessionManager.maxPlayersPerPublicSession)
    chai.expect(session.numberOfAgents()).to.equal(0)

    // join one more player
    sessionManager.joinPublicSession('test' + sessionManager.maxPlayersPerPublicSession)

    // check that a new session was created
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(2)

    // make all but one player leave first session
    for (let i = 0; i < sessionManager.maxPlayersPerPublicSession - 1; i++) {
      sessionManager.disconnectPlayerFromSession('test' + i, sessionId)
    }

    // number of human players should be 1 and number of bots should be max
    chai.expect(session.numberOfHumanPlayers()).to.equal(1)
    chai.expect(session.numberOfAgents()).to.equal(sessionManager.maxNumberOfBotsPerSession)

    // make last player leave
    sessionManager.disconnectPlayerFromSession('test' + (sessionManager.maxPlayersPerPublicSession - 1), sessionId)

    // check that the session was deleted
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)
  })

  it('When max number of sessions is reached, a new session is not created', () => {
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    for (let j = 0; j < sessionManager.maxNumberOfPublicSessions - 1; j++) {
      for (let i = 0; i < sessionManager.maxPlayersPerPublicSession; i++) {
        sessionManager.joinPublicSession('test' + i)
      }
    }

    // check that the number of sessions is max
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(sessionManager.maxNumberOfPublicSessions)

    // join one more player, bug throws an error
    chai.expect(() => sessionManager.joinPublicSession('test' + sessionManager.maxNumberOfPublicSessions * sessionManager.maxPlayersPerPublicSession)).to.throw()

    // check that the number of sessions is still max
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(sessionManager.maxNumberOfPublicSessions)
  })

  it('When public session is stopped, connected players and bots are disconnected', () => {
    const sessionId = sessionManager.publicSessionIds.values().next().value

    // copy maps to use as reference to check if players and bots were disconnected
    const players = new Map(sessionManager.playerToSession)
    const bots = new Map(sessionManager.agentsToSession)

    // number of public sessions should be 1
    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    sessionManager.stopPublicSession(sessionId)

    // check that all players and bots were disconnected
    players.forEach((session, player) => {
      chai.expect(sessionManager.playerToSession.get(player)).to.be.undefined
    })

    bots.forEach((session, bot) => {
      chai.expect(sessionManager.agentsToSession.get(bot)).to.be.undefined
    })

    chai.expect(sessionManager.getNumberOfPublicSessions()).to.equal(1)

    const newSessionId = sessionManager.publicSessionIds.values().next().value

    // check that a new session was created
    chai.expect(newSessionId).to.not.equal(sessionId)
  })
})
