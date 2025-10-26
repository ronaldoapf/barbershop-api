import { describe, it, expect, beforeEach } from "vitest"
import { GetBarberUseCase } from "./get-barber.use-case"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { NotFoundError } from "@/errors/app-error"
import { BarberRole } from "@prisma/client"

describe("GetBarberUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: GetBarberUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new GetBarberUseCase(barbersRepository)
  })

  it("should get a barber by id", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,

    })

    const barber = await sut.execute({ id: createdBarber.id })

    expect(barber.id).toBe(createdBarber.id)
    expect(barber.email).toBe("john@barbershop.com")
  })

  it("should not return password in barber profile", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const barber = await sut.execute({ id: createdBarber.id })

    expect(barber).not.toHaveProperty("password")
  })

  it("should throw error when barber not found", async () => {
    await expect(
      sut.execute({ id: "non-existent-id" })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
