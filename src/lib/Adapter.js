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
}
