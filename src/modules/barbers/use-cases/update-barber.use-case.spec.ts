import { describe, it, expect, beforeEach } from "vitest"
import { UpdateBarberUseCase } from "./update-barber.use-case"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { ConflictError, NotFoundError } from "@/errors/app-error"
import { BarberRole } from "@prisma/client"

describe("UpdateBarberUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: UpdateBarberUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new UpdateBarberUseCase(barbersRepository)
  })

  it("should update a barber", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const updatedBarber = await sut.execute({
      id: createdBarber.id,
      bio: "Expert barber with 15 years experience",
    })

    expect(updatedBarber.bio).toBe("Expert barber with 15 years experience")
    expect(updatedBarber.name).toBe("John Barber") // Unchanged
  })

  it("should update barber password and hash it", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const updatedBarber = await sut.execute({
      id: createdBarber.id,
      password: "newpassword456",
    })

    expect(updatedBarber.password).not.toBe("newpassword456")
    expect(updatedBarber.password).not.toBe(createdBarber.password)
    expect(updatedBarber.password).toHaveLength(60)
  })

  it("should not update barber to existing email", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)

    const barber1 = await createBarberUseCase.execute({
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

    await expect(
      sut.execute({
        id: barber1.id,
        email: "jane@barbershop.com",
      })
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("should throw error when updating non-existent barber", async () => {
    await expect(
      sut.execute({
        id: "non-existent-id",
        bio: "test",
      })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("should update barber isActive status", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const updatedBarber = await sut.execute({
      id: createdBarber.id,
      isActive: false,
    })

    expect(updatedBarber.isActive).toBe(false)
  })

  it("should update multiple fields at once", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const updatedBarber = await sut.execute({
      id: createdBarber.id,
      name: "John Senior Barber",
      bio: "Senior barber",
      phoneNumber: "+1234567890",
      role: BarberRole.MANAGER,
    })

    expect(updatedBarber.name).toBe("John Senior Barber")
    expect(updatedBarber.bio).toBe("Senior barber")
    expect(updatedBarber.phoneNumber).toBe("+1234567890")
    expect(updatedBarber.role).toBe(BarberRole.MANAGER)
  })
})
