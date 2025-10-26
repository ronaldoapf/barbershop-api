import { randomUUID } from "crypto"
import { BarberRole } from "@prisma/client"
import { Barber } from "@/modules/barbers/dtos/barber"
import { CreateBarberDTO } from "@/modules/barbers/dtos/create-barber-dto"
import { UpdateBarberDTO } from "@/modules/barbers/dtos/update-barber-dto"
import { BarbersRepository } from "@/modules/barbers/repositories/barbers.repository"

export class InMemoryBarbersRepository implements BarbersRepository {
  public barbers: Barber[] = []

  async findById(id: string): Promise<Barber | null> {
    const barber = this.barbers.find((barber) => barber.id === id)
    return barber || null
  }

  async findByEmail(email: string): Promise<Barber | null> {
    const barber = this.barbers.find((barber) => barber.email === email)
    return barber || null
  }

  async findMany(params?: {
    isActive?: boolean
    skip?: number
    take?: number
  }): Promise<Barber[]> {
    let filtered = [...this.barbers]

    if (params?.isActive !== undefined) {
      filtered = filtered.filter((barber) => barber.isActive === params.isActive)
    }

    if (params?.skip) {
      filtered = filtered.slice(params.skip)
    }

    if (params?.take) {
      filtered = filtered.slice(0, params.take)
    }

    return filtered
  }

  async create(data: CreateBarberDTO): Promise<Barber> {
    const barber: Barber = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      password: data.password,
      phoneNumber: data.phoneNumber || null,
      role: data.role || BarberRole.BARBER,
      isActive: true,
      profilePhoto: data.profilePhoto || null,
      bio: data.bio || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.barbers.push(barber)
    return barber
  }

  async update(data: UpdateBarberDTO): Promise<Barber> {
    const barberIndex = this.barbers.findIndex((barber) => barber.id === data.id)

    if (barberIndex === -1) {
      throw new Error("Barber not found")
    }

    const updatedBarber: Barber = {
      ...this.barbers[barberIndex],
      ...data,
      updatedAt: new Date(),
    }

    this.barbers[barberIndex] = updatedBarber
    return updatedBarber
  }

  async delete(id: string): Promise<void> {
    const barberIndex = this.barbers.findIndex((barber) => barber.id === id)

    if (barberIndex === -1) {
      throw new Error("Barber not found")
    }

    this.barbers.splice(barberIndex, 1)
  }
}
