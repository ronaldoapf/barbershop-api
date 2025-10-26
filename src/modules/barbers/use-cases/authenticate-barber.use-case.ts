import { PasswordEncrypter } from "@/lib/password-encrypter"
import { UnauthorizedError } from "@/errors/app-error"
import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { AuthenticateBarberDTO } from "../dtos/authenticate-barber-dto"
import { Barber } from "../dtos/barber"

export class AuthenticateBarberUseCase {
  constructor(private barbersRepository: BarbersRepository) {}

  async execute({ email, password }: AuthenticateBarberDTO): Promise<Barber> {
    logger.info({ email }, "Barber authentication attempt")

    const barber = await this.barbersRepository.findByEmail(email)

    if (!barber) {
      logger.warn({ email }, "Barber authentication failed: barber not found")
      throw new UnauthorizedError("Invalid credentials.")
    }

    if (!barber.isActive) {
      logger.warn({ email, barberId: barber.id }, "Barber authentication failed: barber is inactive")
      throw new UnauthorizedError("Barber account is inactive.")
    }

    const passwordEncrypter = new PasswordEncrypter()
    const doesPasswordMatch = await passwordEncrypter.compare(password, barber.password)

    if (!doesPasswordMatch) {
      logger.warn({ email, barberId: barber.id }, "Barber authentication failed: invalid password")
      throw new UnauthorizedError("Invalid credentials.")
    }

    logger.info({ email, barberId: barber.id }, "Barber authentication successful")

    return barber
  }
}
