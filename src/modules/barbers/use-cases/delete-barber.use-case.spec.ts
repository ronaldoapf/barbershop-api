import { describe, it, expect, beforeEach } from "vitest"
import { DeleteBarberUseCase } from "./delete-barber.use-case"
import { CreateBarberUseCase } from "./create-barber.use-case"
import { InMemoryBarbersRepository } from "@/test/mocks/in-memory-barbers.repository"
import { NotFoundError } from "@/errors/app-error"
import { BarberRole } from "@prisma/client"

describe("DeleteBarberUseCase", () => {
  let barbersRepository: InMemoryBarbersRepository
  let sut: DeleteBarberUseCase

  beforeEach(() => {
    barbersRepository = new InMemoryBarbersRepository()
    sut = new DeleteBarberUseCase(barbersRepository)
  })

  it("should delete a barber", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const createdBarber = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    await sut.execute({ id: createdBarber.id })

    const barbers = await barbersRepository.findMany()
    expect(barbers).toHaveLength(0)
  })

  it("should throw error when deleting non-existent barber", async () => {
    await expect(
      sut.execute({ id: "non-existent-id" })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it("should remove barber from repository", async () => {
    const createBarberUseCase = new CreateBarberUseCase(barbersRepository)
    const barber1 = await createBarberUseCase.execute({
      name: "John Barber",
      email: "john@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    const barber2 = await createBarberUseCase.execute({
      name: "Jane Stylist",
      email: "jane@barbershop.com",
      password: "password123",
      role: BarberRole.BARBER,
    })

    await sut.execute({ id: barber1.id })

    const remainingBarbers = await barbersRepository.findMany()
    expect(remainingBarbers).toHaveLength(1)
    expect(remainingBarbers[0].id).toBe(barber2.id)
  })
})
