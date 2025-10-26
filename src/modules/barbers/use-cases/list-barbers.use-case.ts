import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { BarberProfile } from "../dtos/barber"
import { ListBarbersDTO } from "../dtos/list-barbers-dto"

export class ListBarbersUseCase {
  constructor(private barbersRepository: BarbersRepository) { }

  async execute(params?: ListBarbersDTO): Promise<BarberProfile[]> {
    logger.debug({ params }, "Listing barbers")

    const barbers = await this.barbersRepository.findMany(params)

    // Remove passwords from response
    const barbersProfile = barbers.map(({ password, ...barberProfile }) => barberProfile)

    return barbersProfile
  }
}
