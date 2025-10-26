import { PasswordEncrypter } from "@/lib/password-encrypter"
import { ConflictError } from "@/errors/app-error"
import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { CreateBarberDTO } from "../dtos/create-barber-dto"
import { Barber } from "../dtos/barber"

export class CreateBarberUseCase {
  constructor(private barbersRepository: BarbersRepository) { }

  async execute(data: CreateBarberDTO): Promise<Barber> {
    logger.info({ email: data.email }, "Creating new barber")

    const barberWithSameEmail = await this.barbersRepository.findByEmail(data.email)

    if (barberWithSameEmail) {
      logger.warn({ email: data.email }, "Barber creation failed: email already exists")
      throw new ConflictError("Barber with same email already exists.")
    }

    const passwordEncrypter = new PasswordEncrypter()
    const hashedPassword = await passwordEncrypter.encrypt(data.password)

    const barber = await this.barbersRepository.create({
      ...data,
      password: hashedPassword,
    })

    logger.info({ barberId: barber.id, email: barber.email }, "Barber created successfully")

    return barber
  }
}
