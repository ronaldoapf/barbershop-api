import { BarberRole } from "@prisma/client"

export interface Barber {
  id: string
  name: string
  email: string
  password: string
  phoneNumber: string | null
  role: BarberRole
  isActive: boolean
  profilePhoto: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BarberProfile {
  id: string
  name: string
  email: string
  phoneNumber: string | null
  role: BarberRole
  isActive: boolean
  profilePhoto: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
}
