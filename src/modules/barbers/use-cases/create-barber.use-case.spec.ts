import { describe, it, expect, beforeEach } from "vitest"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { ConflictError } from "@/errors/app-error"
import { BarberRole } from "@prisma/client"

describe("CreateBarberUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: CreateBarberUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new CreateBarberUseCase(barbersRepository)
  })

  it("should create a new barber", async () => {
    const barber = await sut.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      phoneNumber: "+1234567890",
      bio: "Professional barber",
      role: BarberRole.BARBER,
    })

    expect(barber.id).toEqual(expect.any(String))
    expect(barber.email).toBe("john@barbershop.com")
    expect(barber.name).toBe("John Barber")
    expect(barber.isActive).toBe(true)
  })

  it("should hash the barber password upon creation", async () => {
    const barber = await sut.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    expect(barber.password).not.toBe("password123")
    expect(barber.password).toHaveLength(60) // bcrypt hash length
  })

  it("should not create barber with duplicate email", async () => {
    await sut.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    await expect(
      sut.execute({
        name: "Jane Barber",
        email: "john@barbershop.com",
        password: "password456",
        role: BarberRole.BARBER,
      })
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("should create barber with ADMIN role", async () => {
    const barber = await sut.execute({
      name: "Admin Barber",
      email: "admin@barbershop.com",
      password: "password123",
      role: BarberRole.ADMIN,
    })

    expect(barber.role).toBe(BarberRole.ADMIN)
  })

  it("should create barber with optional fields", async () => {
    const barber = await sut.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      phoneNumber: "+1234567890",
      bio: "Expert barber",
      profilePhoto: "https://example.com/photo.jpg",
      role: BarberRole.BARBER,
    })

    expect(barber.phoneNumber).toBe("+1234567890")
    expect(barber.bio).toBe("Expert barber")
    expect(barber.profilePhoto).toBe("https://example.com/photo.jpg")
  })
})
