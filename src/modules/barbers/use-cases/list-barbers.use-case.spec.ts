import { describe, it, expect, beforeEach } from "vitest"
import { ListBarbersUseCase } from "./list-barbers.use-case"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { BarberRole } from "@prisma/client"

describe("ListBarbersUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: ListBarbersUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new ListBarbersUseCase(barbersRepository)
  })

  it("should list all barbers", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)

    await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    await createBarberUseCase.execute({
      name: "Jane Stylist",
      email: "jane@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const barbers = await sut.execute()

    expect(barbers).toHaveLength(2)
  })

  it("should not return passwords in barber profiles", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)

    await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const barbers = await sut.execute()

    expect(barbers[0]).not.toHaveProperty("password")
  })

  it("should filter by isActive", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)

    const activeBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const inactiveBarber = await createBarberUseCase.execute({
      name: "Jane Stylist",
      email: "jane@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    // Deactivate second barber
    await barbersRepository.update({ id: inactiveBarber.id, isActive: false })

    const activeBarbers = await sut.execute({ isActive: true })

    expect(activeBarbers).toHaveLength(1)
    expect(activeBarbers[0].id).toBe(activeBarber.id)
  })

  it("should support pagination with skip and take", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)

    for (let i = 1; i <= 5; i++) {
      await createBarberUseCase.execute({
        name: `Barber ${i}`,
        email: `barber${i}@barbershop.com`,
        password: "password123",
        role: BarberRole.BARBER,
      })
    }

    const page1 = await sut.execute({ skip: 0, take: 2 })
    const page2 = await sut.execute({ skip: 2, take: 2 })

    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(2)
    expect(page1[0].id).not.toBe(page2[0].id)
  })

  it("should return empty array when no barbers exist", async () => {
    const barbers = await sut.execute()

    expect(barbers).toHaveLength(0)
  })
})
