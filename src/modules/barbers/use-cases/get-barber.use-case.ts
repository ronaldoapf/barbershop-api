import { NotFoundError } from "@/errors/app-error"
import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { BarberProfile } from "../dtos/barber"
import { GetBarberDTO } from "../dtos/get-barber-dto"

export class GetBarberUseCase {
  constructor(private barbersRepository: BarbersRepository) { }

  async execute({ id }: GetBarberDTO): Promise<BarberProfile> {
    logger.debug({ barberId: id }, "Fetching barber")

    const barber = await this.barbersRepository.findById(id)

    if (!barber) {
      logger.warn({ barberId: id }, "Barber not found")
      throw new NotFoundError("Barber not found.")
    }

    const { password, ...barberProfile } = barber

    return barberProfile
  }
}
