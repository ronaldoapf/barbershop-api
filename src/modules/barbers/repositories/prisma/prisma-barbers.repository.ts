import { prisma } from "@/config/prisma"
import { Barber } from "../../dtos/barber"
import { CreateBarberDTO } from "../../dtos/create-barber-dto"
import { UpdateBarberDTO } from "../../dtos/update-barber-dto"
import { BarbersRepository } from "../barbers.repository"

export class PrismaBarbersRepository implements BarbersRepository {
  async findById(id: string): Promise<Barber | null> {
    const barber = await prisma.barber.findUnique({
      where: { id },
    })

    return barber
  }

  async findByEmail(email: string): Promise<Barber | null> {
    const barber = await prisma.barber.findUnique({
      where: { email },
    })

    return barber
  }

  async findMany(params?: {
    isActive?: boolean
    skip?: number
    take?: number
  }): Promise<Barber[]> {
    const barbers = await prisma.barber.findMany({
      where: params?.isActive !== undefined ? { isActive: params.isActive } : undefined,
      skip: params?.skip,
      take: params?.take,
      orderBy: {
        createdAt: "desc",
      },
    })

    return barbers
  }

  async create(data: CreateBarberDTO): Promise<Barber> {
    const barber = await prisma.barber.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        role: data.role,
        bio: data.bio,
        profilePhoto: data.profilePhoto,
      },
    })

    return barber
  }

  async update(data: UpdateBarberDTO): Promise<Barber> {
    const barber = await prisma.barber.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        role: data.role,
        isActive: data.isActive,
        bio: data.bio,
        profilePhoto: data.profilePhoto,
      },
    })

    return barber
  }

  async delete(id: string): Promise<void> {
    await prisma.barber.delete({
      where: { id },
    })
  }
}
