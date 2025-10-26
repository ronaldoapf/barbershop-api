import { PasswordEncrypter } from "@/lib/password-encrypter"
import { ConflictError, NotFoundError } from "@/errors/app-error"
import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { UpdateBarberDTO } from "../dtos/update-barber-dto"
import { Barber } from "../dtos/barber"

export class UpdateBarberUseCase {
  constructor(private barbersRepository: BarbersRepository) { }

  async execute({ id, ...data }: UpdateBarberDTO): Promise<Barber> {
    logger.info({ barberId: id }, "Updating barber")

    const barber = await this.barbersRepository.findById(id)

    if (!barber) {
      logger.warn({ barberId: id }, "Barber update failed: barber not found")
      throw new NotFoundError("Barber not found.")
    }

    // Check if email is being changed and if it already exists
    if (data.email && data.email !== barber.email) {
      const barberWithSameEmail = await this.barbersRepository.findByEmail(data.email)

      if (barberWithSameEmail) {
        logger.warn({ email: data.email }, "Barber update failed: email already exists")
        throw new ConflictError("Email already in use.")
      }
    }

    // Hash password if it's being updated
    let hashedPassword: string | undefined
    if (data.password) {
      const passwordEncrypter = new PasswordEncrypter()
      hashedPassword = await passwordEncrypter.encrypt(data.password)
    }

    const updatedBarber = await this.barbersRepository.update({
      id,
      ...data,
      password: hashedPassword,
    })

    logger.info({ barberId: id }, "Barber updated successfully")

    return updatedBarber
  }
}
