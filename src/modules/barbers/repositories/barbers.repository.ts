import { Barber } from "../dtos/barber"
import { CreateBarberDTO } from "../dtos/create-barber-dto"
import { UpdateBarberDTO } from "../dtos/update-barber-dto"

export interface BarbersRepository {
  findById(id: string): Promise<Barber | null>
  findByEmail(email: string): Promise<Barber | null>
  findMany(params?: { isActive?: boolean; skip?: number; take?: number }): Promise<Barber[]>
  create(data: CreateBarberDTO): Promise<Barber>
  update(data: UpdateBarberDTO): Promise<Barber>
  delete(id: string): Promise<void>
}
