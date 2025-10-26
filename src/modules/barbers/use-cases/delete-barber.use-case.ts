import { NotFoundError } from "@/errors/app-error"
import { logger } from "@/lib/logger"
import { BarbersRepository } from "../repositories/barbers.repository"
import { DeleteBarberDTO } from "../dtos/delete-barber-dto"

export class DeleteBarberUseCase {
  constructor(private barbersRepository: BarbersRepository) { }

  async execute({ id }: DeleteBarberDTO): Promise<void> {
    logger.info({ barberId: id }, "Deleting barber")

    const barber = await this.barbersRepository.findById(id)

    if (!barber) {
      logger.warn({ barberId: id }, "Barber deletion failed: barber not found")
      throw new NotFoundError("Barber not found.")
    }

    await this.barbersRepository.delete(id)

    logger.info({ barberId: id }, "Barber deleted successfully")
  }
}
