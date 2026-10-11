export class Adapter {
  constructor(robot, name) {
    this.robot = robot
    this.name = name
  }

  async send(_envelope, _message) {
    throw new Error(`${this.constructor.name} must implement send(envelope, message)`)
  }

  async reply(_envelope, _message) {
    throw new Error(`${this.constructor.name} must implement reply(envelope, message)`)
  }

  async start() {
    throw new Error(`${this.constructor.name} must implement start()`)
  }

  /**
   * Edit a previously sent message in-place.
   * message may be a plain { text } object or a card response from createCardResponse().
   * Adapters that support editing should override this; others leave it as a no-op.
   */
  async edit(_channelId, _msgId, _message) {}
}
