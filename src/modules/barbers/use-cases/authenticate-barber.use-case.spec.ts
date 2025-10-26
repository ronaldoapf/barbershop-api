import { describe, it, expect, beforeEach } from "vitest"
import { AuthenticateBarberUseCase } from "./authenticate-barber.use-case"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { UnauthorizedError } from "@/errors/app-error"
import { BarberRole } from "@prisma/client"

describe("AuthenticateBarberUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: AuthenticateBarberUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new AuthenticateBarberUseCase(barbersRepository)
  })

  it("should authenticate a barber with valid credentials", async () => {
    // Create a barber first
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    // Authenticate
    const barber = await sut.execute({
      email: "john@barbershop.com",
      password: "password123",
    })

    expect(barber).toBeDefined()
    expect(barber.email).toBe("john@barbershop.com")
    expect(barber.name).toBe("John Barber")
  })

  it("should not authenticate with wrong password", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    await expect(
      sut.execute({
        email: "john@barbershop.com",
        password: "wrongpassword",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it("should not authenticate with non-existent email", async () => {
    await expect(
      sut.execute({
        email: "nonexistent@barbershop.com",
        password: "password123",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it("should not authenticate inactive barber", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const barber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    // Deactivate barber
    await barbersRepository.update({ id: barber.id, isActive: false })

    await expect(
      sut.execute({
        email: "john@barbershop.com",
        password: "password123",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it("should return barber with hashed password", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const barber = await sut.execute({
      email: "john@barbershop.com",
      password: "password123",
    })

    expect(barber.password).not.toBe("password123")
    expect(barber.password).toHaveLength(60)
  })
})
